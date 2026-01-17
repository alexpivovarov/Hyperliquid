import { Router, type Request, type Response, type NextFunction } from 'express';
import { depositService } from '../services/index.js';
import blockchainService from '../services/blockchain.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
    CreateDepositRequestSchema,
    UpdateDepositStatusSchema,
    VerifyTransactionRequestSchema,
} from '../types/index.js';
import type { ApiResponse, PaginatedResponse, Deposit } from '../types/index.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Create a new deposit record
 * POST /api/deposits
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = CreateDepositRequestSchema.parse(req.body);
        const deposit = await depositService.create(data);

        const response: ApiResponse<Deposit> = {
            success: true,
            data: deposit,
            meta: {
                timestamp: new Date().toISOString(),
            },
        };

        res.status(201).json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * Get deposit by ID
 * GET /api/deposits/:id
 */
router.get('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const deposit = await depositService.getById(id);

        if (!deposit) {
            throw ApiError.notFound('Deposit not found');
        }

        const response: ApiResponse<Deposit> = {
            success: true,
            data: deposit,
            meta: {
                timestamp: new Date().toISOString(),
            },
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * Get deposits by user address
 * GET /api/deposits/user/:address
 */
router.get('/user/:address', async (req: Request<{ address: string }>, res: Response, next: NextFunction) => {
    try {
        const { address } = req.params;
        const page = parseInt(String(req.query.page || '1'));
        const limit = Math.min(parseInt(String(req.query.limit || '10')), 100);

        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            throw ApiError.badRequest('Invalid Ethereum address');
        }

        const { deposits, total } = await depositService.getByUser(address, page, limit);

        const response: PaginatedResponse<Deposit> = {
            success: true,
            data: deposits,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            meta: {
                timestamp: new Date().toISOString(),
            },
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * Update deposit status (webhook from frontend or internal)
 * PATCH /api/deposits/:id/status
 */
router.patch('/:id/status', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const update = UpdateDepositStatusSchema.parse(req.body);

        const deposit = await depositService.updateStatus(id, update);

        if (!deposit) {
            throw ApiError.notFound('Deposit not found');
        }

        const response: ApiResponse<Deposit> = {
            success: true,
            data: deposit,
            meta: {
                timestamp: new Date().toISOString(),
            },
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * Verify a transaction on-chain
 * POST /api/deposits/verify
 */
router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { txHash, expectedAmount, expectedRecipient } = VerifyTransactionRequestSchema.parse(req.body);

        const result = await blockchainService.verifyTransaction(
            txHash as `0x${string}`,
            expectedAmount ? BigInt(expectedAmount) : undefined,
            expectedRecipient as `0x${string}` | undefined
        );

        const response: ApiResponse<typeof result> = {
            success: true,
            data: result,
            meta: {
                timestamp: new Date().toISOString(),
            },
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * Get deposit statistics
 * GET /api/deposits/stats
 */
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await depositService.getStats();

        const response: ApiResponse<typeof stats> = {
            success: true,
            data: stats,
            meta: {
                timestamp: new Date().toISOString(),
            },
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * Bridge success webhook (called after frontend completes bridge)
 * POST /api/deposits/bridge-success
 */
router.post('/bridge-success', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { depositId, bridgeTxHash, amount } = req.body;

        if (!depositId || !bridgeTxHash) {
            throw ApiError.badRequest('Missing depositId or bridgeTxHash');
        }

        // Verify the transaction on-chain
        const verification = await blockchainService.verifyTransaction(
            bridgeTxHash as `0x${string}`,
            amount ? BigInt(amount) : undefined
        );

        if (!verification.verified) {
            logger.warn({ depositId, bridgeTxHash, error: verification.error }, 'Bridge verification failed');
            throw ApiError.badRequest('Transaction verification failed', 'VERIFICATION_FAILED', {
                reason: verification.error,
            });
        }

        // Update deposit status
        const deposit = await depositService.updateStatus(depositId, {
            txHash: bridgeTxHash,
            status: 'DEPOSITING',
        });

        if (!deposit) {
            throw ApiError.notFound('Deposit not found');
        }

        const response: ApiResponse<Deposit> = {
            success: true,
            data: deposit,
            meta: {
                timestamp: new Date().toISOString(),
            },
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * L1 deposit success webhook (called after L1 deposit completes)
 * POST /api/deposits/l1-success
 */
router.post('/l1-success', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { depositId, depositTxHash, amount } = req.body;

        if (!depositId || !depositTxHash) {
            throw ApiError.badRequest('Missing depositId or depositTxHash');
        }

        // Verify the L1 deposit transaction
        const verification = await blockchainService.verifyTransaction(
            depositTxHash as `0x${string}`,
            amount ? BigInt(amount) : undefined
        );

        if (!verification.verified) {
            logger.warn({ depositId, depositTxHash, error: verification.error }, 'L1 deposit verification failed');
            // Don't fail completely - the transaction might still be valid
        }

        // Update deposit status to completed
        const deposit = await depositService.updateStatus(depositId, {
            txHash: depositTxHash,
            status: 'COMPLETED',
        });

        if (!deposit) {
            throw ApiError.notFound('Deposit not found');
        }

        logger.info({ depositId, depositTxHash }, 'Deposit completed successfully');

        const response: ApiResponse<Deposit> = {
            success: true,
            data: deposit,
            meta: {
                timestamp: new Date().toISOString(),
            },
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

export default router;

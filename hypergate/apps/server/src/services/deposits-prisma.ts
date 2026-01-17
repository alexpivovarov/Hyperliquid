import prisma from '../lib/prisma.js';
import logger from '../utils/logger.js';
import type { Deposit, CreateDepositRequest, UpdateDepositStatus } from '../types/index.js';
import type { DepositStatus } from '../generated/prisma/index.js';

/**
 * Prisma-based deposit service for production use
 * Uses PostgreSQL for persistent storage
 */
export class PrismaDepositService {
    /**
     * Create a new deposit record
     */
    async create(data: CreateDepositRequest): Promise<Deposit> {
        const deposit = await prisma.deposit.create({
            data: {
                userAddress: data.userAddress.toLowerCase(),
                sourceChain: data.sourceChain,
                sourceToken: data.sourceToken,
                sourceAmount: data.sourceAmount,
                destinationAmount: data.expectedDestinationAmount,
                status: 'PENDING',
            },
        });

        logger.info({ depositId: deposit.id, userAddress: deposit.userAddress }, 'Deposit created');

        return this.mapToDeposit(deposit);
    }

    /**
     * Get deposit by ID
     */
    async getById(id: string): Promise<Deposit | null> {
        const deposit = await prisma.deposit.findUnique({
            where: { id },
        });

        return deposit ? this.mapToDeposit(deposit) : null;
    }

    /**
     * Get deposit by transaction hash
     */
    async getByTxHash(txHash: string): Promise<Deposit | null> {
        const normalizedHash = txHash.toLowerCase();

        const deposit = await prisma.deposit.findFirst({
            where: {
                OR: [
                    { bridgeTxHash: normalizedHash },
                    { depositTxHash: normalizedHash },
                ],
            },
        });

        return deposit ? this.mapToDeposit(deposit) : null;
    }

    /**
     * Get all deposits for a user
     */
    async getByUser(userAddress: string, page = 1, limit = 10): Promise<{
        deposits: Deposit[];
        total: number;
    }> {
        const normalizedAddress = userAddress.toLowerCase();
        const skip = (page - 1) * limit;

        const [deposits, total] = await Promise.all([
            prisma.deposit.findMany({
                where: { userAddress: normalizedAddress },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.deposit.count({
                where: { userAddress: normalizedAddress },
            }),
        ]);

        return {
            deposits: deposits.map(d => this.mapToDeposit(d)),
            total,
        };
    }

    /**
     * Update deposit status
     */
    async updateStatus(id: string, update: UpdateDepositStatus): Promise<Deposit | null> {
        const existing = await prisma.deposit.findUnique({
            where: { id },
        });

        if (!existing) return null;

        const updateData: {
            status: DepositStatus;
            errorMessage?: string;
            bridgeTxHash?: string;
            depositTxHash?: string;
            completedAt?: Date;
        } = {
            status: update.status as DepositStatus,
            errorMessage: update.errorMessage,
        };

        // Set transaction hash based on status
        if (update.txHash) {
            if (update.status === 'BRIDGING') {
                updateData.bridgeTxHash = update.txHash;
            } else if (update.status === 'DEPOSITING' || update.status === 'COMPLETED') {
                updateData.depositTxHash = update.txHash;
            }
        }

        // Set completedAt if status is COMPLETED
        if (update.status === 'COMPLETED') {
            updateData.completedAt = new Date();
        }

        const deposit = await prisma.deposit.update({
            where: { id },
            data: updateData,
        });

        logger.info({ depositId: id, status: update.status }, 'Deposit status updated');

        return this.mapToDeposit(deposit);
    }

    /**
     * Get recent deposits (for admin/monitoring)
     */
    async getRecent(limit = 50): Promise<Deposit[]> {
        const deposits = await prisma.deposit.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return deposits.map(d => this.mapToDeposit(d));
    }

    /**
     * Get deposit statistics
     */
    async getStats(): Promise<{
        total: number;
        byStatus: Record<string, number>;
        totalVolume: string;
    }> {
        const [total, pending, bridging, depositing, completed, failed, volumeResult] = await Promise.all([
            prisma.deposit.count(),
            prisma.deposit.count({ where: { status: 'PENDING' } }),
            prisma.deposit.count({ where: { status: 'BRIDGING' } }),
            prisma.deposit.count({ where: { status: 'DEPOSITING' } }),
            prisma.deposit.count({ where: { status: 'COMPLETED' } }),
            prisma.deposit.count({ where: { status: 'FAILED' } }),
            prisma.deposit.findMany({
                where: { status: 'COMPLETED' },
                select: { destinationAmount: true },
            }),
        ]);

        // Calculate total volume
        let totalVolume = 0n;
        for (const deposit of volumeResult) {
            try {
                totalVolume += BigInt(deposit.destinationAmount);
            } catch {
                // Invalid amount, skip
            }
        }

        return {
            total,
            byStatus: {
                PENDING: pending,
                BRIDGING: bridging,
                DEPOSITING: depositing,
                COMPLETED: completed,
                FAILED: failed,
            },
            totalVolume: totalVolume.toString(),
        };
    }

    /**
     * Clear all deposits (for testing only)
     */
    async clearAll(): Promise<void> {
        await prisma.deposit.deleteMany();
    }

    /**
     * Mark stale pending deposits as failed
     * Should be run periodically
     */
    async cleanupStaleDeposits(maxAgeMinutes = 30): Promise<number> {
        const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

        const result = await prisma.deposit.updateMany({
            where: {
                status: { in: ['PENDING', 'BRIDGING'] },
                createdAt: { lt: cutoff },
            },
            data: {
                status: 'FAILED',
                errorMessage: 'Deposit timed out',
            },
        });

        if (result.count > 0) {
            logger.info({ cleaned: result.count }, 'Cleaned up stale deposits');
        }

        return result.count;
    }

    /**
     * Map Prisma deposit to API Deposit type
     */
    private mapToDeposit(deposit: {
        id: string;
        userAddress: string;
        sourceChain: string;
        sourceToken: string;
        sourceAmount: string;
        destinationAmount: string;
        bridgeTxHash: string | null;
        depositTxHash: string | null;
        status: DepositStatus;
        errorMessage: string | null;
        createdAt: Date;
        updatedAt: Date;
        completedAt: Date | null;
    }): Deposit {
        return {
            id: deposit.id,
            userAddress: deposit.userAddress,
            sourceChain: deposit.sourceChain,
            sourceToken: deposit.sourceToken,
            sourceAmount: deposit.sourceAmount,
            destinationAmount: deposit.destinationAmount,
            bridgeTxHash: deposit.bridgeTxHash || undefined,
            depositTxHash: deposit.depositTxHash || undefined,
            status: deposit.status,
            errorMessage: deposit.errorMessage || undefined,
            createdAt: deposit.createdAt,
            updatedAt: deposit.updatedAt,
            completedAt: deposit.completedAt || undefined,
        };
    }
}

export const prismaDepositService = new PrismaDepositService();
export default prismaDepositService;

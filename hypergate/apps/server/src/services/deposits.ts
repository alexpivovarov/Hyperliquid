import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';
import type { Deposit, CreateDepositRequest, UpdateDepositStatus } from '../types/index.js';

/**
 * In-memory deposit storage
 * TODO: Replace with Prisma/PostgreSQL for production
 */
const deposits = new Map<string, Deposit>();
const depositsByUser = new Map<string, Set<string>>();
const depositsByTxHash = new Map<string, string>();

/**
 * Deposit service for managing deposit records
 */
export class DepositService {
    /**
     * Create a new deposit record
     */
    async create(data: CreateDepositRequest): Promise<Deposit> {
        const deposit: Deposit = {
            id: randomUUID(),
            userAddress: data.userAddress.toLowerCase(),
            sourceChain: data.sourceChain,
            sourceToken: data.sourceToken,
            sourceAmount: data.sourceAmount,
            destinationAmount: data.expectedDestinationAmount,
            status: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        deposits.set(deposit.id, deposit);

        // Index by user
        const userDeposits = depositsByUser.get(deposit.userAddress) || new Set();
        userDeposits.add(deposit.id);
        depositsByUser.set(deposit.userAddress, userDeposits);

        logger.info({ depositId: deposit.id, userAddress: deposit.userAddress }, 'Deposit created');
        return deposit;
    }

    /**
     * Get deposit by ID
     */
    async getById(id: string): Promise<Deposit | null> {
        return deposits.get(id) || null;
    }

    /**
     * Get deposit by transaction hash
     */
    async getByTxHash(txHash: string): Promise<Deposit | null> {
        const depositId = depositsByTxHash.get(txHash.toLowerCase());
        if (!depositId) return null;
        return deposits.get(depositId) || null;
    }

    /**
     * Get all deposits for a user
     */
    async getByUser(userAddress: string, page = 1, limit = 10): Promise<{
        deposits: Deposit[];
        total: number;
    }> {
        const userDepositIds = depositsByUser.get(userAddress.toLowerCase());
        if (!userDepositIds) {
            return { deposits: [], total: 0 };
        }

        const allDeposits = Array.from(userDepositIds)
            .map(id => deposits.get(id)!)
            .filter(Boolean)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        const start = (page - 1) * limit;
        const paginatedDeposits = allDeposits.slice(start, start + limit);

        return {
            deposits: paginatedDeposits,
            total: allDeposits.length,
        };
    }

    /**
     * Update deposit status
     */
    async updateStatus(id: string, update: UpdateDepositStatus): Promise<Deposit | null> {
        const deposit = deposits.get(id);
        if (!deposit) return null;

        const updatedDeposit: Deposit = {
            ...deposit,
            status: update.status,
            errorMessage: update.errorMessage,
            updatedAt: new Date(),
            completedAt: update.status === 'COMPLETED' ? new Date() : deposit.completedAt,
        };

        // Add transaction hash to index
        if (update.txHash) {
            if (update.status === 'BRIDGING') {
                updatedDeposit.bridgeTxHash = update.txHash;
            } else if (update.status === 'DEPOSITING' || update.status === 'COMPLETED') {
                updatedDeposit.depositTxHash = update.txHash;
            }
            depositsByTxHash.set(update.txHash.toLowerCase(), id);
        }

        deposits.set(id, updatedDeposit);

        logger.info({ depositId: id, status: update.status }, 'Deposit status updated');
        return updatedDeposit;
    }

    /**
     * Get recent deposits (for admin/monitoring)
     */
    async getRecent(limit = 50): Promise<Deposit[]> {
        return Array.from(deposits.values())
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }

    /**
     * Get deposit statistics
     */
    async getStats(): Promise<{
        total: number;
        byStatus: Record<string, number>;
        totalVolume: string;
    }> {
        const allDeposits = Array.from(deposits.values());

        const byStatus: Record<string, number> = {
            PENDING: 0,
            BRIDGING: 0,
            DEPOSITING: 0,
            COMPLETED: 0,
            FAILED: 0,
        };

        let totalVolume = 0n;

        for (const deposit of allDeposits) {
            byStatus[deposit.status] = (byStatus[deposit.status] || 0) + 1;
            if (deposit.status === 'COMPLETED') {
                try {
                    totalVolume += BigInt(deposit.destinationAmount);
                } catch {
                    // Invalid amount, skip
                }
            }
        }

        return {
            total: allDeposits.length,
            byStatus,
            totalVolume: totalVolume.toString(),
        };
    }

    /**
     * Clear all deposits (for testing only)
     */
    clearAll(): void {
        deposits.clear();
        depositsByUser.clear();
        depositsByTxHash.clear();
    }

    /**
     * Mark stale pending deposits as failed
     * Should be run periodically
     */
    async cleanupStaleDeposits(maxAgeMinutes = 30): Promise<number> {
        const cutoff = Date.now() - maxAgeMinutes * 60 * 1000;
        let cleaned = 0;

        for (const deposit of deposits.values()) {
            if (
                (deposit.status === 'PENDING' || deposit.status === 'BRIDGING') &&
                deposit.createdAt.getTime() < cutoff
            ) {
                await this.updateStatus(deposit.id, {
                    txHash: deposit.bridgeTxHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
                    status: 'FAILED',
                    errorMessage: 'Deposit timed out',
                });
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.info({ cleaned }, 'Cleaned up stale deposits');
        }

        return cleaned;
    }
}

// Singleton instance
export const depositService = new DepositService();
export default depositService;

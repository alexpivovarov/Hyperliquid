import { isDatabaseAvailable } from '../lib/prisma.js';
import { depositService as inMemoryDepositService } from './deposits.js';
import { prismaDepositService } from './deposits-prisma.js';
import logger from '../utils/logger.js';
import type { Deposit, CreateDepositRequest, UpdateDepositStatus } from '../types/index.js';

/**
 * Service interface that both implementations follow
 */
interface IDepositService {
    create(data: CreateDepositRequest): Promise<Deposit>;
    getById(id: string): Promise<Deposit | null>;
    getByTxHash(txHash: string): Promise<Deposit | null>;
    getByUser(userAddress: string, page?: number, limit?: number): Promise<{
        deposits: Deposit[];
        total: number;
    }>;
    updateStatus(id: string, update: UpdateDepositStatus): Promise<Deposit | null>;
    getRecent(limit?: number): Promise<Deposit[]>;
    getStats(): Promise<{
        total: number;
        byStatus: Record<string, number>;
        totalVolume: string;
    }>;
    clearAll(): void | Promise<void>;
    cleanupStaleDeposits(maxAgeMinutes?: number): Promise<number>;
}

/**
 * Unified deposit service that automatically uses PostgreSQL when available
 * and falls back to in-memory storage when not
 */
class UnifiedDepositService implements IDepositService {
    private usePrisma = false;
    private initialized = false;

    /**
     * Initialize the service and determine which backend to use
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        this.usePrisma = await isDatabaseAvailable();

        if (this.usePrisma) {
            logger.info('Using PostgreSQL database for deposit storage');
        } else {
            logger.info('Using in-memory storage for deposits (no database available)');
        }

        this.initialized = true;
    }

    /**
     * Get the active service based on database availability
     */
    private getService(): IDepositService {
        return this.usePrisma ? prismaDepositService : inMemoryDepositService;
    }

    async create(data: CreateDepositRequest): Promise<Deposit> {
        await this.initialize();
        return this.getService().create(data);
    }

    async getById(id: string): Promise<Deposit | null> {
        await this.initialize();
        return this.getService().getById(id);
    }

    async getByTxHash(txHash: string): Promise<Deposit | null> {
        await this.initialize();
        return this.getService().getByTxHash(txHash);
    }

    async getByUser(userAddress: string, page = 1, limit = 10): Promise<{
        deposits: Deposit[];
        total: number;
    }> {
        await this.initialize();
        return this.getService().getByUser(userAddress, page, limit);
    }

    async updateStatus(id: string, update: UpdateDepositStatus): Promise<Deposit | null> {
        await this.initialize();
        return this.getService().updateStatus(id, update);
    }

    async getRecent(limit = 50): Promise<Deposit[]> {
        await this.initialize();
        return this.getService().getRecent(limit);
    }

    async getStats(): Promise<{
        total: number;
        byStatus: Record<string, number>;
        totalVolume: string;
    }> {
        await this.initialize();
        return this.getService().getStats();
    }

    async clearAll(): Promise<void> {
        await this.initialize();
        return this.getService().clearAll();
    }

    async cleanupStaleDeposits(maxAgeMinutes = 30): Promise<number> {
        await this.initialize();
        return this.getService().cleanupStaleDeposits(maxAgeMinutes);
    }

    /**
     * Check if using PostgreSQL database
     */
    isUsingDatabase(): boolean {
        return this.usePrisma;
    }
}

// Export unified service instance
export const depositService = new UnifiedDepositService();
export default depositService;

// Re-export individual services for testing
export { inMemoryDepositService, prismaDepositService };

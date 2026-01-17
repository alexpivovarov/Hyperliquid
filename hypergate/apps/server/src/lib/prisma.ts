import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

/**
 * Prisma client singleton
 * In development, we store it on the global object to prevent
 * multiple instances during hot-reloading
 */
export const prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

/**
 * Connect to the database
 */
export async function connectDatabase(): Promise<boolean> {
    try {
        await prisma.$connect();
        logger.info('Connected to PostgreSQL database');
        return true;
    } catch (error) {
        logger.warn({ error }, 'Failed to connect to PostgreSQL database - using in-memory storage');
        return false;
    }
}

/**
 * Disconnect from the database
 */
export async function disconnectDatabase(): Promise<void> {
    await prisma.$disconnect();
    logger.info('Disconnected from PostgreSQL database');
}

/**
 * Check if database is available
 */
export async function isDatabaseAvailable(): Promise<boolean> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch {
        return false;
    }
}

export default prisma;

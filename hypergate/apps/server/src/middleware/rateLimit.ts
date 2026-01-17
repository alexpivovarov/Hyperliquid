import type { Request, Response, NextFunction } from 'express';
import { getRedisClient, isRedisAvailable } from '../lib/redis.js';
import { ApiError } from './errorHandler.js';
import logger from '../utils/logger.js';

interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Max requests per window
    keyPrefix?: string;    // Redis key prefix
    keyGenerator?: (req: Request) => string;  // Custom key generator
    skipFailedRequests?: boolean;  // Don't count failed requests
    skipSuccessfulRequests?: boolean;  // Don't count successful requests
    message?: string;      // Custom error message
}

interface RateLimitInfo {
    remaining: number;
    resetTime: number;
    total: number;
}

// In-memory store for fallback when Redis is unavailable
const memoryStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup interval for memory store
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of memoryStore.entries()) {
        if (value.resetTime < now) {
            memoryStore.delete(key);
        }
    }
}, 60000); // Cleanup every minute

/**
 * Get rate limit info from Redis
 */
async function getRateLimitFromRedis(
    key: string,
    windowMs: number,
    maxRequests: number
): Promise<RateLimitInfo> {
    const redis = await getRedisClient();
    if (!redis) {
        throw new Error('Redis not available');
    }

    const now = Date.now();
    const windowStart = now - windowMs;

    // Use Redis sorted set for sliding window
    const multi = redis.multi();

    // Remove old entries outside the window
    multi.zRemRangeByScore(key, 0, windowStart);

    // Add current request
    multi.zAdd(key, { score: now, value: `${now}-${Math.random()}` });

    // Count requests in window
    multi.zCard(key);

    // Set expiry on the key
    multi.expire(key, Math.ceil(windowMs / 1000) + 1);

    const results = await multi.exec();
    const count = results[2] as number;
    const resetTime = now + windowMs;

    return {
        remaining: Math.max(0, maxRequests - count),
        resetTime,
        total: maxRequests,
    };
}

/**
 * Get rate limit info from memory (fallback)
 */
function getRateLimitFromMemory(
    key: string,
    windowMs: number,
    maxRequests: number
): RateLimitInfo {
    const now = Date.now();
    const existing = memoryStore.get(key);

    if (!existing || existing.resetTime < now) {
        // New window
        memoryStore.set(key, { count: 1, resetTime: now + windowMs });
        return {
            remaining: maxRequests - 1,
            resetTime: now + windowMs,
            total: maxRequests,
        };
    }

    // Increment existing
    existing.count++;
    memoryStore.set(key, existing);

    return {
        remaining: maxRequests - existing.count,
        resetTime: existing.resetTime,
        total: maxRequests,
    };
}

/**
 * Create rate limit middleware
 */
export function rateLimit(options: RateLimitConfig) {
    const {
        windowMs,
        maxRequests,
        keyPrefix = 'rl',
        keyGenerator = (req) => req.ip || 'unknown',
        message = 'Too many requests, please try again later',
    } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const identifier = keyGenerator(req);
        const key = `${keyPrefix}:${identifier}`;

        try {
            let info: RateLimitInfo;

            if (isRedisAvailable()) {
                info = await getRateLimitFromRedis(key, windowMs, maxRequests);
            } else {
                info = getRateLimitFromMemory(key, windowMs, maxRequests);
            }

            // Set rate limit headers
            res.setHeader('X-RateLimit-Limit', info.total);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, info.remaining));
            res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000));

            if (info.remaining < 0) {
                const retryAfter = Math.ceil((info.resetTime - Date.now()) / 1000);
                res.setHeader('Retry-After', retryAfter);

                logger.warn({
                    ip: req.ip,
                    path: req.path,
                    key,
                }, 'Rate limit exceeded');

                throw ApiError.badRequest(message, 'RATE_LIMIT_EXCEEDED', {
                    retryAfter,
                    resetTime: new Date(info.resetTime).toISOString(),
                });
            }

            next();
        } catch (error) {
            if (error instanceof ApiError) {
                next(error);
            } else {
                // If rate limiting fails, allow the request but log warning
                logger.warn({ error }, 'Rate limiting check failed, allowing request');
                next();
            }
        }
    };
}

/**
 * Preset rate limiters for different use cases
 */

// General API rate limit: 100 requests per minute
export const generalRateLimit = rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'rl:general',
});

// Deposit creation rate limit: 10 per minute per IP
export const depositRateLimit = rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'rl:deposit',
    message: 'Too many deposit requests, please wait before trying again',
});

// Strict rate limit for sensitive operations: 5 per minute
export const strictRateLimit = rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'rl:strict',
    message: 'Rate limit exceeded for this operation',
});

// Per-wallet rate limit for deposits: 3 per minute per wallet address
export const walletRateLimit = rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 3,
    keyPrefix: 'rl:wallet',
    keyGenerator: (req) => {
        // Use wallet address from body or params
        const address = req.body?.userAddress || req.params?.address || req.ip;
        return address?.toLowerCase() || 'unknown';
    },
    message: 'Too many requests from this wallet address',
});

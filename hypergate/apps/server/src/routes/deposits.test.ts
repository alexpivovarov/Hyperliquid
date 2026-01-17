import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import depositService from '../services/deposits.js';

describe('Deposit Routes', () => {
    beforeEach(() => {
        depositService.clearAll();
    });

    describe('POST /api/deposits', () => {
        it('should create a new deposit', async () => {
            const response = await request(app)
                .post('/api/deposits')
                .send({
                    userAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                    sourceChain: 'ethereum',
                    sourceToken: 'USDC',
                    sourceAmount: '1000000',
                    expectedDestinationAmount: '1000000',
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.id).toBeDefined();
            expect(response.body.data.status).toBe('PENDING');
        });

        it('should reject invalid address', async () => {
            const response = await request(app)
                .post('/api/deposits')
                .send({
                    userAddress: 'invalid-address',
                    sourceChain: 'ethereum',
                    sourceToken: 'USDC',
                    sourceAmount: '1000000',
                    expectedDestinationAmount: '1000000',
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject missing required fields', async () => {
            const response = await request(app)
                .post('/api/deposits')
                .send({
                    userAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                    // Missing other required fields
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/deposits/:id', () => {
        it('should return a deposit by ID', async () => {
            // First create a deposit
            const createResponse = await request(app)
                .post('/api/deposits')
                .send({
                    userAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                    sourceChain: 'ethereum',
                    sourceToken: 'USDC',
                    sourceAmount: '1000000',
                    expectedDestinationAmount: '1000000',
                });

            const depositId = createResponse.body.data.id;

            // Then retrieve it
            const response = await request(app)
                .get(`/api/deposits/${depositId}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(depositId);
        });

        it('should return 404 for non-existent deposit', async () => {
            const response = await request(app)
                .get('/api/deposits/non-existent-id');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/deposits/user/:address', () => {
        it('should return deposits for a user', async () => {
            const userAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

            // Create a few deposits
            await request(app)
                .post('/api/deposits')
                .send({
                    userAddress,
                    sourceChain: 'ethereum',
                    sourceToken: 'USDC',
                    sourceAmount: '1000000',
                    expectedDestinationAmount: '1000000',
                });

            await request(app)
                .post('/api/deposits')
                .send({
                    userAddress,
                    sourceChain: 'arbitrum',
                    sourceToken: 'USDC',
                    sourceAmount: '2000000',
                    expectedDestinationAmount: '2000000',
                });

            // Get user deposits
            const response = await request(app)
                .get(`/api/deposits/user/${userAddress}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.pagination).toBeDefined();
            expect(response.body.pagination.total).toBe(2);
        });

        it('should reject invalid address format', async () => {
            const response = await request(app)
                .get('/api/deposits/user/invalid-address');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should handle pagination', async () => {
            const userAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

            // Create 5 deposits
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/api/deposits')
                    .send({
                        userAddress,
                        sourceChain: 'ethereum',
                        sourceToken: 'USDC',
                        sourceAmount: `${(i + 1) * 1000000}`,
                        expectedDestinationAmount: `${(i + 1) * 1000000}`,
                    });
            }

            // Get first page
            const response = await request(app)
                .get(`/api/deposits/user/${userAddress}?page=1&limit=2`);

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(2);
            expect(response.body.pagination.total).toBe(5);
            expect(response.body.pagination.totalPages).toBe(3);
        });
    });

    describe('PATCH /api/deposits/:id/status', () => {
        it('should update deposit status', async () => {
            // Create a deposit
            const createResponse = await request(app)
                .post('/api/deposits')
                .send({
                    userAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                    sourceChain: 'ethereum',
                    sourceToken: 'USDC',
                    sourceAmount: '1000000',
                    expectedDestinationAmount: '1000000',
                });

            const depositId = createResponse.body.data.id;

            // Update status
            const response = await request(app)
                .patch(`/api/deposits/${depositId}/status`)
                .send({
                    status: 'BRIDGING',
                    txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('BRIDGING');
            expect(response.body.data.bridgeTxHash).toBe('0x1234567890123456789012345678901234567890123456789012345678901234');
        });

        it('should return 404 for non-existent deposit', async () => {
            const response = await request(app)
                .patch('/api/deposits/non-existent/status')
                .send({
                    status: 'BRIDGING',
                    txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
                });

            expect(response.status).toBe(404);
        });
    });
});

describe('Health Routes', () => {
    describe('GET /health/live', () => {
        it('should return alive status', async () => {
            const response = await request(app)
                .get('/health/live');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('alive');
        });
    });

    describe('GET /health/ready', () => {
        it('should return ready or not ready status', async () => {
            const response = await request(app)
                .get('/health/ready');

            // May return 200 (ready) or 503 (not ready) depending on blockchain connectivity
            expect([200, 503]).toContain(response.status);
            expect(['ready', 'not ready']).toContain(response.body.status);
        });
    });
});

describe('Root endpoint', () => {
    it('should return API info', async () => {
        const response = await request(app)
            .get('/');

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('HyperGate API');
        expect(response.body.version).toBe('1.0.0');
        expect(response.body.status).toBe('running');
    });
});

describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
        const response = await request(app)
            .get('/unknown-route');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
    });
});

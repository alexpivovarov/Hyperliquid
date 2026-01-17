import { describe, it, expect, beforeEach } from 'vitest';
import depositService from './deposits.js';

// Valid 64-char transaction hash for tests
const VALID_TX_HASH = '0x1234567890123456789012345678901234567890123456789012345678901234';

describe('DepositService', () => {
    beforeEach(() => {
        // Clear deposits between tests
        depositService.clearAll();
    });

    describe('create', () => {
        it('should create a deposit with valid data', async () => {
            const data = {
                userAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                sourceChain: 'ethereum',
                sourceToken: 'USDC',
                sourceAmount: '1000000',
                expectedDestinationAmount: '1000000',
            };

            const deposit = await depositService.create(data);

            expect(deposit).toBeDefined();
            expect(deposit.id).toBeDefined();
            expect(deposit.userAddress).toBe(data.userAddress.toLowerCase());
            expect(deposit.sourceChain).toBe(data.sourceChain);
            expect(deposit.sourceToken).toBe(data.sourceToken);
            expect(deposit.sourceAmount).toBe(data.sourceAmount);
            expect(deposit.destinationAmount).toBe(data.expectedDestinationAmount);
            expect(deposit.status).toBe('PENDING');
            expect(deposit.createdAt).toBeDefined();
            expect(deposit.updatedAt).toBeDefined();
        });

        it('should generate unique IDs for each deposit', async () => {
            const data = {
                userAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                sourceChain: 'ethereum',
                sourceToken: 'USDC',
                sourceAmount: '1000000',
                expectedDestinationAmount: '1000000',
            };

            const deposit1 = await depositService.create(data);
            const deposit2 = await depositService.create(data);

            expect(deposit1.id).not.toBe(deposit2.id);
        });
    });

    describe('getById', () => {
        it('should return deposit by ID', async () => {
            const data = {
                userAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                sourceChain: 'ethereum',
                sourceToken: 'USDC',
                sourceAmount: '1000000',
                expectedDestinationAmount: '1000000',
            };

            const created = await depositService.create(data);
            const found = await depositService.getById(created.id);

            expect(found).toEqual(created);
        });

        it('should return null for non-existent ID', async () => {
            const found = await depositService.getById('non-existent-id');
            expect(found).toBeNull();
        });
    });

    describe('getByUser', () => {
        it('should return deposits for a specific user', async () => {
            const user1 = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
            const user2 = '0x1234567890123456789012345678901234567890';

            await depositService.create({
                userAddress: user1,
                sourceChain: 'ethereum',
                sourceToken: 'USDC',
                sourceAmount: '1000000',
                expectedDestinationAmount: '1000000',
            });

            await depositService.create({
                userAddress: user2,
                sourceChain: 'arbitrum',
                sourceToken: 'USDC',
                sourceAmount: '2000000',
                expectedDestinationAmount: '2000000',
            });

            await depositService.create({
                userAddress: user1,
                sourceChain: 'polygon',
                sourceToken: 'USDC',
                sourceAmount: '3000000',
                expectedDestinationAmount: '3000000',
            });

            const { deposits, total } = await depositService.getByUser(user1, 1, 10);

            expect(total).toBe(2);
            expect(deposits).toHaveLength(2);
            deposits.forEach((d) => expect(d.userAddress).toBe(user1.toLowerCase()));
        });

        it('should handle pagination correctly', async () => {
            const user = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

            // Create 5 deposits
            for (let i = 0; i < 5; i++) {
                await depositService.create({
                    userAddress: user,
                    sourceChain: 'ethereum',
                    sourceToken: 'USDC',
                    sourceAmount: `${(i + 1) * 1000000}`,
                    expectedDestinationAmount: `${(i + 1) * 1000000}`,
                });
            }

            // Get first page
            const page1 = await depositService.getByUser(user, 1, 2);
            expect(page1.deposits).toHaveLength(2);
            expect(page1.total).toBe(5);

            // Get second page
            const page2 = await depositService.getByUser(user, 2, 2);
            expect(page2.deposits).toHaveLength(2);

            // Get third page
            const page3 = await depositService.getByUser(user, 3, 2);
            expect(page3.deposits).toHaveLength(1);
        });
    });

    describe('updateStatus', () => {
        it('should update deposit status', async () => {
            const deposit = await depositService.create({
                userAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                sourceChain: 'ethereum',
                sourceToken: 'USDC',
                sourceAmount: '1000000',
                expectedDestinationAmount: '1000000',
            });

            const updated = await depositService.updateStatus(deposit.id, {
                status: 'BRIDGING',
                txHash: VALID_TX_HASH,
            });

            expect(updated).toBeDefined();
            expect(updated!.status).toBe('BRIDGING');
            expect(updated!.bridgeTxHash).toBe(VALID_TX_HASH);
            expect(updated!.updatedAt.getTime()).toBeGreaterThan(deposit.updatedAt.getTime());
        });

        it('should set completedAt when status is COMPLETED', async () => {
            const deposit = await depositService.create({
                userAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                sourceChain: 'ethereum',
                sourceToken: 'USDC',
                sourceAmount: '1000000',
                expectedDestinationAmount: '1000000',
            });

            const updated = await depositService.updateStatus(deposit.id, {
                status: 'COMPLETED',
                txHash: VALID_TX_HASH,
            });

            expect(updated!.completedAt).toBeDefined();
        });

        it('should return null for non-existent deposit', async () => {
            const updated = await depositService.updateStatus('non-existent', {
                status: 'COMPLETED',
                txHash: VALID_TX_HASH,
            });

            expect(updated).toBeNull();
        });
    });

    describe('getStats', () => {
        it('should return correct statistics', async () => {
            const user = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

            // Create deposits with different statuses
            const d1 = await depositService.create({
                userAddress: user,
                sourceChain: 'ethereum',
                sourceToken: 'USDC',
                sourceAmount: '1000000',
                expectedDestinationAmount: '1000000',
            });

            const d2 = await depositService.create({
                userAddress: user,
                sourceChain: 'arbitrum',
                sourceToken: 'USDC',
                sourceAmount: '2000000',
                expectedDestinationAmount: '2000000',
            });

            await depositService.updateStatus(d1.id, { status: 'COMPLETED', txHash: VALID_TX_HASH });
            await depositService.updateStatus(d2.id, { status: 'BRIDGING', txHash: VALID_TX_HASH });

            const stats = await depositService.getStats();

            expect(stats.total).toBe(2);
            expect(stats.byStatus.COMPLETED).toBe(1);
            expect(stats.byStatus.BRIDGING).toBe(1);
            expect(stats.byStatus.PENDING).toBe(0);
        });
    });

    describe('cleanupStaleDeposits', () => {
        it('should mark old pending deposits as failed', async () => {
            // Create a deposit with old timestamp
            const deposit = await depositService.create({
                userAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                sourceChain: 'ethereum',
                sourceToken: 'USDC',
                sourceAmount: '1000000',
                expectedDestinationAmount: '1000000',
            });

            // Manually update createdAt to 2 hours ago for testing
            const deposits = await depositService.getByUser(deposit.userAddress, 1, 10);
            const staleDeposit = deposits.deposits[0];
            // @ts-ignore - accessing private property for test
            staleDeposit.createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000);

            // Run cleanup with 1 minute timeout
            const cleaned = await depositService.cleanupStaleDeposits(1);

            expect(cleaned).toBe(1);

            const updated = await depositService.getById(deposit.id);
            expect(updated!.status).toBe('FAILED');
        });
    });
});

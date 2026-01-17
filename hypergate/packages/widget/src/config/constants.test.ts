import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CHAINS, CONTRACTS, LIMITS, API, validateConfiguration } from './constants';

describe('Configuration Constants', () => {
    describe('CHAINS', () => {
        it('should have correct HyperEVM chain ID', () => {
            expect(CHAINS.HYPEREVM.id).toBe(998);
        });

        it('should have chain name', () => {
            expect(CHAINS.HYPEREVM.name).toBe('HyperEVM');
        });

        it('should have valid RPC URL', () => {
            expect(CHAINS.HYPEREVM.rpcUrl).toMatch(/^https?:\/\//);
        });
    });

    describe('CONTRACTS', () => {
        it('should have USDC address defined', () => {
            expect(CONTRACTS.USDC_HYPEREVM).toBeDefined();
            expect(typeof CONTRACTS.USDC_HYPEREVM).toBe('string');
        });

        it('should have Bridge address defined', () => {
            expect(CONTRACTS.ASSET_BRIDGE).toBeDefined();
            expect(typeof CONTRACTS.ASSET_BRIDGE).toBe('string');
        });

        it('addresses should start with 0x', () => {
            expect(CONTRACTS.USDC_HYPEREVM.startsWith('0x')).toBe(true);
            expect(CONTRACTS.ASSET_BRIDGE.startsWith('0x')).toBe(true);
        });
    });

    describe('LIMITS', () => {
        it('should have minimum deposit of $5.10', () => {
            expect(LIMITS.MINIMUM_DEPOSIT).toBe(5.1);
        });

        it('should have maximum deposit of $100,000', () => {
            expect(LIMITS.MAXIMUM_DEPOSIT).toBe(100000);
        });

        it('should have gas refuel amount of $1', () => {
            expect(LIMITS.GAS_REFUEL_AMOUNT).toBe(1.0);
        });

        it('minimum should be greater than Hyperliquid burn threshold ($5)', () => {
            expect(LIMITS.MINIMUM_DEPOSIT).toBeGreaterThan(5);
        });
    });

    describe('API', () => {
        it('should have BASE_URL defined', () => {
            expect(API.BASE_URL).toBeDefined();
            expect(typeof API.BASE_URL).toBe('string');
        });

        it('BASE_URL should be a valid URL', () => {
            expect(API.BASE_URL).toMatch(/^https?:\/\//);
        });
    });

    describe('validateConfiguration', () => {
        let consoleSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        });

        afterEach(() => {
            consoleSpy.mockRestore();
        });

        it('should return validation result object', () => {
            const result = validateConfiguration();
            expect(result).toHaveProperty('valid');
            expect(result).toHaveProperty('errors');
            expect(Array.isArray(result.errors)).toBe(true);
        });

        it('should detect burn address for USDC (if default)', () => {
            // The default config has burn address, so this should fail
            const result = validateConfiguration();

            // Check if burn address warning is present
            const hasBurnWarning = result.errors.some(
                err => err.includes('burn address') || err.includes('USDC')
            );

            // With default config, we expect warnings about the burn address
            if (CONTRACTS.USDC_HYPEREVM === '0x0000000000000000000000000000000000000000') {
                expect(hasBurnWarning).toBe(true);
            }
        });

        it('should validate address format', () => {
            const result = validateConfiguration();

            // If addresses are invalid format, errors should be present
            const addressFormatErrors = result.errors.filter(
                err => err.includes('Invalid') && err.includes('address')
            );

            // Valid addresses are 42 chars (0x + 40 hex)
            if (CONTRACTS.USDC_HYPEREVM.length !== 42) {
                expect(addressFormatErrors.length).toBeGreaterThan(0);
            }
        });
    });
});

describe('Address Validation Helper', () => {
    // Test the regex pattern used in isValidAddress
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;

    it('should accept valid Ethereum addresses', () => {
        const validAddresses = [
            '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
            '0x0000000000000000000000000000000000000000',
            '0xffffffffffffffffffffffffffffffffffffffff',
            '0xABCDEF1234567890abcdef1234567890ABCDEF12',
        ];

        validAddresses.forEach(addr => {
            expect(addressRegex.test(addr)).toBe(true);
        });
    });

    it('should reject invalid addresses', () => {
        const invalidAddresses = [
            '0x123',                                              // Too short
            '0x12345678901234567890123456789012345678901',        // Too long
            'd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',           // Missing 0x
            '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',        // Invalid hex chars
            '',                                                   // Empty
            '0x',                                                 // Just prefix
        ];

        invalidAddresses.forEach(addr => {
            expect(addressRegex.test(addr)).toBe(false);
        });
    });
});

describe('Safety Limits Logic', () => {
    it('should correctly identify amounts below minimum as unsafe', () => {
        const testCases = [
            { amount: 4.99, expected: false },
            { amount: 5.00, expected: false },
            { amount: 5.09, expected: false },
            { amount: 5.10, expected: true },
            { amount: 5.11, expected: true },
            { amount: 100.00, expected: true },
        ];

        testCases.forEach(({ amount, expected }) => {
            const isSafe = amount >= LIMITS.MINIMUM_DEPOSIT;
            expect(isSafe).toBe(expected);
        });
    });

    it('should correctly identify amounts above maximum as unsafe', () => {
        const testCases = [
            { amount: 99999.99, expected: true },
            { amount: 100000.00, expected: true },
            { amount: 100000.01, expected: false },
            { amount: 200000.00, expected: false },
        ];

        testCases.forEach(({ amount, expected }) => {
            const isSafe = amount <= LIMITS.MAXIMUM_DEPOSIT;
            expect(isSafe).toBe(expected);
        });
    });
});

// =============================================================================
// HyperGate Configuration Constants
// =============================================================================

/**
 * Validate an Ethereum address format
 */
function isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get environment variable with fallback
 * Works in both Vite (import.meta.env) and Node.js (process.env)
 */
function getEnvVar(key: string, fallback: string): string {
    // Vite environment
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return (import.meta.env as Record<string, string>)[key] || fallback;
    }
    // Node.js environment
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || fallback;
    }
    return fallback;
}

// =============================================================================
// Chain Configuration
// =============================================================================

export const CHAINS = {
    HYPEREVM: {
        // HyperEVM Mainnet Chain ID
        // Reference: https://hyperliquid.gitbook.io/
        id: 998,
        name: 'HyperEVM',
        rpcUrl: getEnvVar('VITE_RPC_URL', 'https://rpc.hyperliquid.xyz/evm'),
    }
} as const;

// =============================================================================
// Contract Addresses
// =============================================================================

// Default addresses - MUST be verified against official Hyperliquid documentation
// These are placeholders that should be overridden via environment variables in production
const DEFAULT_USDC_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_BRIDGE_ADDRESS = '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7';

export const CONTRACTS = {
    // USDC token contract on HyperEVM
    // TODO: Replace with verified USDC address from Hyperliquid docs
    USDC_HYPEREVM: getEnvVar('VITE_USDC_ADDRESS', DEFAULT_USDC_ADDRESS) as `0x${string}`,

    // Asset Bridge precompile for L1 deposits
    // Reference: Hyperliquid GitBook - EVM Bridge section
    ASSET_BRIDGE: getEnvVar('VITE_BRIDGE_ADDRESS', DEFAULT_BRIDGE_ADDRESS) as `0x${string}`,
} as const;

// =============================================================================
// Deposit Limits
// =============================================================================

export const LIMITS = {
    // Minimum deposit in USD
    // Hyperliquid burns deposits < $5, so we enforce $5.10 as minimum
    MINIMUM_DEPOSIT: 5.1,

    // Maximum deposit in USD (safety cap)
    MAXIMUM_DEPOSIT: 100000,

    // Gas refuel amount in USD worth of HYPE
    GAS_REFUEL_AMOUNT: 1.0,
} as const;

// =============================================================================
// API Configuration
// =============================================================================

export const API = {
    // Backend API base URL
    BASE_URL: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3001'),
} as const;

// =============================================================================
// Runtime Validation
// =============================================================================

/**
 * Validate configuration at runtime
 * Call this during app initialization to catch configuration errors early
 */
export function validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate USDC address
    if (!isValidAddress(CONTRACTS.USDC_HYPEREVM)) {
        errors.push(`Invalid USDC address: ${CONTRACTS.USDC_HYPEREVM} (must be 40 hex characters)`);
    }

    // Validate Bridge address
    if (!isValidAddress(CONTRACTS.ASSET_BRIDGE)) {
        errors.push(`Invalid Bridge address: ${CONTRACTS.ASSET_BRIDGE} (must be 40 hex characters)`);
    }

    // Check for burn address (0x000...000)
    if (CONTRACTS.USDC_HYPEREVM === '0x0000000000000000000000000000000000000000') {
        errors.push('USDC address is set to burn address - funds will be lost! Set VITE_USDC_ADDRESS');
    }

    if (CONTRACTS.ASSET_BRIDGE === '0x0000000000000000000000000000000000000000') {
        errors.push('Bridge address is set to burn address - funds will be lost! Set VITE_BRIDGE_ADDRESS');
    }

    // Validate RPC URL
    if (!CHAINS.HYPEREVM.rpcUrl.startsWith('http')) {
        errors.push(`Invalid RPC URL: ${CHAINS.HYPEREVM.rpcUrl}`);
    }

    // Log errors in development
    if (errors.length > 0 && typeof console !== 'undefined') {
        console.error('⚠️ HyperGate Configuration Errors:');
        errors.forEach(err => console.error(`  - ${err}`));
    }

    return { valid: errors.length === 0, errors };
}

// Auto-validate in development
if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    validateConfiguration();
}

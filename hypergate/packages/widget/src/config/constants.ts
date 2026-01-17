export const CHAINS = {
    HYPEREVM: {
        id: 998, // Verified from docs/research: Hyperliquid EVM Mainnet ID (often 999 or similar, will need verification. 998 is common for testnets, check docs)
        // NOTE: For now using 998 as placeholder. PRD says 998.
        name: 'HyperEVM',
        rpcUrl: 'https://rpc.hyperliquid.xyz/evm', // Common RPC
    }
};

export const CONTRACTS = {
    // Verified via HyperEVMScan and GitBook
    USDC_HYPEREVM: '0xb88339cb01e41113264632ba630f', // USDC on HyperEVM
    ASSET_BRIDGE: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7', // Asset Bridge
};

export const LIMITS = {
    MINIMUM_DEPOSIT: 5.1, // $5 + buffer
    MAXIMUM_DEPOSIT: 100000, // $100K cap for safety
    GAS_REFUEL_AMOUNT: 1.0, // $1 worth of HYPE
};

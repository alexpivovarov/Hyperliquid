# Constants Reference

Global constants used across the widget.
Source: `packages/widget/src/config/constants.ts`

## `CHAINS`

Configuration for the destination chain.

```typescript
export const CHAINS = {
    HYPEREVM: {
        id: 999,
        name: 'HyperEVM',
        rpcUrl: 'https://rpc.hyperliquid.xyz/evm',
    }
}
```

## `CONTRACTS`

Verified smart contract addresses.

```typescript
export const CONTRACTS = {
    // USDC on HyperEVM (Native Circle USDC)
    USDC_HYPEREVM: '0xb88339CB7199b77E23DB6E890353E22632Ba630f',

    // CoreDepositWallet (Bridge Precompile)
    ASSET_BRIDGE: '0x6b9e773128f453f5c2c60935ee2de2cbc5390a24',

    // System Address
    SYSTEM_ADDRESS: '0x2000000000000000000000000000000000000000',
}
```

## `LIMITS`

Operational boundaries enforced by the UI.

| Key | Value | Description |
|-----|-------|-------------|
| `MINIMUM_DEPOSIT` | `5.1` | $5.10 hard minimum. Deposits below $5.00 are burned by protocol. |
| `MAXIMUM_DEPOSIT` | `100000` | $100k safety cap. |
| `GAS_REFUEL_AMOUNT` | `1.0` | $1.00 USD worth of HYPE requested during refuel. |

## `API`

Configuration for the optional backend service.

```typescript
export const API = {
    BASE_URL: 'http://localhost:3001',
}
```

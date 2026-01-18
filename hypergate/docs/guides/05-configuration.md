# Configuration Reference

Reference for environment variables, constants, and configuration files.

---

## Environment Variables

These variables can be set in `.env` files.

| Variable | Description | Default | Required? |
|----------|-------------|---------|-----------|
| `VITE_WALLET_CONNECT_PROJECT_ID` | Project ID from WalletConnect Cloud | - | ✅ Yes |
| `VITE_RPC_URL` | RPC URL for HyperEVM (Chain 999) | `https://rpc.hyperliquid.xyz/evm` | ❌ No |
| `VITE_API_BASE_URL` | Backend API URL (optional) | `http://localhost:3001` | ❌ No |
| `VITE_USDC_ADDRESS` | USDC Contract on HyperEVM | (Mainnet Address) | ❌ No |
| `VITE_BRIDGE_ADDRESS` | Asset Bridge Precompile Address | (Mainnet Address) | ❌ No |

---

## Core Constants

Located in [`packages/widget/src/config/constants.ts`](../api-reference/04-constants.md).

### Chain IDs
- **HyperEVM Mainnet**: `999`
- **Arbitrum One**: `42161`
- **Ethereum Mainnet**: `1`

### Contracts (HyperEVM)
- **USDC**: `0xb88339CB7199b77E23DB6E890353E22632Ba630f`
- **Asset Bridge**: `0x6b9e773128f453f5c2c60935ee2de2cbc5390a24`

### Limits
- **Min Deposit**: `$5.10` (Enforced by UI to prevent burn)
- **Max Deposit**: `$100,000` (Safety cap)

---

## Wagmi Configuration

The demo app uses a centralized Wagmi config in `apps/demo/src/wagmi.ts`.

```typescript
export const hyperEvm = defineChain({
    id: 999,
    name: 'HyperEVM',
    nativeCurrency: {
        decimals: 18,
        name: 'Hype',
        symbol: 'HYPE',
    },
    rpcUrls: {
        default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
    },
    blockExplorers: {
        default: { name: 'HyperLiquid Explorer', url: 'https://hyperevm.org/explorer' },
    },
});
```

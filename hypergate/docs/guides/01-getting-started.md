# Getting Started with HyperGate

This guide will help you install, configure, and use the HyperGate widget in your React application.

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** v18+ installed
- **pnpm** (recommended) or npm/yarn
- A React project (Next.js, Vite, or Create React App)
- A **WalletConnect Project ID** (get one at [cloud.walletconnect.com](https://cloud.walletconnect.com))

---

## 1. Installation

Install the widget and its peer dependencies:

```bash
# Using pnpm
pnpm add @hypergate/widget @lifi/widget @lifi/sdk viem wagmi @rainbow-me/rainbowkit @tanstack/react-query

# Using npm
npm install @hypergate/widget @lifi/widget @lifi/sdk viem wagmi @rainbow-me/rainbowkit @tanstack/react-query
```

---

## 2. Configuration

HyperGate relies on Wagmi for wallet connections. You need to wrap your app in the Wagmi and Query providers.

### Setup Providers (`App.tsx` or `layout.tsx`)

```tsx
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from './wagmi'; // Your wagmi config
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

export default function App({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Wagmi Configuration (`wagmi.ts`)

```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrum, mainnet, optimism, base } from 'wagmi/chains';

// Define HyperEVM Chain
const hyperEvm = {
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: { name: 'Hype', symbol: 'HYPE', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.hyperliquid.xyz/evm'] } }
} as const;

export const config = getDefaultConfig({
  appName: 'My App',
  projectId: 'YOUR_PROJECT_ID', // Replace with your WalletConnect ID
  chains: [mainnet, arbitrum, optimism, base, hyperEvm],
});
```

---

## 3. Using the Widget

Import and render the `<HyperGate />` component. You need to pass the user's connected wallet address.

```tsx
import { HyperGate } from '@hypergate/widget';
import { useAccount } from 'wagmi';

export function BridgePage() {
  const { address } = useAccount();

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <HyperGate 
        userAddress={address} 
        className="shadow-xl"
      />
    </div>
  );
}
```

---

## 4. Environment Variables

Create a `.env` file in your project root:

```env
# Required for wallet connection
VITE_WALLET_CONNECT_PROJECT_ID=your_id_here

# Optional: Override RPC URL
VITE_RPC_URL=https://rpc.hyperliquid.xyz/evm

# Optional: Override Contract Addresses (for testing)
# VITE_USDC_ADDRESS=0x...
# VITE_BRIDGE_ADDRESS=0x...
```

---

## 5. Next Steps

- **[Integration Guide](./02-integration-guide.md)**: Deep dive into customization and hooks.
- **[Component API](../api-reference/01-components.md)**: Full props reference.
- **[Development Guide](./03-development.md)**: How to run the demo app locally.

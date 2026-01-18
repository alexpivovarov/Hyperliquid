import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, arbitrum, optimism, base } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

// Define HyperEVM Chain
const hyperEvm = {
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: { name: 'Hype', symbol: 'HYPE', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.hyperliquid.xyz/evm'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://hyperevm.org/explorer' } }
} as const;

const config = getDefaultConfig({
  appName: 'HyperGate SDK Test',
  projectId: 'YOUR_PROJECT_ID', // Replace with valid ID for real usage, or use env var
  chains: [mainnet, arbitrum, optimism, base, hyperEvm],
  ssr: false,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);

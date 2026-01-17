import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { rainbowWallet, metaMaskWallet, coinbaseWallet } from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http, createConnector } from 'wagmi';
import { mock } from 'wagmi/connectors';
import { arbitrum, mainnet, optimism, base } from 'wagmi/chains';
import { defineChain } from 'viem';


export const hyperEvm = defineChain({
    id: 998,
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

// 1. Create a Test Account
// 1. Create a Test Account (Impersonating a specific wealthy address for Demo)
// We use a string address so Wagmi doesn't try to derive it from a private key.
const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // Vitalik.eth

// 2. Setup Connectors
const isDevelopment = import.meta.env.DEV;

const walletGroups = [
    // Only include Development group in dev mode
    ...(isDevelopment ? [{
        groupName: 'Development',
        wallets: [
            () => ({
                id: 'test-wallet',
                name: 'Test Wallet',
                iconUrl: 'https://cdn-icons-png.flaticon.com/512/9187/9187604.png',
                iconBackground: '#e0e0e0',
                installed: true,
                downloadUrls: {
                    android: 'https://example.com',
                    ios: 'https://example.com',
                    qrCode: 'https://example.com',
                },
                extension: {
                    instructions: {
                        learnMoreUrl: 'https://example.com',
                        steps: []
                    }
                },
                createConnector: (walletDetails: any) => {
                    return createConnector((config: any) => ({
                        ...mock({
                            accounts: [TEST_ADDRESS],
                            features: { reconnect: true },
                        })(config),
                        ...walletDetails,
                    }));
                }
            })
        ],
    }] : []),
    {
        groupName: 'Recommended',
        wallets: [rainbowWallet, metaMaskWallet, coinbaseWallet],
    },
];

const connectors = connectorsForWallets(
    walletGroups,
    {
        appName: 'HyperGate Demo',
        projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    }
);

export const config = createConfig({
    connectors,
    chains: [mainnet, arbitrum, optimism, base, hyperEvm],
    transports: {
        [mainnet.id]: http(),
        [arbitrum.id]: http(),
        [optimism.id]: http(),
        [base.id]: http(),
        [hyperEvm.id]: http(),
    },
    ssr: false,
});

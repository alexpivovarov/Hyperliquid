import '@rainbow-me/rainbowkit/styles.css';
import { useState } from 'react';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { config } from './wagmi';
import { HyperGate } from '@hypergate/widget';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { TransactionHistory } from './components/TransactionHistory';
import { ToastContainer, useToast } from './components/Toast';
import './App.css';

const queryClient = new QueryClient();

const DEMO_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as `0x${string}`;

function BridgePage() {
  const { address: connectedAddress } = useAccount();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();

  const activeAddress = isDemoMode ? DEMO_ADDRESS : connectedAddress;

  const handleNotification = (message: string, type: 'success' | 'error' | 'info') => {
    addToast(message, type);
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    addToast('Demo mode activated! Transactions are simulated.', 'info');
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
    addToast('Demo mode exited.', 'info');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4 font-sans">
      <header className="w-full max-w-4xl flex justify-between items-center py-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg"></div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">HyperGate</span>
        </div>
        <div className="flex items-center gap-3">
          {isDemoMode && (
            <button
              onClick={exitDemoMode}
              className="px-3 py-1.5 text-sm bg-purple-600/20 border border-purple-500/50 rounded-lg text-purple-300 hover:bg-purple-600/30 transition-colors"
            >
              Exit Demo
            </button>
          )}
          <ConnectButton />
        </div>
      </header>

      {isDemoMode && (
        <div className="w-full max-w-4xl mb-4">
          <div className="p-3 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-200 text-sm text-center">
            🎮 <b>Demo Mode Active</b> — Transactions are simulated. No real funds required.
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md gap-8 mt-12">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Bridge to Hyperliquid</h1>
          <p className="text-gray-400">One-click atomic deposits to your trading account.</p>
        </div>

        <div className="w-full">
          {activeAddress ? (
            <HyperGate userAddress={activeAddress} />
          ) : (
            <div className="p-8 border border-white/10 rounded-2xl bg-white/5 text-center space-y-4">
              <p className="text-gray-400">Connect your wallet or try the demo.</p>
              <div className="flex flex-col gap-3 items-center">
                <ConnectButton />
                <div className="text-gray-500 text-sm">or</div>
                <button
                  onClick={enterDemoMode}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
                >
                  🎮 Try Demo
                </button>
                <p className="text-gray-500 text-xs">Experience the full flow without a wallet</p>
              </div>
            </div>
          )}
        </div>

        {activeAddress && (
          <div className="w-full mt-4">
            <TransactionHistory
              userAddress={activeAddress}
              onNotification={handleNotification}
            />
          </div>
        )}

        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-200 text-sm max-w-sm text-center">
          ⚠️ <b>Note:</b> Ensure you are bridging {'>'} $5 USDC to avoid protocol burn.
        </div>
      </main>

      <footer className="mt-auto py-8 text-gray-600 text-sm">
        Built for LI.FI Hackathon 2025
      </footer>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <BridgePage />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;

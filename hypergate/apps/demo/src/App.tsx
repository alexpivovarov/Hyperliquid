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
import { Plasma } from './components/Plasma';
import { TechnicalGrid } from './components/TechnicalGrid';
import FuzzyText from './components/FuzzyText';
import ScrollVelocity from './components/ScrollVelocity';
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
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans relative overflow-hidden selection:bg-purple-500/30">

      {/* 1. Background Layer (Complex but subtle) */}
      <div className="fixed inset-0 w-full h-full opacity-60 pointer-events-none z-0">
        <Plasma color="#E4E4E7" speed={0.2} scale={2.5} opacity={0.8} />
      </div>

      {/* 2. Navigation (Floating Dock Style) */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-1.5 bg-[#0E0E10]/80 backdrop-blur-xl border border-white/5 rounded-full shadow-2xl">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse box-shadow-glow"></div>
          <span className="text-[13px] font-bold tracking-tight">HyperGate</span>
          <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded-[4px] text-zinc-500 font-mono">v1.0</span>
        </div>
        <div className="w-px h-4 bg-white/10 mx-1"></div>

        {isDemoMode ? (
          <button
            onClick={exitDemoMode}
            className="px-3 py-1.5 text-[12px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full hover:bg-purple-500/20 transition-all font-mono"
          >
            EXIT SIMULATION
          </button>
        ) : (
          <button
            onClick={enterDemoMode}
            className="px-3 py-1.5 text-[12px] font-medium text-zinc-400 hover:text-white transition-colors font-mono"
          >
            TRY DEMO
          </button>
        )}

        <div className="pl-1">
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
              return (
                <button
                  onClick={mounted && account ? openAccountModal : openConnectModal}
                  className="px-4 py-1.5 bg-white text-black rounded-full text-[13px] font-semibold hover:bg-gray-200 transition-transform active:scale-95"
                >
                  {mounted && account ? account.displayName : "Connect Wallet"}
                </button>
              )
            }}
          </ConnectButton.Custom>
        </div>
      </nav>

      {/* 3. Main Content (Centered Portal Layout) */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">

        {/* Typographic Hero */}
        <div className="text-center mb-8 space-y-4 max-w-2xl relative animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter text-[var(--text-primary)]">
            Bridge to <br className="sm:hidden" /> Hyperliquid.
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
            The instant, safe, institutional-grade onboarding layer. <br />
            <span className="text-[var(--text-tertiary)] font-mono text-xs mt-3 block tracking-widest uppercase">Powered by LI.FI • Zero Loss Guarantee</span>
          </p>
        </div>

        {/* The Portal (Widget Container) */}
        <div className="w-full max-w-[380px] mx-auto">
          <div className="group relative">

            {/* 3. Main Widget Card (White Surface) */}
            <div className="relative bg-white border border-[var(--border-subtle)] rounded-[28px] shadow-[var(--shadow-float)] overflow-hidden transition-all hover:shadow-2xl">
              {activeAddress ? (
                <HyperGate
                  userAddress={activeAddress}
                  theme={{
                    borderRadius: '24px',
                    primaryColor: '#000000',
                    containerMaxWidth: '100%'
                  }}
                />
              ) : (
                <div className="p-8 text-center py-20 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 mx-auto bg-black rounded-[24px] flex items-center justify-center shadow-xl rotate-3 transition-transform hover:rotate-6">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold font-display text-black tracking-tight">Connect to Bridge</h3>
                    <p className="text-[15px] text-[var(--text-secondary)]">Access the Hyperliquid ecosystem securely.</p>
                  </div>

                  <div className="flex justify-center pt-2">
                    <ConnectButton.Custom>
                      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
                        const ready = mounted;
                        const connected = ready && account && chain;
                        return (
                          <div
                            {...(!ready && {
                              'aria-hidden': true,
                              'style': {
                                opacity: 0,
                                pointerEvents: 'none',
                                userSelect: 'none',
                              },
                            })}
                          >
                            {(() => {
                              if (!connected) {
                                return (
                                  <button onClick={openConnectModal} className="h-12 px-8 bg-black text-white rounded-full text-base font-bold transition-all hover:bg-zinc-800 hover:shadow-lg hover:scale-105 active:scale-95 shadow-md">
                                    Connect Wallet
                                  </button>
                                );
                              }
                              return (
                                <button onClick={openAccountModal} className="h-12 px-8 bg-black text-white rounded-full text-base font-bold transition-all hover:bg-zinc-800 shadow-md">
                                  {account.displayName}
                                </button>
                              );
                            })()}
                          </div>
                        );
                      }}
                    </ConnectButton.Custom>
                  </div>

                  <div className="pt-6 border-t border-zinc-100 mt-8">
                    <button
                      onClick={enterDemoMode}
                      className="group flex items-center justify-center gap-2 mx-auto text-xs font-bold text-[var(--text-tertiary)] hover:text-black transition-colors uppercase tracking-widest"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 group-hover:bg-black transition-colors"></span>
                      Initialize Simulation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Ticker / Stats (Minimalist) */}
        <div className="fixed bottom-8 left-0 w-full text-center pointer-events-none hidden sm:block delay-500 animate-in fade-in slide-in-from-bottom-4">
          <div className="inline-flex items-center gap-8 px-8 py-3 bg-white/80 backdrop-blur-md rounded-full border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)] shadow-lg uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              System Operational
            </span>
            <span className="w-px h-3 bg-zinc-200"></span>
            <span className="flex items-center gap-2">
              Gas: <span className="text-black">0.001 GWEI</span>
            </span>
            <span className="w-px h-3 bg-zinc-200"></span>
            <span className="flex items-center gap-2">
              Security: <span className="text-black">MAXIMUM</span>
            </span>
          </div>
        </div>

        {/* Scroll Velocity Strip (Bottom Background) */}
        <div className="fixed bottom-0 left-0 w-full z-0 opacity-[0.03] pointer-events-none select-none mix-blend-multiply overflow-hidden py-4">
          <ScrollVelocity
            texts={['HYPERLIQUID BRIDGE • SECURE • FAST • LOW COST • ']}
            velocity={50}
            className="custom-scroll-text text-black text-[120px] font-black tracking-tighter"
          />
        </div>

        {/* Bottom Right Fuzzy Text (Made With Love) */}
        <div className="fixed bottom-6 right-8 pointer-events-none opacity-50 hover:opacity-100 transition-opacity z-50">
          <FuzzyText
            baseIntensity={0.10}
            hoverIntensity={0.4}
            enableHover={true}
            fontSize="10px"
            color="#000000"
            fontFamily="monospace"
            fontWeight={600}
          >
            MADE WITH L(OVE)(IFI)
          </FuzzyText>
        </div>

      </main>

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

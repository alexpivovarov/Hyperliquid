import '@rainbow-me/rainbowkit/styles.css';
import { useState } from 'react';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { config } from './wagmi';
import { HyperGate } from '@hypergate/widget';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ToastContainer, useToast } from './components/Toast';
import { Plasma } from './components/Plasma';
import { TechnicalGrid } from './components/TechnicalGrid';
import ScrollVelocity from './components/ScrollVelocity';
import './App.css';

const queryClient = new QueryClient();

const DEMO_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as `0x${string}`;

function BridgePage() {
  const { address: connectedAddress } = useAccount();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();

  const activeAddress = isDemoMode ? DEMO_ADDRESS : connectedAddress;

  const enterDemoMode = () => {
    setIsDemoMode(true);
    addToast('Demo mode activated! Transactions are simulated.', 'info');
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
    addToast('Demo mode exited.', 'info');
  };

  return (
    <div className="app-container">
      {/* Background Layer */}
      <div className="background-layer">
        <TechnicalGrid />
        <div className="background-plasma">
          <Plasma color="#E4E4E7" speed={1} scale={1} opacity={1} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="top-navigation hidden">
        <div className="nav-content">
          <div className="nav-brand">
            <div className="nav-indicator"></div>
            <span className="nav-title">HyperGate</span>
            <span className="nav-version">v1.0</span>
          </div>
          <div className="nav-divider"></div>

          {isDemoMode ? (
            <button onClick={exitDemoMode} className="nav-btn nav-btn-demo">
              EXIT SIMULATION
            </button>
          ) : (
            <button onClick={enterDemoMode} className="nav-btn nav-btn-try">
              TRY DEMO
            </button>
          )}

          <div className="nav-connect">
            <ConnectButton.Custom>
              {({ account, openAccountModal, openConnectModal, mounted }) => {
                return (
                  <button
                    onClick={mounted && account ? openAccountModal : openConnectModal}
                    className="nav-btn nav-btn-wallet"
                  >
                    {mounted && account ? account.displayName : "Connect Wallet"}
                  </button>
                )
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </nav>

      {/* SECTION 1: HERO (100vh) */}
      <section className="relative w-full h-screen flex flex-col items-center justify-center p-4 snap-start">
        {/* Typographic Hero */}
        <div className="text-center space-y-4 max-w-4xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-6xl sm:text-[100px] font-black tracking-tighter text-[var(--text-primary)] leading-[0.9] flex flex-col items-center gap-4">
            Bridge to <br />
            <img
              src="/hypergate_logo.svg"
              alt="Hyperliquid"
              className="h-24 sm:h-32 w-auto object-contain"
            />
          </h1>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* SECTION 2: WIDGET (Min 100vh) */}
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center p-4 pb-32 snap-start" id="bridge-section">

        <div className="text-center mb-12 space-y-2">
          <p className="text-[15px] text-[var(--text-secondary)] tracking-wide">
            The instant, safe, institutional-grade onboarding layer.
          </p>
          <p className="text-[11px] text-[var(--text-tertiary)] font-mono uppercase tracking-widest">
            Powered by LI.FI • Zero Loss Guarantee
          </p>
        </div>

        {/* The Portal (Widget Container) */}
        <div className="w-full max-w-[420px] mx-auto relative z-20">
          <div className="group relative">
            <div className="relative bg-white/60 backdrop-blur-2xl border border-white/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] ring-1 ring-white/50">
              {activeAddress ? (
                <HyperGate
                  userAddress={activeAddress}
                  theme={{
                    borderRadius: '16px',
                    primaryColor: '#000000',
                    containerMaxWidth: '100%'
                  }}
                />
              ) : (
                <div className="p-8 text-center py-24 space-y-8">
                  <div className="w-24 h-24 mx-auto bg-black rounded-2xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105 duration-500">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-3xl font-bold font-display text-black tracking-tight">Connect to Bridge</h3>
                    <p className="text-base text-[var(--text-secondary)] px-4">Access the Hyperliquid ecosystem securely with institutional-grade infrastructure.</p>
                  </div>

                  <div className="flex justify-center pt-4">
                    <ConnectButton.Custom>
                      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
                        return (
                          <button
                            onClick={openConnectModal}
                            className="h-14 px-10 bg-black text-white rounded-xl text-lg font-bold transition-all hover:bg-zinc-800 hover:shadow-lg hover:scale-105 active:scale-95 shadow-md flex items-center gap-2"
                          >
                            Connect Wallet
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </button>
                        );
                      }}
                    </ConnectButton.Custom>
                  </div>

                  <div className="pt-6">
                    <button onClick={enterDemoMode} className="text-xs font-bold text-zinc-400 hover:text-black uppercase tracking-widest transition-colors">
                      Initialize Simulation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Fixed Elements */}
      <div className="fixed bottom-0 left-0 w-full z-10 pointer-events-none select-none overflow-hidden bg-gradient-to-t from-white via-white/80 to-transparent backdrop-blur-[2px] pt-12 pb-4">
        <ScrollVelocity
          texts={['HYPERLIQUID BRIDGE', 'SECURE • FAST', 'LOW COST']}
          velocity={30}
          className="text-zinc-950/20 text-sm font-black tracking-[0.2em]"
        />
      </div>

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

import { useEffect, useState, useRef, useCallback } from 'react';
import { LiFiWidget, useWidgetEvents, WidgetEvent } from '@lifi/widget';
import { useBridgeState, type BridgeState } from './stores/useBridgeState';
import { CHAINS, CONTRACTS, LIMITS } from './config/constants';
import { usePublicClient } from 'wagmi';
import { parseAbi } from 'viem';
import { useL1Deposit } from './hooks/useL1Deposit';
import { apiClient } from './services/api';
import { ErrorRecovery } from './components/ErrorRecovery';
import { ProgressSteps } from './components/ProgressSteps';
import { DemoModal } from './components/DemoModal';
import { TransactionOverviewModal } from './components/TransactionOverviewModal';
import './index.css';

// =============================================================================
// Types & Interfaces (Exported for consumers)
// =============================================================================

export interface HyperGateTheme {
    /** Primary accent color (default: #A855F7) */
    primaryColor?: string;
    /** Container border radius (default: 24px) */
    borderRadius?: string;
    /** Container max width (default: 400px) */
    containerMaxWidth?: string;
}

export interface HyperGateCallbacks {
    /** Called when bridge+deposit completes successfully */
    onSuccess?: (data: { txHash: string; amount: string }) => void;
    /** Called when an error occurs */
    onError?: (error: { type: string; message: string }) => void;
    /** Called on every state change */
    onStatusChange?: (status: BridgeState) => void;
}

export interface HyperGateProps {
    /** User's connected wallet address (required) */
    userAddress: string;
    /** Optional theme customization */
    theme?: HyperGateTheme;
    /** Optional callback handlers */
    callbacks?: HyperGateCallbacks;
    /** Show progress indicator (default: true) */
    showProgress?: boolean;
    /** Custom class name for container */
    className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function HyperGate({
    userAddress,
    theme,
    callbacks,
    showProgress = true,
    className = '',
}: HyperGateProps) {
    const { state, setState, setError, setSafetyPayload, safetyPayload, error, reset } = useBridgeState();
    const widgetEvents = useWidgetEvents();
    const { depositToL1, isLoading: isDepositingL1 } = useL1Deposit();
    const publicClient = usePublicClient();

    // Local state
    const [isConfirmingRisk, setIsConfirmingRisk] = useState(false);
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [isVerifyingBalance, setIsVerifyingBalance] = useState(false);
    const [showRetryError, setShowRetryError] = useState(false);
    const depositIdRef = useRef<string | null>(null);
    const lastAmountRef = useRef<bigint | null>(null);
    const lastTxHashRef = useRef<string | null>(null);

    // Theme defaults
    const borderRadius = theme?.borderRadius || '24px';
    const containerMaxWidth = theme?.containerMaxWidth || '400px';

    // Notify parent of state changes
    const notifyStatusChange = useCallback((newState: BridgeState) => {
        callbacks?.onStatusChange?.(newState);
    }, [callbacks]);

    // Wrap setState to also notify callbacks
    const setStateWithCallback = useCallback((newState: BridgeState) => {
        setState(newState);
        notifyStatusChange(newState);
    }, [setState, notifyStatusChange]);

    // Configuration for the LI.FI widget
    // Configuration for the LI.FI widget
    const widgetConfig: any = {
        integrator: 'HyperGate',
        toChain: CHAINS.HYPEREVM.id,
        toToken: CONTRACTS.USDC_HYPEREVM,
        toAddress: userAddress as any,
        hiddenUI: ['toAddress', 'toToken', 'appearance', 'walletMenu', 'poweredBy', 'history'] as any,
        appearance: 'light',
        enableGas: true,
        variant: 'compact', // Use compact mode if available to reduce header bulk
        subvariant: 'default',
        theme: {
            container: {
                borderRadius: '0px', // Let the parent container handle radius
                maxWidth: '100%',
                boxShadow: 'none',
                border: 'none',
                padding: '0px',
            },
            palette: {
                primary: { main: '#000000' },
                secondary: { main: '#F4F4F5' },
                background: { default: '#FFFFFF', paper: '#FFFFFF' },
            },
            shape: {
                borderRadius: 16,
                borderRadiusSecondary: 12,
            },
            typography: {
                fontFamily: 'Plus Jakarta Sans, sans-serif', // Match app font
            },
            components: {
                MuiPaper: {
                    styleOverrides: {
                        root: {
                            boxShadow: 'none',
                            border: 'none',
                        },
                    },
                },
                MuiCard: {
                    styleOverrides: {
                        root: {
                            boxShadow: 'none',
                            border: 'none',
                        },
                    },
                },
            },
        },
    };

    // Stored route to resume after safety check
    const [_pendingRoute, setPendingRoute] = useState<any>(null);

    const handleSafetyCheck = (route: any) => {
        // Parse fee data
        const fromAmountUSD = parseFloat(route.fromAmountUSD || '0');
        const toAmountUSD = parseFloat(route.toAmountUSD || '0');
        const gasCostUSD = parseFloat(route.gasCostUSD || '0');

        // If gasCostUSD is missing, sum up steps
        const totalGasUSD = gasCostUSD > 0 ? gasCostUSD : route.steps.reduce((acc: number, step: any) => {
            return acc + (step.estimate.gasCosts?.reduce((gAcc: number, g: any) => gAcc + parseFloat(g.amountUSD), 0) || 0);
        }, 0);

        const bridgeFeeUSD = fromAmountUSD - toAmountUSD - totalGasUSD; // Rough estimate of spread + fees
        const netAmount = toAmountUSD;

        const isSafe = netAmount >= LIMITS.MINIMUM_DEPOSIT;

        setSafetyPayload({
            inputAmount: fromAmountUSD,
            bridgeFee: Math.max(0, bridgeFeeUSD),
            gasCost: totalGasUSD,
            netAmount: netAmount,
            isSafe: isSafe
        });

        setPendingRoute(route);
        setStateWithCallback('SAFETY_GUARD');
    };

    useEffect(() => {
        const onRouteExecuted = async (route: any) => {

            // SECURITY: Input Validation
            if (!route || typeof route.toAmount !== 'string') {
                console.error('❌ Security: Invalid route data from LI.FI');
                setError('BRIDGE_FAILED');
                callbacks?.onError?.({ type: 'BRIDGE_FAILED', message: 'Invalid route data received' });
                return;
            }

            // SECURITY: Decimal Handling & Overflow Protection
            let amount: bigint;
            try {
                if (!/^\d+$/.test(route.toAmount)) throw new Error('Invalid amount format');
                amount = BigInt(route.toAmount);

                if (parseFloat(route.toAmountUSD) > LIMITS.MAXIMUM_DEPOSIT) {
                    throw new Error('Amount exceeds maximum deposit limit');
                }
            } catch (e) {
                console.error('❌ Security: Amount validation failed', e);
                setError('BRIDGE_FAILED');
                callbacks?.onError?.({ type: 'BRIDGE_FAILED', message: 'Amount validation failed' });
                return;
            }

            // SECURITY: Balance Verification
            try {
                if (!publicClient) throw new Error('No public client available');

                setIsVerifyingBalance(true);
                await new Promise(r => setTimeout(r, 2000));

                const balance = await publicClient.readContract({
                    address: CONTRACTS.USDC_HYPEREVM as `0x${string}`,
                    abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
                    functionName: 'balanceOf',
                    args: [userAddress as `0x${string}`]
                });
                setIsVerifyingBalance(false);

                if (balance < amount) {
                    console.error(`❌ Security: Asset Mismatch. Route says ${amount}, Balance is ${balance}`);
                    if (balance === 0n) {
                        throw new Error('Zero balance detected after bridge.');
                    }
                    console.warn('⚠️ Depositing actual balance instead of route amount');
                    amount = balance;
                }
            } catch (err) {
                setIsVerifyingBalance(false);
                console.error('❌ Security: Balance verification failed:', err);
                setError('BRIDGE_FAILED');
                callbacks?.onError?.({ type: 'BRIDGE_FAILED', message: 'Balance verification failed' });
                return;
            }

            setStateWithCallback('DEPOSITING');
            lastAmountRef.current = amount;

            // Notify backend that bridge completed
            if (depositIdRef.current && route.transactionHash) {
                try {
                    await apiClient.notifyBridgeSuccess(
                        depositIdRef.current,
                        route.transactionHash,
                        amount.toString()
                    );
                } catch (err) {
                    // Non-critical: backend notification failed but bridge succeeded
                }
            }

            try {
                const txHash = await depositToL1(amount);
                lastTxHashRef.current = txHash || null;

                if (depositIdRef.current && txHash) {
                    try {
                        await apiClient.notifyL1Success(
                            depositIdRef.current,
                            txHash,
                            amount.toString()
                        );
                    } catch (err) {
                        // Non-critical: backend notification failed but deposit succeeded
                    }
                }

                setStateWithCallback('SUCCESS');
                callbacks?.onSuccess?.({ txHash: txHash || '', amount: amount.toString() });
            } catch (err) {
                console.error('❌ L1 Deposit Failed:', err);
                setError('DEPOSIT_FAILED');
                callbacks?.onError?.({ type: 'DEPOSIT_FAILED', message: 'L1 deposit transaction failed' });
            }
        };

        const onRouteFailed = (err: any) => {
            console.error('❌ Bridge failed:', err);
            setStateWithCallback('IDLE');
            setError('BRIDGE_FAILED');
            callbacks?.onError?.({ type: 'BRIDGE_FAILED', message: err?.message || 'Bridge transaction failed' });
        };

        const onRouteExecutionStarted = async (route: any) => {
            handleSafetyCheck(route);

            try {
                const response = await apiClient.createDeposit({
                    userAddress,
                    sourceChain: route.fromChainId?.toString() || 'unknown',
                    sourceToken: route.fromToken?.symbol || 'USDC',
                    sourceAmount: route.fromAmount || '0',
                    expectedDestinationAmount: route.toAmount || '0',
                });

                if (response.success && response.data) {
                    depositIdRef.current = response.data.id;
                }
            } catch (err) {
                // Non-critical: deposit record creation failed
            }
        };

        widgetEvents.on(WidgetEvent.RouteExecutionCompleted, onRouteExecuted);
        widgetEvents.on(WidgetEvent.RouteExecutionFailed, onRouteFailed);
        widgetEvents.on(WidgetEvent.RouteExecutionStarted, onRouteExecutionStarted);

        return () => {
            widgetEvents.off(WidgetEvent.RouteExecutionCompleted, onRouteExecuted);
            widgetEvents.off(WidgetEvent.RouteExecutionFailed, onRouteFailed);
            widgetEvents.off(WidgetEvent.RouteExecutionStarted, onRouteExecutionStarted);
        };
    }, [widgetEvents, setStateWithCallback, setError, depositToL1, setSafetyPayload, publicClient, userAddress, callbacks]);

    // Demo Mode Logic
    const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const isDemoMode = userAddress === TEST_ADDRESS;

    const handleDemoSubmit = (inputAmount: number) => {
        setShowDemoModal(false);
        const mockFees = 2.20;
        const mockDestAmount = Math.max(0, inputAmount - mockFees);

        const mockCalculatedRoute = {
            fromAmountUSD: inputAmount.toFixed(2),
            toAmountUSD: mockDestAmount.toFixed(2),
            gasCostUSD: '1.20',
            steps: []
        };
        handleSafetyCheck(mockCalculatedRoute);
    };

    // Error recovery handlers
    const handleRetryBridge = () => {
        reset();
        notifyStatusChange('IDLE');
    };

    const handleRetryDeposit = async () => {
        if (!lastAmountRef.current) {
            if (publicClient) {
                try {
                    const balance = await publicClient.readContract({
                        address: CONTRACTS.USDC_HYPEREVM as `0x${string}`,
                        abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
                        functionName: 'balanceOf',
                        args: [userAddress as `0x${string}`]
                    });
                    if (balance > 0n) {
                        lastAmountRef.current = balance;
                    }
                } catch (err) {
                    // Could not fetch balance for retry
                }
            }
        }

        if (!lastAmountRef.current || lastAmountRef.current === 0n) {
            setShowRetryError(true);
            return;
        }

        setError(null);
        setStateWithCallback('DEPOSITING');

        try {
            const txHash = await depositToL1(lastAmountRef.current);
            lastTxHashRef.current = txHash || null;

            if (depositIdRef.current && txHash) {
                try {
                    await apiClient.notifyL1Success(
                        depositIdRef.current,
                        txHash,
                        lastAmountRef.current.toString()
                    );
                } catch (err) {
                    // Non-critical: backend notification failed
                }
            }

            setStateWithCallback('SUCCESS');
            callbacks?.onSuccess?.({ txHash: txHash || '', amount: lastAmountRef.current.toString() });
        } catch (err) {
            setError('DEPOSIT_FAILED');
            callbacks?.onError?.({ type: 'DEPOSIT_FAILED', message: 'L1 deposit retry failed' });
        }
    };

    const handleCancelError = () => {
        reset();
        notifyStatusChange('IDLE');
    };

    // Resume function called by Safety Guard Modal
    const proceedWithBridge = async () => {
        // User has already confirmed via the "Risk It" → "ARE YOU SURE?" flow if amount is unsafe
        if (isDemoMode) {
            setStateWithCallback('BRIDGING');
            // Simulate bridging time (longer duration for realism)
            await new Promise(r => setTimeout(r, 8000));

            // Use actual values from the safety check or default to demo values
            const amountStr = safetyPayload?.netAmount ? Math.floor(safetyPayload.netAmount * 1000000).toString() : '5000000';

            const mockRoute = {
                toAmount: amountStr,
                toToken: { address: CONTRACTS.USDC_HYPEREVM },
                toAmountUSD: safetyPayload?.netAmount?.toFixed(2) || '5.00'
            };

            setStateWithCallback('DEPOSITING');
            try {
                // Simulate L1 Deposit (longer duration for realism)
                await new Promise(r => setTimeout(r, 4000));

                setStateWithCallback('SUCCESS');
                callbacks?.onSuccess?.({ txHash: 'demo-tx-hash', amount: mockRoute.toAmount });
            } catch (err) {
                setError('DEPOSIT_FAILED');
                callbacks?.onError?.({ type: 'DEPOSIT_FAILED', message: 'Demo deposit failed' });
            }
        } else {
            // Real execution: resumes the UI state while the underlying widget continues
            setStateWithCallback('BRIDGING');
        }
    };

    // Container styles with theme
    const containerStyle = {
        borderRadius,
        maxWidth: containerMaxWidth,
    } as React.CSSProperties;

    return (
        <div
            className={`hypergate-widget-container flex flex-col items-center justify-center w-full mx-auto bg-white p-2 font-sans relative overflow-hidden ${className} ${state === 'BRIDGING' ? 'bridging-mode' : ''}`}
            style={{ ...containerStyle, boxShadow: 'none', border: 'none' }}
        >
            {/* Progress Steps */}
            {showProgress && <ProgressSteps />}

            <div className="w-full h-full text-[var(--text-primary)] relative flex-1">
                {/* Demo Modal */}
                <DemoModal
                    isOpen={showDemoModal}
                    onClose={() => setShowDemoModal(false)}
                    onSubmit={handleDemoSubmit}
                />

                {/* Error Recovery Overlay */}
                {error && (
                    <ErrorRecovery
                        onRetryBridge={handleRetryBridge}
                        onRetryDeposit={handleRetryDeposit}
                        onCancel={handleCancelError}
                    />
                )}

                {/* Balance Verification Loading Overlay */}
                {isVerifyingBalance && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm p-6 fade-in">
                        <svg className="w-12 h-12 animate-spin mb-4 text-black" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <div className="text-lg font-bold mb-1">Verifying Balance</div>
                        <div className="text-sm text-[var(--text-secondary)]">Confirming funds arrived on HyperEVM...</div>
                    </div>
                )}

                {/* Retry Error Modal */}
                {showRetryError && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 text-2xl text-red-500">
                            ✕
                        </div>
                        <div className="text-lg font-bold mb-2">Unable to Retry</div>
                        <div className="text-sm text-[var(--text-secondary)] mb-6 max-w-[280px]">
                            Could not determine deposit amount. Please start a new bridge transaction.
                        </div>
                        <button
                            onClick={() => { setShowRetryError(false); reset(); }}
                            className="px-6 py-2.5 bg-black text-white rounded-[10px] font-medium hover:bg-zinc-800 transition-all active:scale-[0.98]"
                        >
                            Start Over
                        </button>
                    </div>
                )}

                {state === 'SAFETY_GUARD' && safetyPayload && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-start pt-4 bg-white px-6 animate-in fade-in duration-200">

                        <div className="mb-4 flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={safetyPayload.isSafe ? "text-green-600" : "text-amber-500"}>
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"></path>
                                    {safetyPayload.isSafe ? (
                                        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"></path>
                                    ) : (
                                        <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round"></path>
                                    )}
                                </svg>
                                <h3 className="text-lg font-bold font-display text-zinc-900 tracking-tight">Transaction Overview</h3>
                            </div>
                        </div>

                        <div className="w-full max-w-[320px] bg-zinc-50/80 rounded-2xl p-4 mb-4 border border-zinc-100/80 backdrop-blur-sm shadow-sm">
                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-zinc-500 font-medium">Initial Input</span>
                                <span className="font-bold text-zinc-900">${safetyPayload.inputAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-zinc-500 font-medium">Bridge Fee</span>
                                <span className="font-medium text-amber-600">-${safetyPayload.bridgeFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-zinc-500 font-medium">Gas Costs</span>
                                <span className="font-medium text-amber-600">-${safetyPayload.gasCost.toFixed(2)}</span>
                            </div>

                            <div className="h-px bg-zinc-200 w-full my-3"></div>

                            <div className="flex justify-between items-end">
                                <span className="text-zinc-900 font-bold text-base">Net Received</span>
                                <div className="text-right">
                                    <div className={`font-mono font-bold text-lg leading-tight ${safetyPayload.isSafe ? 'text-green-600' : 'text-red-500'}`}>
                                        ${safetyPayload.netAmount.toFixed(2)}
                                    </div>
                                    <div className="text-[10px] text-zinc-400 font-medium">
                                        Min. Required: $5.10
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!safetyPayload.isSafe && (
                            <div className="p-2.5 bg-red-50 border border-red-100 rounded-[10px] text-red-600 text-[11px] text-center mb-4 font-medium max-w-[320px]">
                                Funds will be burned by Hyperliquid protocol if deposited.
                            </div>
                        )}

                        <div className="flex flex-col gap-2.5 w-full max-w-[320px]">
                            <div className="flex gap-2.5 w-full">
                                <button
                                    onClick={() => { setStateWithCallback('IDLE'); setIsConfirmingRisk(false); }}
                                    className="flex-1 py-3 bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 rounded-xl font-bold transition-all active:scale-[0.98] shadow-sm text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (safetyPayload.isSafe) {
                                            proceedWithBridge();
                                        } else {
                                            if (!isConfirmingRisk) {
                                                setIsConfirmingRisk(true);
                                            } else {
                                                setIsConfirmingRisk(false);
                                            }
                                        }
                                    }}
                                    disabled={!safetyPayload.isSafe && isConfirmingRisk}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all shadow-md active:scale-[0.98] text-sm
                                        ${safetyPayload.isSafe
                                            ? 'bg-black text-white hover:bg-zinc-800'
                                            : isConfirmingRisk
                                                ? 'bg-red-50 text-red-300 cursor-not-allowed border border-red-100'
                                                : 'bg-red-600 text-white hover:bg-red-700'
                                        }`}
                                >
                                    {safetyPayload.isSafe ? 'Proceed' : 'Risk It'}
                                </button>
                            </div>

                            {isConfirmingRisk && !safetyPayload.isSafe && (
                                <div className="w-full animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button
                                        onClick={() => proceedWithBridge()}
                                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white transition-colors shadow-lg flex flex-col items-center gap-0.5"
                                    >
                                        <span className="text-sm">I UNDERSTAND THE RISK</span>
                                        <span className="text-[10px] opacity-90 uppercase tracking-wider">Confirm Transaction</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {state === 'IDLE' || state === 'QUOTING' || state === 'BRIDGING' ? (
                    <div className="relative z-10 flex flex-col gap-4">
                        <LiFiWidget config={widgetConfig} integrator="HyperGate" />


                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-8 py-12 text-center animate-in fade-in duration-500">
                        <div className="relative">
                            <div className="absolute inset-0 bg-black/5 rounded-full blur-xl scale-150"></div>
                            <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center text-3xl shadow-xl relative z-10">
                                {state === 'SUCCESS' ?
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    :
                                    <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                }
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-2xl font-bold font-display text-[var(--text-primary)]">
                                {state === 'SUCCESS' ? 'Funds Arrived' : 'Depositing...'}
                            </div>
                            <div className="text-sm text-[var(--text-secondary)] max-w-[280px] mx-auto leading-relaxed">
                                {state === 'SUCCESS'
                                    ? 'Your USDC is now in your Hyperliquid Trading Account. Ready to trade.'
                                    : 'Bridging complete. Now forwarding to your trading account. Please sign the transaction.'}
                            </div>
                        </div>

                        {state === 'DEPOSITING' && isDepositingL1 && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-subtle)] rounded-full text-xs font-medium text-[var(--text-primary)]">
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Waiting for signature...
                            </div>
                        )}

                        {state === 'SUCCESS' && (
                            <div className="flex flex-col gap-3 w-full max-w-[240px]">
                                <button
                                    onClick={() => window.open('https://app.hyperliquid.xyz/trade', '_blank')}
                                    className="w-full px-6 py-3.5 bg-black text-white rounded-[12px] font-bold transition-all hover:bg-zinc-800 shadow-lg active:scale-[0.98]"
                                >
                                    Open Terminal
                                </button>
                                <button
                                    onClick={() => { reset(); notifyStatusChange('IDLE'); }}
                                    className="w-full px-6 py-2 text-[var(--text-tertiary)] hover:text-black text-sm transition-colors font-medium"
                                >
                                    Bridge More
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}


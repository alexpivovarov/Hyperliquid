import { useEffect, useState } from 'react';
import { LiFiWidget, useWidgetEvents, WidgetEvent } from '@lifi/widget';
import { useBridgeState } from './stores/useBridgeState';
import { CHAINS, CONTRACTS } from './config/constants';
import './index.css';

interface HyperGateProps {
    userAddress: string;
}

import { useL1Deposit } from './hooks/useL1Deposit';

export function HyperGate({ userAddress }: HyperGateProps) {
    const { state, setState, setError, setSafetyPayload, safetyPayload } = useBridgeState();
    const widgetEvents = useWidgetEvents();
    const { depositToL1, isLoading: isDepositingL1 } = useL1Deposit();

    // Configuration for the widget
    const widgetConfig: any = {
        integrator: 'HyperGate',
        toChain: CHAINS.HYPEREVM.id,
        toToken: CONTRACTS.USDC_HYPEREVM,
        toAddress: userAddress as any, // Cast to avoid complex type mismatch for now
        hiddenUI: ['toAddress', 'toToken', 'appearance'] as any,
        appearance: 'light',
        enableGas: true, // Gas Refuel
        theme: {
            container: {
                borderRadius: '16px',
                maxWidth: '100%',
                boxShadow: 'none', // We use our own shadow in container
            },
            palette: {
                primary: { main: '#A855F7' },
            },
        },
    };

    // Stored route to resume after safety check
    const [_pendingRoute, setPendingRoute] = useState<any>(null);
    const [isConfirmingRisk, setIsConfirmingRisk] = useState(false);

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

        const isSafe = netAmount >= 5.1;

        setSafetyPayload({
            inputAmount: fromAmountUSD,
            bridgeFee: Math.max(0, bridgeFeeUSD),
            gasCost: totalGasUSD,
            netAmount: netAmount,
            isSafe: isSafe
        });

        setPendingRoute(route);
        setState('SAFETY_GUARD');
    };

    useEffect(() => {
        const onRouteExecuted = async (route: any) => {
            console.log('✅ Step 1 Complete: Funds on HyperEVM', route);
            setState('DEPOSITING');

            try {
                // Auto-trigger deposit (User needs to sign)
                // route.toAmount is usually string. Check LiFi docs. Assuming string.
                const amount = BigInt(route.toAmount);
                await depositToL1(amount);
                setState('SUCCESS');
            } catch (err) {
                console.error('❌ L1 Deposit Failed:', err);
                setError('DEPOSIT_FAILED');
            }
        };

        const onRouteFailed = (error: any) => {
            console.error('❌ Bridge failed:', error);
            setState('IDLE');
            setError('BRIDGE_FAILED');
        };

        const onRouteExecutionStarted = (route: any) => {
            handleSafetyCheck(route);
        };

        widgetEvents.on(WidgetEvent.RouteExecutionCompleted, onRouteExecuted);
        widgetEvents.on(WidgetEvent.RouteExecutionFailed, onRouteFailed);
        widgetEvents.on(WidgetEvent.RouteExecutionStarted, onRouteExecutionStarted);

        return () => {
            widgetEvents.off(WidgetEvent.RouteExecutionCompleted, onRouteExecuted);
            widgetEvents.off(WidgetEvent.RouteExecutionFailed, onRouteFailed);
            widgetEvents.off(WidgetEvent.RouteExecutionStarted, onRouteExecutionStarted);
        };
    }, [widgetEvents, setState, setError, depositToL1, setSafetyPayload]);

    // Demo Mode Logic
    const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const isDemoMode = userAddress === TEST_ADDRESS;

    const navToDemo = async () => {
        const inputStr = prompt("Enter simulated amount (USD):", "7.00");
        if (!inputStr) return;

        const inputAmount = parseFloat(inputStr);
        // Mock calculations (Assuming roughly $2.50 in gas/fees for demo)
        const mockFees = 2.20;
        const mockDestAmount = Math.max(0, inputAmount - mockFees);

        // Simulate a route for the safety guard
        const mockCalculatedRoute = {
            fromAmountUSD: inputAmount.toFixed(2),
            toAmountUSD: mockDestAmount.toFixed(2),
            gasCostUSD: '1.20',
            steps: []
        };
        handleSafetyCheck(mockCalculatedRoute);
        // We pause here. The user must proceed in the modal.
    };

    // Resume function called by Modal
    const proceedWithBridge = async () => {
        if (isDemoMode) {
            setState('BRIDGING');
            await new Promise(r => setTimeout(r, 2000));

            const mockRoute = { toAmount: '5000000', toToken: { address: CONTRACTS.USDC_HYPEREVM } };
            console.log('✅ Demo Step 1 Complete');
            setState('DEPOSITING');
            try {
                await depositToL1(BigInt(mockRoute.toAmount));
                setState('SUCCESS');
            } catch (err) {
                setError('DEPOSIT_FAILED');
            }
        } else {
            // For real mode, we just close the modal. 
            // The wallet popup is likely already open since we can't async block the widget without alert().
            setState('BRIDGING');
        }
    };

    return (
        <div className="hypergate-widget-container flex flex-col items-center justify-center min-h-[500px] w-full max-w-[400px] mx-auto bg-neutral-900/90 backdrop-blur-xl border border-white/10 ring-1 ring-inset ring-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-[24px] p-4 font-sans">
            <div className="w-full h-full text-white relative">

                {state === 'SAFETY_GUARD' && safetyPayload && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className={`text-4xl mb-4 ${safetyPayload.isSafe ? 'text-green-500' : 'text-red-500'}`}>
                            {safetyPayload.isSafe ? '🛡️' : '⚠️'}
                        </div>
                        <h3 className="text-xl font-bold mb-6">Safety Guard Check</h3>

                        <div className="w-full space-y-3 mb-8">
                            <div className="flex justify-between text-gray-400">
                                <span>Input</span>
                                <span>${safetyPayload.inputAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-red-400">
                                <span>Bridge Fee (Est.)</span>
                                <span>-${safetyPayload.bridgeFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-red-400">
                                <span>Gas Cost</span>
                                <span>-${safetyPayload.gasCost.toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-white/10 my-2"></div>
                            <div className={`flex justify-between font-bold text-lg ${safetyPayload.isSafe ? 'text-green-400' : 'text-red-500'}`}>
                                <span>Est. Received</span>
                                <span>${safetyPayload.netAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Minimum Required</span>
                                <span>$5.10</span>
                            </div>
                        </div>

                        {!safetyPayload.isSafe && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-xs text-center mb-6">
                                <b>CRITICAL WARNING:</b> You will receive less than $5. Hyperliquid will <b>BURN</b> this deposit.
                            </div>
                        )}

                        <div className="flex flex-col gap-3 w-full">
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => { setState('IDLE'); setIsConfirmingRisk(false); }}
                                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
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
                                                setIsConfirmingRisk(false); // Toggle off if clicked again? Or keep it? Let's just keep it simple.
                                            }
                                        }
                                    }}
                                    disabled={!safetyPayload.isSafe && isConfirmingRisk}
                                    className={`flex-1 py-3 rounded-xl font-medium transition-all shadow-lg 
                                        ${safetyPayload.isSafe
                                            ? 'bg-green-600 hover:bg-green-500'
                                            : isConfirmingRisk
                                                ? 'bg-red-600/50 grayscale cursor-not-allowed'
                                                : 'bg-red-600 hover:bg-red-500'
                                        }`}
                                >
                                    {safetyPayload.isSafe ? 'Proceed' : 'Risk It'}
                                </button>
                            </div>

                            {isConfirmingRisk && !safetyPayload.isSafe && (
                                <div className="w-full animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="relative">
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[6px] w-3 h-3 bg-red-900 rotate-45 border-l border-t border-red-800"></div>
                                        <button
                                            onClick={() => proceedWithBridge()}
                                            className="w-full py-4 bg-red-900 hover:bg-red-800 border border-red-800 rounded-xl font-bold text-red-100 transition-colors shadow-xl flex flex-col items-center gap-1"
                                        >
                                            <span className="text-lg">ARE YOU SURE?</span>
                                            <span className="text-[10px] font-normal opacity-80">Funds will likely be lost permanently.</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {state === 'IDLE' || state === 'QUOTING' || state === 'BRIDGING' ? (
                    <div className="relative z-10 flex flex-col gap-4">
                        <LiFiWidget config={widgetConfig} integrator="HyperGate" />

                        {isDemoMode && state === 'IDLE' && (
                            <button
                                onClick={navToDemo}
                                className="w-full py-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 rounded-lg text-sm font-semibold hover:bg-yellow-500/30 transition-colors"
                            >
                                ⚡ Simulate Bridge (Demo)
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-6 py-20 text-center animate-in fade-in duration-500">
                        <div className="relative">
                            <div className="absolute inset-0 bg-hyper-primary/20 blur-xl rounded-full"></div>
                            <div className="text-4xl relative z-10">{state === 'SUCCESS' ? '🎉' : '🔄'}</div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                {state === 'SUCCESS' ? 'Funds Arrived!' : 'Depositing to L1...'}
                            </div>
                            <div className="text-sm text-gray-400 max-w-[200px] mx-auto">
                                {state === 'SUCCESS'
                                    ? 'Your USDC is now in your Hyperliquid Trading Account. Ready to trade.'
                                    : 'Bridging complete. Now forwarding to your trading account. Please sign the transaction.'}
                            </div>
                        </div>

                        {state === 'DEPOSITING' && isDepositingL1 && (
                            <div className="text-xs text-hyper-primary animate-pulse">
                                Waiting for signature...
                            </div>
                        )}

                        {state === 'SUCCESS' && (
                            <button
                                onClick={() => window.open('https://app.hyperliquid.xyz/trade', '_blank')}
                                className="px-6 py-3 bg-hyper-primary hover:bg-purple-600 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-purple-900/20"
                            >
                                Open Terminal
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}


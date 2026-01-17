import { useBridgeState } from '../stores/useBridgeState';
import type { ErrorState } from '../stores/useBridgeState';

interface ErrorRecoveryProps {
    onRetryBridge: () => void;
    onRetryDeposit: () => void;
    onCancel: () => void;
}

interface ErrorConfig {
    icon: string;
    title: string;
    description: string;
    primaryAction: {
        label: string;
        onClick: () => void;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    helpText?: string;
}

export function ErrorRecovery({ onRetryBridge, onRetryDeposit, onCancel }: ErrorRecoveryProps) {
    const { error, reset } = useBridgeState();

    if (!error) return null;

    const getErrorConfig = (errorType: ErrorState): ErrorConfig | null => {
        switch (errorType) {
            case 'BRIDGE_FAILED':
                return {
                    icon: '❌',
                    title: 'Bridge Failed',
                    description: 'The transfer couldn\'t complete. Don\'t worry — your funds are still safe in your wallet.',
                    primaryAction: {
                        label: 'Try Again',
                        onClick: () => {
                            reset();
                            onRetryBridge();
                        },
                    },
                    secondaryAction: {
                        label: 'Cancel',
                        onClick: () => {
                            reset();
                            onCancel();
                        },
                    },
                    helpText: 'Common causes: network congestion, price moved too much during transfer, or temporary RPC issues. Usually works on retry.',
                };

            case 'DEPOSIT_FAILED':
                return {
                    icon: '⚠️',
                    title: 'Deposit to Trading Account Failed',
                    description: 'Your USDC arrived on HyperEVM successfully, but we couldn\'t move it to your Hyperliquid trading account.',
                    primaryAction: {
                        label: 'Retry Deposit',
                        onClick: onRetryDeposit,
                    },
                    secondaryAction: {
                        label: 'Start Over',
                        onClick: () => {
                            reset();
                            onCancel();
                        },
                    },
                    helpText: 'Your funds are safe! The USDC is in your HyperEVM wallet. Click "Retry Deposit" to complete the transfer to your trading account.',
                };

            case 'NO_GAS':
                return {
                    icon: '⛽',
                    title: 'Need Gas Tokens',
                    description: 'To complete the deposit, you need a small amount of HYPE (the native token on HyperEVM) to pay for transaction fees.',
                    primaryAction: {
                        label: 'Get Free HYPE',
                        onClick: () => {
                            window.open('https://app.hyperliquid.xyz/drip', '_blank');
                        },
                    },
                    secondaryAction: {
                        label: 'I Have HYPE Now',
                        onClick: onRetryDeposit,
                    },
                    helpText: 'Click "Get Free HYPE" to receive gas tokens from the Hyperliquid faucet. Then come back and click "I Have HYPE Now" to continue.',
                };

            case 'BELOW_MINIMUM':
                return {
                    icon: '🚫',
                    title: 'Amount Below Minimum',
                    description: 'Hyperliquid requires deposits of at least $5.10. Smaller amounts are rejected by the protocol and cannot be recovered.',
                    primaryAction: {
                        label: 'Try a Larger Amount',
                        onClick: () => {
                            reset();
                            onCancel();
                        },
                    },
                    helpText: 'This is a Hyperliquid protocol rule to prevent spam. Bridge $5.10 or more to ensure your deposit goes through.',
                };

            default:
                return null;
        }
    };

    const config = getErrorConfig(error);
    if (!config) return null;

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-5xl mb-4">{config.icon}</div>

            <h3 className="text-xl font-bold mb-2 text-white">{config.title}</h3>

            <p className="text-gray-400 text-sm text-center mb-6 max-w-[280px]">
                {config.description}
            </p>

            {config.helpText && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-xs text-center mb-6 max-w-[280px]">
                    💡 {config.helpText}
                </div>
            )}

            <div className="flex flex-col gap-3 w-full max-w-[280px]">
                <button
                    onClick={config.primaryAction.onClick}
                    className="w-full py-3 bg-hyper-primary hover:bg-purple-600 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-purple-900/20"
                >
                    {config.primaryAction.label}
                </button>

                {config.secondaryAction && (
                    <button
                        onClick={config.secondaryAction.onClick}
                        className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors text-gray-300"
                    >
                        {config.secondaryAction.label}
                    </button>
                )}
            </div>
        </div>
    );
}

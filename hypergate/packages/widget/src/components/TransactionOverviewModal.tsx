

interface TransactionOverviewModalProps {
    safetyPayload: {
        inputAmount: number;
        bridgeFee: number;
        gasCost: number;
        netAmount: number;
        isSafe: boolean;
    };
    isConfirmingRisk: boolean;
    onCancel: () => void;
    onProceed: () => void;
    onToggleRisk: () => void;
}

export function TransactionOverviewModal({
    safetyPayload,
    isConfirmingRisk,
    onCancel,
    onProceed,
    onToggleRisk
}: TransactionOverviewModalProps) {
    return (
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
                        onClick={onCancel}
                        className="flex-1 py-3 bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 rounded-xl font-bold transition-all active:scale-[0.98] shadow-sm text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            if (safetyPayload.isSafe) {
                                onProceed();
                            } else {
                                onToggleRisk();
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
                            onClick={onProceed}
                            className="w-full py-3.5 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white transition-colors shadow-lg flex flex-col items-center gap-0.5"
                        >
                            <span className="text-sm">I UNDERSTAND THE RISK</span>
                            <span className="text-[10px] opacity-90 uppercase tracking-wider">Confirm Transaction</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

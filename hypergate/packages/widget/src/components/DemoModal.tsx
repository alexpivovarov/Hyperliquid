import { useState, useMemo } from 'react';

interface DemoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (amount: number) => void;
}

const MIN_SAFE_AMOUNT = 5.10;
const MAX_AMOUNT = 10000;

export function DemoModal({ isOpen, onClose, onSubmit }: DemoModalProps) {
    const [amount, setAmount] = useState('7.00');

    const validation = useMemo(() => {
        const trimmed = amount.trim();
        if (!trimmed) {
            return { isValid: false, error: null, warning: null };
        }

        const parsed = parseFloat(trimmed);

        if (isNaN(parsed)) {
            return { isValid: false, error: 'Enter a valid number', warning: null };
        }
        if (parsed <= 0) {
            return { isValid: false, error: 'Amount must be greater than 0', warning: null };
        }
        if (parsed > MAX_AMOUNT) {
            return { isValid: false, error: `Maximum demo amount is $${MAX_AMOUNT.toLocaleString()}`, warning: null };
        }
        if (parsed < MIN_SAFE_AMOUNT) {
            return {
                isValid: true,
                error: null,
                warning: `Amounts below $${MIN_SAFE_AMOUNT.toFixed(2)} will trigger a Safety Guard warning`
            };
        }

        return { isValid: true, error: null, warning: null };
    }, [amount]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!validation.isValid) return;
        onSubmit(parseFloat(amount));
    };

    const handleAmountChange = (value: string) => {
        // Allow empty, digits, and single decimal point
        if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
            setAmount(value);
        }
    };

    const presetAmounts = [5, 10, 25, 100];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Demo Bridge</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="text-sm text-gray-400 mb-4">
                    Enter a simulated amount to test the bridge flow without real funds.
                </p>

                {/* Quick Presets */}
                <div className="flex gap-2 mb-4">
                    {presetAmounts.map((preset) => (
                        <button
                            key={preset}
                            onClick={() => setAmount(preset.toString())}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                                ${amount === preset.toString()
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            ${preset}
                        </button>
                    ))}
                </div>

                {/* Custom Amount Input */}
                <div className="relative mb-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder="0.00"
                        className={`w-full pl-8 pr-4 py-4 bg-black/50 border rounded-xl text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                            validation.error ? 'border-red-500/50' : validation.warning ? 'border-yellow-500/50' : 'border-white/10'
                        }`}
                    />
                </div>

                {/* Validation feedback */}
                <div className="h-6 mb-2">
                    {validation.error && (
                        <p className="text-red-400 text-sm">{validation.error}</p>
                    )}
                    {validation.warning && !validation.error && (
                        <p className="text-yellow-400 text-sm">{validation.warning}</p>
                    )}
                </div>

                {/* Info Box */}
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-6">
                    <p className="text-yellow-200 text-xs">
                        <span className="font-semibold">Tip:</span> Try amounts below $5.10 to see the Safety Guard warning for burns.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!validation.isValid}
                        className={`flex-1 py-3 rounded-xl font-medium text-white transition-colors active:scale-[0.98] ${
                            validation.isValid
                                ? 'bg-purple-600 hover:bg-purple-500'
                                : 'bg-purple-600/50 cursor-not-allowed'
                        }`}
                    >
                        Start Demo
                    </button>
                </div>
            </div>
        </div>
    );
}

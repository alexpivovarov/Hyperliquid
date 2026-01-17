import { useBridgeState, type BridgeState } from '../stores/useBridgeState';

interface Step {
    id: string;
    label: string;
    states: BridgeState[];
}

const STEPS: Step[] = [
    { id: 'select', label: 'Select', states: ['IDLE', 'QUOTING'] },
    { id: 'review', label: 'Review', states: ['SAFETY_GUARD'] },
    { id: 'bridge', label: 'Bridge', states: ['BRIDGING'] },
    { id: 'deposit', label: 'Deposit', states: ['DEPOSITING'] },
    { id: 'done', label: 'Done', states: ['SUCCESS'] },
];

function getStepStatus(step: Step, currentState: BridgeState, error: string | null): 'completed' | 'current' | 'upcoming' | 'error' {
    const stepIndex = STEPS.findIndex(s => s.id === step.id);
    const currentStepIndex = STEPS.findIndex(s => s.states.includes(currentState));

    // Check for error in current step
    if (error && step.states.includes(currentState)) {
        return 'error';
    }

    if (stepIndex < currentStepIndex) {
        return 'completed';
    } else if (step.states.includes(currentState)) {
        return 'current';
    }
    return 'upcoming';
}

export function ProgressSteps() {
    const { state, error } = useBridgeState();

    // Don't show progress bar in IDLE state (before user starts)
    if (state === 'IDLE') return null;

    return (
        <div className="w-full px-2 py-3">
            <div className="flex items-center justify-between">
                {STEPS.map((step, index) => {
                    const status = getStepStatus(step, state, error);

                    return (
                        <div key={step.id} className="flex items-center flex-1">
                            {/* Step Circle */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={`
                                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                                        ${status === 'completed' ? 'bg-green-500 text-white' : ''}
                                        ${status === 'current' ? 'bg-purple-600 text-white ring-4 ring-purple-600/30 animate-pulse' : ''}
                                        ${status === 'upcoming' ? 'bg-white/10 text-gray-500' : ''}
                                        ${status === 'error' ? 'bg-red-500 text-white' : ''}
                                    `}
                                >
                                    {status === 'completed' ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : status === 'error' ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                                <span
                                    className={`
                                        mt-1 text-[10px] font-medium transition-colors
                                        ${status === 'completed' ? 'text-green-400' : ''}
                                        ${status === 'current' ? 'text-purple-400' : ''}
                                        ${status === 'upcoming' ? 'text-gray-600' : ''}
                                        ${status === 'error' ? 'text-red-400' : ''}
                                    `}
                                >
                                    {step.label}
                                </span>
                            </div>

                            {/* Connector Line */}
                            {index < STEPS.length - 1 && (
                                <div className="flex-1 mx-1">
                                    <div
                                        className={`
                                            h-0.5 transition-all duration-500
                                            ${status === 'completed' ? 'bg-green-500' : 'bg-white/10'}
                                        `}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

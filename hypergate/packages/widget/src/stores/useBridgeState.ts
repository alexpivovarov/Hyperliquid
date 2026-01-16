import { create } from 'zustand';

export type BridgeState =
    | 'IDLE'           // Initial: User selecting chain/amount
    | 'QUOTING'        // Loading best route from LI.FI
    | 'BRIDGING'       // Step 1: Cross-chain transfer in progress
    | 'DEPOSITING'     // Step 2: EVM -> L1 deposit in progress
    | 'SAFETY_GUARD'   // Interception: Confirmation required
    | 'SUCCESS';       // Funds live in trading account

export type ErrorState =
    | 'BELOW_MINIMUM'  // Amount < $5 (hard block)
    | 'NO_GAS'         // User has 0 HYPE for Step 2
    | 'BRIDGE_FAILED'  // Step 1 failed (show retry)
    | 'DEPOSIT_FAILED' // Step 2 failed (show rescue button)
    | null;

export interface SafetyGuardPayload {
    inputAmount: number;
    bridgeFee: number;
    gasCost: number;
    netAmount: number;
    isSafe: boolean;
}

interface BridgeStore {
    state: BridgeState;
    error: ErrorState;
    safetyPayload: SafetyGuardPayload | null;
    setState: (state: BridgeState) => void;
    setError: (error: ErrorState) => void;
    setSafetyPayload: (payload: SafetyGuardPayload | null) => void;
    reset: () => void;
}

export const useBridgeState = create<BridgeStore>((set) => ({
    state: 'IDLE',
    error: null,
    safetyPayload: null,
    setState: (state) => set({ state }),
    setError: (error) => set({ error }),
    setSafetyPayload: (payload) => set({ safetyPayload: payload }),
    reset: () => set({ state: 'IDLE', error: null, safetyPayload: null }),
}));

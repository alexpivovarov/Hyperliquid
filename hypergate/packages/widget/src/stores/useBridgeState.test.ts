import { describe, it, expect, beforeEach } from 'vitest';
import { useBridgeState, type SafetyGuardPayload } from './useBridgeState';

describe('useBridgeState', () => {
    beforeEach(() => {
        // Reset store before each test
        useBridgeState.getState().reset();
    });

    describe('initial state', () => {
        it('should start with IDLE state', () => {
            expect(useBridgeState.getState().state).toBe('IDLE');
        });

        it('should have no error initially', () => {
            expect(useBridgeState.getState().error).toBeNull();
        });

        it('should have no safety payload initially', () => {
            expect(useBridgeState.getState().safetyPayload).toBeNull();
        });
    });

    describe('setState', () => {
        it('should update state to QUOTING', () => {
            useBridgeState.getState().setState('QUOTING');
            expect(useBridgeState.getState().state).toBe('QUOTING');
        });

        it('should update state to BRIDGING', () => {
            useBridgeState.getState().setState('BRIDGING');
            expect(useBridgeState.getState().state).toBe('BRIDGING');
        });

        it('should update state to DEPOSITING', () => {
            useBridgeState.getState().setState('DEPOSITING');
            expect(useBridgeState.getState().state).toBe('DEPOSITING');
        });

        it('should update state to SAFETY_GUARD', () => {
            useBridgeState.getState().setState('SAFETY_GUARD');
            expect(useBridgeState.getState().state).toBe('SAFETY_GUARD');
        });

        it('should update state to SUCCESS', () => {
            useBridgeState.getState().setState('SUCCESS');
            expect(useBridgeState.getState().state).toBe('SUCCESS');
        });
    });

    describe('setError', () => {
        it('should set BELOW_MINIMUM error', () => {
            useBridgeState.getState().setError('BELOW_MINIMUM');
            expect(useBridgeState.getState().error).toBe('BELOW_MINIMUM');
        });

        it('should set NO_GAS error', () => {
            useBridgeState.getState().setError('NO_GAS');
            expect(useBridgeState.getState().error).toBe('NO_GAS');
        });

        it('should set BRIDGE_FAILED error', () => {
            useBridgeState.getState().setError('BRIDGE_FAILED');
            expect(useBridgeState.getState().error).toBe('BRIDGE_FAILED');
        });

        it('should set DEPOSIT_FAILED error', () => {
            useBridgeState.getState().setError('DEPOSIT_FAILED');
            expect(useBridgeState.getState().error).toBe('DEPOSIT_FAILED');
        });

        it('should clear error with null', () => {
            useBridgeState.getState().setError('BRIDGE_FAILED');
            useBridgeState.getState().setError(null);
            expect(useBridgeState.getState().error).toBeNull();
        });
    });

    describe('setSafetyPayload', () => {
        it('should set safety payload with safe transaction', () => {
            const payload: SafetyGuardPayload = {
                inputAmount: 100,
                bridgeFee: 2,
                gasCost: 1.5,
                netAmount: 96.5,
                isSafe: true,
            };

            useBridgeState.getState().setSafetyPayload(payload);

            expect(useBridgeState.getState().safetyPayload).toEqual(payload);
        });

        it('should set safety payload with unsafe transaction', () => {
            const payload: SafetyGuardPayload = {
                inputAmount: 7,
                bridgeFee: 2,
                gasCost: 1.5,
                netAmount: 3.5,
                isSafe: false,
            };

            useBridgeState.getState().setSafetyPayload(payload);

            expect(useBridgeState.getState().safetyPayload).toEqual(payload);
            expect(useBridgeState.getState().safetyPayload?.isSafe).toBe(false);
        });

        it('should clear safety payload with null', () => {
            const payload: SafetyGuardPayload = {
                inputAmount: 100,
                bridgeFee: 2,
                gasCost: 1.5,
                netAmount: 96.5,
                isSafe: true,
            };

            useBridgeState.getState().setSafetyPayload(payload);
            useBridgeState.getState().setSafetyPayload(null);

            expect(useBridgeState.getState().safetyPayload).toBeNull();
        });
    });

    describe('reset', () => {
        it('should reset all state to initial values', () => {
            // Set various states
            useBridgeState.getState().setState('BRIDGING');
            useBridgeState.getState().setError('BRIDGE_FAILED');
            useBridgeState.getState().setSafetyPayload({
                inputAmount: 100,
                bridgeFee: 2,
                gasCost: 1.5,
                netAmount: 96.5,
                isSafe: true,
            });

            // Reset
            useBridgeState.getState().reset();

            // Verify all reset
            expect(useBridgeState.getState().state).toBe('IDLE');
            expect(useBridgeState.getState().error).toBeNull();
            expect(useBridgeState.getState().safetyPayload).toBeNull();
        });
    });

    describe('state flow simulation', () => {
        it('should handle successful bridge flow', () => {
            const { setState } = useBridgeState.getState();

            // User initiates bridge
            setState('QUOTING');
            expect(useBridgeState.getState().state).toBe('QUOTING');

            // Quote received, safety check
            setState('SAFETY_GUARD');
            expect(useBridgeState.getState().state).toBe('SAFETY_GUARD');

            // User confirms, bridge starts
            setState('BRIDGING');
            expect(useBridgeState.getState().state).toBe('BRIDGING');

            // Bridge complete, depositing
            setState('DEPOSITING');
            expect(useBridgeState.getState().state).toBe('DEPOSITING');

            // Success
            setState('SUCCESS');
            expect(useBridgeState.getState().state).toBe('SUCCESS');
        });

        it('should handle bridge failure flow', () => {
            const { setState, setError } = useBridgeState.getState();

            // Start bridging
            setState('BRIDGING');

            // Bridge fails
            setError('BRIDGE_FAILED');
            setState('IDLE');

            expect(useBridgeState.getState().state).toBe('IDLE');
            expect(useBridgeState.getState().error).toBe('BRIDGE_FAILED');
        });

        it('should handle deposit failure flow', () => {
            const { setState, setError } = useBridgeState.getState();

            // Bridge succeeded, start deposit
            setState('DEPOSITING');

            // Deposit fails
            setError('DEPOSIT_FAILED');

            expect(useBridgeState.getState().state).toBe('DEPOSITING');
            expect(useBridgeState.getState().error).toBe('DEPOSIT_FAILED');
        });
    });
});

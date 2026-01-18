# State Management API Reference

HyperGate uses **Zustand** for global state management within the widget.

## `useBridgeState`

The main store for tracking the transaction lifecycle.

### Import
```typescript
import { useBridgeState } from '../stores/useBridgeState';
```

### State Schema

```typescript
type BridgeState = 
    | 'IDLE'           // Initial state
    | 'QUOTING'        // Fetching route from LI.FI
    | 'BRIDGING'       // Step 1: Source -> HyperEVM
    | 'DEPOSITING'     // Step 2: HyperEVM -> L1
    | 'SAFETY_GUARD'   // Paused: Net amount < $5.10
    | 'AMOUNT_MISMATCH'// Paused: Slippage detected
    | 'SUCCESS';       // Completed
```

### Error Schema
```typescript
type ErrorState =
    | 'BELOW_MINIMUM'  // Hard block: Amount < $5
    | 'NO_GAS'         // User has 0 HYPE
    | 'BRIDGE_FAILED'  // LI.FI step failed
    | 'DEPOSIT_FAILED' // L1 deposit failed
    | null;
```

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `setState` | `(state: BridgeState) => void` | Manually transition state. |
| `setError` | `(error: ErrorState) => void` | Set or clear error. |
| `setSafetyPayload` | `(payload: SafetyGuardPayload) => void` | Update calculations for safety check. |
| `reset` | `() => void` | Reset all state to 'IDLE'. |

### Usage Example

```typescript
const { state, setState, error } = useBridgeState();

// Check if busy
const isBusy = ['BRIDGING', 'DEPOSITING'].includes(state);

// Reset on unmount
useEffect(() => {
    return () => reset();
}, []);
```

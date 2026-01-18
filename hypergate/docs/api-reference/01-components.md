# Component API Reference

## `<HyperGate />`

The primary widget component.

### Import
```tsx
import { HyperGate } from '@hypergate/widget';
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userAddress` | `string` | `undefined` | The connected wallet address (`0x...`). If not provided, the widget will prompt for connection. |
| `className` | `string` | `undefined` | Optional CSS class names to apply to the main container. |

### Example

```tsx
<HyperGate 
  userAddress="0x123..."
  className="my-custom-class"
/>
```

---

## Internal Components

These components are used internally by `HyperGate` but are documented here for contributors.

### `<ProgressSteps />`
Displays the visual timeline of the bridge transaction.
- **Props**: None (uses `useBridgeState` store)
- **States**: Highlights `Bridging` → `Depositing` → `Success`

### `<TransactionOverviewModal />`
The "Safety Guard" modal that appears when a transaction is flagged as risky or needs confirmation.
- **Props**: 
    - `onProceed`: `() => void`
    - `onCancel`: `() => void`
- **Used In**: `HyperGate.tsx` during `SAFETY_GUARD` state.

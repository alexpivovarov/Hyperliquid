# Hooks API Reference

## `useL1Deposit`

A custom hook that handles the logic for the "Step 2" L1 Deposit (HyperEVM → Hyperliquid Trading Account).

### Import
```typescript
import { useL1Deposit } from '../hooks/useL1Deposit';
```

### Signature
```typescript
function useL1Deposit(): {
    depositToL1: (amount: bigint) => Promise<string>;
    isLoading: boolean;
    isSuccess: boolean;
    hash: string | undefined;
}
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `depositToL1` | `(amount: bigint) => Promise<string>` | Async function to execute the deposit. Handles approval + deposit call. Returns Transaction Hash. |
| `isLoading` | `boolean` | `true` if transaction is pending signature or mining. |
| `isSuccess` | `boolean` | `true` after transaction is confirmed. |
| `hash` | `string \| undefined` | The transaction hash of the deposit operation. |

### Logic Flow
1. **Switch Chain**: Ensures user is connected to HyperEVM (Chain 999).
2. **Check Allowance**: Checks `USDC.allowance(user, ASSET_BRIDGE)`.
3. **Approve**: Calls `USDC.approve()` if allowance is insufficient.
4. **Deposit**: Calls `CoreDepositWallet.deposit(amount, 0)`.

### Demo Mode Behavior
If the connected address is the known `TEST_ADDRESS`, this hook:
- Skips all blockchain calls.
- Waits for 4 seconds (simulated delay).
- Returns a fake transaction hash.

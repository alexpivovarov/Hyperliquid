# Integration Guide

This guide covers advanced integration topics, including customization, hooks, and event handling.

---

## The HyperGate Component

The `HyperGate` widget is designed to be a drop-in component that manages its own state while communicating with your application.

### Basic Props

```tsx
interface HyperGateProps {
    /** The user's connected wallet address (0x...) */
    userAddress?: string;
    
    /** Optional CSS class for the container */
    className?: string;
}
```

### Example Usage

```tsx
<HyperGate 
    userAddress="0x123..." 
    className="max-w-[480px] w-full mx-auto"
/>
```

---

## Customizing the Theme

HyperGate uses Tailwind CSS for styling and inherits many styles from your application. However, it also uses CSS variables for specific theme colors.

### CSS Variables

Add these variables to your global CSS (e.g., `index.css`) to customize the widget's appearance:

```css
:root {
  /* Primary Brand Color (Buttons, Highlights) */
  --hypergate-primary: #000000;
  
  /* Background Colors */
  --hypergate-bg: #ffffff;
  --hypergate-bg-subtle: #f5f5f5;
  
  /* Text Colors */
  --hypergate-text: #171717;
  --hypergate-text-secondary: #737373;
  
  /* Borders */
  --hypergate-border: #e5e5e5;
  --hypergate-radius: 16px;
}

/* Dark Mode Example */
.dark {
  --hypergate-primary: #ffffff;
  --hypergate-bg: #171717;
  --hypergate-bg-subtle: #262626;
  --hypergate-text: #ffffff;
  --hypergate-text-secondary: #a3a3a3;
  --hypergate-border: #404040;
}
```

---

## Handling Integration Events

While the widget handles the bridge flow internally, you might want to react to state changes in your app (e.g., to show a global notification or unlock features).

### Accessing Internal State

Currently, state is managed internally via Zustand. To expose this to your parent app, you can use the `useBridgeState` hook if you are inside the same React tree (requires `npm link` or mono-repo setup).

**Pattern for External Apps**:
We recommend listening for successful transactions via Wagmi's `useWatchContractEvent` if you need to track deposits on-chain.

```tsx
import { useWatchContractEvent } from 'wagmi';

// Listen for USDC transfers to the Bridge Contract
useWatchContractEvent({
  address: CONTRACTS.USDC_HYPEREVM,
  abi: ERC20_ABI,
  eventName: 'Transfer',
  onLogs(logs) {
    console.log('New transfer detected!', logs);
  },
});
```

---

## Common Issues & Troubleshooting

### 1. "Chain Not Configured"
**Cause**: The user's wallet doesn't support the requested chain or the chain isn't in your Wagmi config.
**Fix**: Ensure `hyperEvm` (ID 999) is added to your `wagmi.config.ts`.

### 2. "Insufficient Funds for Gas"
**Cause**: User has USDC on HyperEVM but 0 HYPE for the L1 deposit gas.
**Fix**: The widget automatically attempts to swap a small amount of USDC for HYPE (Gas Refuel) via LI.FI during the bridge step. Ensure this option is enabled in LI.FI settings.

### 3. Styles Clashing
**Cause**: Your app's global CSS might override widget styles.
**Fix**: The widget uses unique class names and high-specificity selectors where possible. Wrap the widget in a `div` with `isolation: isolate` if necessary.

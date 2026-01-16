# HyperGate: Real-World "Go Live" Guide

This document explains exactly how to switch HyperGate from "Demo Mode" to a fully functional, real-money bridge connecting to **Hyperliquid (HyperEVM)**.

## 1. The "No Backend" Reality
As established, you do **not** need a server. "Actively Working" simply means:
1.  **Connecting Real Wallets** (MetaMask, Rabby).
2.  **Using Real RPC Endpoints** (Connect to the actual blockchain).
3.  **Targeting Real Contracts** (The actual USDC address).

---

## 2. Configuration Checklist

### A. Disable Demo Mode / Mock Wallet
In `apps/demo/src/wagmi.ts`, you currently have a "Test Wallet" configured.
**To Go Live:**
1.  Remove the `mock` connector.
2.  Ensure `walletConnect` (for mobile) and `injected` (for browser extension) connectors are valid.
3.  Get a **WalletConnect Project ID** from [reown.com](https://reown.com/) (formerly WalletConnect) and paste it into `projectId`.

### B. Add the HyperEVM Network
Your users' wallets need to know how to talk to Hyperliquid's EVM layer.
In `packages/widget/src/config/constants.ts`, update the `CHAINS` configuration:

```typescript
export const HYPEREVM_MAINNET = {
    id: 999, // IMPORTANT: verify this ID on Hyperliquid docs
    name: 'HyperEVM',
    nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.hyperliquid.xyz'] }, // Verify exact URL
    },
    blockExplorers: {
        default: { name: 'HyperLiquid Explorer', url: 'https://scan.hyperliquid.xyz' },
    },
} as const;
```

### C. The "Magic" Addresses (Critical)
The bridge relies on sending USDC to specific addresses. You must verify these are the **Mainnet** addresses:

1.  **USDC on HyperEVM**: The official bridged USDC token contract.
    *   *Where to find:* Hyperliquid official docs / Discord.
2.  **Asset Bridge Precompile**: The special address that listens for transfers and forwards them to L1.
    *   *Where to find:* This is usually a system address like `0x...804` or similar. **If incorrect, funds will be stuck on HyperEVM.**

Update `packages/widget/src/config/constants.ts`:
```typescript
export const CONTRACTS = {
    // REAL MAINNET ADDRESSES
    USDC_HYPEREVM: '0x...', 
    ASSET_BRIDGE: '0x...', // The "Hypervisor" / Precompile
};
```

### D. LI.FI API Key
The demo uses a public/shared integration ID. For production:
1.  Go to [LI.FI Developer Portal](https://li.fi/).
2.  Get an API Key.
3.  Add it to your `WidgetConfig` in `HyperGate.tsx` (ideally proxied, but client-side works for starters).

---

## 3. The Flow: "Real World"
Here is what happens when a real user uses the live widget:

1.  **Connect**: User clicks "Connect Wallet". RainbowKit pops up. They choose **MetaMask**.
2.  **Quote**: They enter "100 USDC" on "Arbitrum".
    *   HyperGate asks LI.FI: "How do I get 100 USDC to HyperEVM?"
    *   LI.FI responds: "Use Stargate/Across to bridge to 0x... (User's address on HyperEVM)".
3.  **Sign (Step 1)**: User approves and signs the transaction on Mainnet Arbitrum.
    *   Funds leave Arbitrum.
    *    ~2 minutes later, USDC arrives in their wallet on **HyperEVM**.
4.  **Auto-Deposit (Step 2)**:
    *   HyperGate (running in their browser) detects the new USDC balance on HyperEVM.
    *   HyperGate prompts: "Funds Arrived! Switch to HyperEVM to deposit."
    *   User switches network.
    *   User signs a **gas-less** (or low gas) transfer of that USDC to the **Asset Bridge Precompile**.
5.  **Success**: Hyperliquid L1 sees the transfer to the precompile and credits their trading account.

## 4. Troubleshooting Real World Issues

*   **"I have no HYPE for gas"**:
    *   HyperEVM requires `HYPE` token for gas.
    *   *Solution*: Your standard `LiFiWidget` configuration should include `enableGas: true`. This asks the bridge to swap a tiny bit of the source token (e.g., $1 of ETH) into `HYPE` during the bridge steps, so the user arrives on HyperEVM with both USDC *and* Gas.

*   **"Transaction Stuck"**:
    *   Since everything is on-chain, you can paste the User's address into the HyperEVM Explorer. If the USDC is there, but not in the trading account, Step 2 failed. The "Rescue UI" we built handles this.

## 5. Final Deployment
1.  `npm run build`
2.  Deploy the `dist` folder to valid HTTPS hosting (Vercel/Netlify).
3.  Test with a small real amount ($10) before marketing.

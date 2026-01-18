# Development Guide

This guide covers how to set up the HyperGate repository locally for contribution or testing.

---

## 🏗️ Monorepo Setup

HyperGate uses **Turborepo** to manage its packages.

### Prerequisites
- Node.js v18+
- pnpm (recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/0-robert/Hyperliquid.git
cd Hyperliquid/hypergate

# Install dependencies
pnpm install
```

---

## 💻 Running Locally

To start the development environment:

```bash
pnpm dev
```

This will start:
1. **`apps/demo`**: The demo application (http://localhost:5173)
2. **`packages/widget`**: The widget in watch mode

### Running Specific Workspaces

```bash
# Run only the demo app
pnpm --filter @hypergate/demo dev

# Run only the widget build
pnpm --filter @hypergate/widget build
```

---

## 🎮 Testing with Demo Mode

The Demo Mode is a powerful feature for testing the UI flow without using real funds or waiting for long bridge times.

### Activating Demo Mode

1. Open the running app (`http://localhost:5173`).
2. Press the **secret trigger**: type `] ] ]` (right bracket 3 times).
3. A toast will appear: **"Demo Mode Activated"**.

### What Changes in Demo Mode?

1. **Mock Wallet**: Disconnects your real wallet and connects a "Test Wallet" with fake balances.
2. **Simulated Delays**:
   - Bridging: 8 seconds (simulated cross-chain time)
   - L1 Deposit: 4 seconds (simulated confirmation)
3. **No Costs**: No gas or assets are spent.

### Mocking Logic (`wagmi.ts`)

The Mock Provider intercepts Ethereum requests:
- `eth_sendTransaction`: Returns a random hash immediately.
- `wallet_switchEthereumChain`: Returns success immediately.
- `eth_balance`: Returns a whale balance.

---

## 🧪 Running Tests

```bash
# Run all tests
pnpm test

# Run tests for widget only
pnpm --filter @hypergate/widget test
```

---

## 📝 Code Style & Linting

We use ESLint and Prettier.

```bash
# Lint check
pnpm lint

# Fix linting
pnpm lint:fix
```

---

## 🚢 Building for Production

```bash
pnpm build
```

The build artifacts will be in:
- `packages/widget/dist/`
- `apps/demo/dist/`

# System Architecture Overview

## Table of Contents

1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Architecture Patterns](#architecture-patterns)
4. [Component Layers](#component-layers)
5. [Data Flow](#data-flow)
6. [Technology Decisions](#technology-decisions)

---

## Introduction

HyperGate is a TypeScript-based cross-chain bridge widget designed to enable atomic deposits from any supported blockchain to Hyperliquid's trading platform. The system follows a **two-step atomic deposit pattern**:

1. **Cross-Chain Bridge** (via LI.FI): Transfer assets from source chain → HyperEVM
2. **L1 Deposit** (via Asset Bridge Precompile): Transfer USDC → Hyperliquid L1 trading account

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                        │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  HyperGate Widget (React Component)                           │ │
│  │  - Wallet connection (RainbowKit)                             │ │
│  │  - Chain/Amount selection                                     │ │
│  │  - Transaction status tracking                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     STATE MANAGEMENT LAYER                          │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  Zustand Store (useBridgeState)                               │ │
│  │  States: IDLE → QUOTING → BRIDGING → DEPOSITING → SUCCESS    │ │
│  │  Errors: BELOW_MINIMUM, NO_GAS, BRIDGE_FAILED, etc.          │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      INTEGRATION LAYER                              │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐│
│  │   LI.FI Widget       │  │   Wagmi + Viem (EVM Integration)     ││
│  │   - Route finding    │  │   - Contract interactions            ││
│  │   - DEX aggregation  │  │   - Chain switching                  ││
│  │   - Bridge execution │  │   - Transaction management           ││
│  └──────────────────────┘  └──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      BLOCKCHAIN LAYER                               │
│  ┌──────────────────┐  ┌────────────────────┐  ┌─────────────────┐│
│  │  Source Chains   │  │    HyperEVM        │  │  Hyperliquid L1 ││
│  │  - Ethereum      │→→│  Chain ID: 998     │→→│  Trading Account││
│  │  - Arbitrum      │  │  USDC Contract     │  │  (Final State)  ││
│  │  - Optimism      │  │  Asset Bridge      │  │                 ││
│  │  - Base          │  │  Precompile        │  │                 ││
│  │  - Solana, Sui   │  │                    │  │                 ││
│  └──────────────────┘  └────────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Patterns

### 1. **Monorepo Pattern** (Turborepo)

```
hypergate/
├── apps/
│   └── demo/              # Standalone demo application
└── packages/
    ├── widget/            # Core HyperGate widget (reusable)
    ├── ui/                # Shared UI components
    ├── eslint-config/     # Shared linting rules
    └── typescript-config/ # Shared TypeScript configs
```

**Benefits**:
- Code sharing across multiple applications
- Consistent tooling and configurations
- Atomic commits across packages
- Efficient build caching with Turborepo

**Dependencies**:
```
apps/demo
  └─> packages/widget (imports HyperGate component)
        └─> packages/ui (imports shared components)
```

---

### 2. **Component-Based Architecture**

**Separation of Concerns**:
- **Presentational Components**: UI rendering (HyperGate.tsx)
- **Container Logic**: Business logic and state (hooks/)
- **State Management**: Global state (stores/)
- **Configuration**: Constants and settings (config/)

---

### 3. **Event-Driven Architecture**

The system relies on **event listeners** to coordinate multi-step transactions:

```typescript
// Event Flow
widgetEvents.on(WidgetEvent.RouteExecutionCompleted, onRouteExecuted);
widgetEvents.on(WidgetEvent.RouteExecutionFailed, onRouteFailed);
widgetEvents.on(WidgetEvent.RouteExecutionStarted, onRouteExecutionStarted);
```

**Event Sources**:
1. **LI.FI Widget**: Emits bridge transaction events
2. **Wagmi Hooks**: Emits wallet/transaction events
3. **User Actions**: Button clicks, form submissions

---

### 4. **State Machine Pattern**

Bridge operations follow a strict state machine:

```
     ┌──────────────────────────────────────────────┐
     │                                              │
     ↓                                              │
  [IDLE] ──selection──> [QUOTING]                  │
                            │                       │
                            ↓                       │
  [SAFETY_GUARD] <──check── [BRIDGING] ──success──> [DEPOSITING]
        │                       │                       │
     confirmed                  │ failure               │
        │                       ↓                       ↓
     proceed              (error state)           [SUCCESS]
                            │                       │
                            └───────────────────────┘
                                 reset()
```

**New States**:
- **SAFETY_GUARD**: Pauses flow if `Net Amount < $5.10` to warn user.
- **AMOUNT_MISMATCH**: Pauses flow if actual bridged amount differs from quote.

**State Guarantees**:
- Exactly one active state at any time
- Deterministic transitions
- Error states can reset to IDLE
- Success state is terminal (requires manual reset)

---

## Component Layers

### Layer 1: Presentation Layer

**Files**:
- `packages/widget/src/HyperGate.tsx` (main component)
- `packages/ui/src/*.tsx` (shared UI components)

**Responsibilities**:
- Render user interface
- Display transaction status
- Show loading states
- Handle user input

**Key Technologies**:
- React 19 with TypeScript
- Tailwind CSS for styling
- RainbowKit for wallet UI

---

### Layer 2: Business Logic Layer

**Files**:
- `packages/widget/src/hooks/useL1Deposit.ts`
- Custom hooks for data fetching and state

**Responsibilities**:
- Execute L1 deposit transactions
- Manage chain switching
- Handle transaction confirmations
- Error handling and retry logic

**Key Technologies**:
- Wagmi hooks (useWriteContract, useSwitchChain)
- Viem for Ethereum utilities
- React hooks for lifecycle management

---

### Layer 3: State Management Layer

**Files**:
- `packages/widget/src/stores/useBridgeState.ts`

**Responsibilities**:
- Global state for bridge flow
- Error state tracking
- State persistence (in-memory)

**Key Technologies**:
- Zustand (lightweight state management)

**State Schema**:
```typescript
interface BridgeStore {
    state: BridgeState;     // Current workflow step
    error: ErrorState;      // Error condition (if any)
    setState: (state: BridgeState) => void;
    setError: (error: ErrorState) => void;
    reset: () => void;
}
```

---

### Layer 4: Integration Layer

**Files**:
- LI.FI Widget (external npm package)
- `apps/demo/src/wagmi.ts` (wallet configuration)

**Responsibilities**:
- Cross-chain route finding
- Bridge protocol selection
- Wallet connection management
- Chain configuration

**Key Technologies**:
- LI.FI SDK and Widget
- Wagmi + Viem
- RainbowKit

---

## Data Flow

### Step 1: User Initiates Bridge

```
User Action (Select Chain + Amount)
        ↓
LI.FI Widget (Find Best Route)
        ↓
State: IDLE → QUOTING
        ↓
Display Route Details (Gas, Time, Fees)
```

---

### Step 2: Execute Cross-Chain Bridge

```
User Signs Transaction on Source Chain
        ↓
State: QUOTING → BRIDGING
        ↓
LI.FI Executes Bridge
        ↓
Event: RouteExecutionStarted
        ↓
Safety Check (Amount >= $5.10)
        ↓
Event: RouteExecutionCompleted
        ↓
State: BRIDGING → DEPOSITING
```

**Data Passed**:
```typescript
route: {
    toAmount: string;       // Amount received on HyperEVM
    toAmountUSD: string;    // USD value
    // ... other metadata
}
```

---

### Step 3: Execute L1 Deposit

```
Parse route.toAmount → BigInt
        ↓
useL1Deposit Hook
        ↓
Check Current Chain (Switch to HyperEVM if needed)
        ↓
Execute: USDC.transfer(ASSET_BRIDGE, amount)
        ↓
Wait for Transaction Confirmation
        ↓
State: DEPOSITING → SUCCESS
```

**Smart Contract Call**:
```typescript
{
    address: CONTRACTS.USDC_HYPEREVM,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [CONTRACTS.ASSET_BRIDGE, amount]
}
```

---

### Step 4: Completion

```
State: SUCCESS
        ↓
Display Success UI
        ↓
User Clicks "Open Terminal"
        ↓
Redirect to app.hyperliquid.xyz
```

---

## Technology Decisions

### Why Turborepo?

**Pros**:
- Incremental builds with intelligent caching
- Task orchestration across packages
- Parallel execution of independent tasks
- Remote caching support (Vercel)

**Use Case**: Perfect for monorepo with shared widget package consumed by multiple apps.

---

### Why Zustand over Redux?

**Pros**:
- Minimal boilerplate (10 lines vs 50+ for Redux)
- No Provider wrapper needed
- TypeScript-first design
- 1.2KB (vs 8KB for Redux)

**Use Case**: Simple state machine with 5 states and 4 error types.

---

### Why Wagmi + Viem over Ethers.js?

**Pros**:
- React hooks-first design
- TypeScript support out of the box
- Tree-shakeable (smaller bundle)
- Modern async/await patterns
- Better multi-chain support

**Use Case**: React application with wallet connections and contract interactions.

---

### Why LI.FI?

**Pros**:
- Aggregates 20+ bridge protocols
- Optimal route finding (cost + speed)
- Battle-tested (handles millions in volume)
- Widget SDK for easy integration

**Use Case**: Cross-chain bridging without building custom bridge infrastructure.

---

### Why Vite over Webpack?

**Pros**:
- 10-100x faster dev server startup
- Native ESM support
- Hot Module Replacement (HMR) in milliseconds
- Optimized production builds with Rollup

**Use Case**: Development speed and modern build pipeline.

---

## Scalability Considerations

### Current Limitations

1. **Single Asset Support**: Only USDC bridging
2. **Client-Side Only**: No backend service for transaction tracking
3. **No Database**: Transaction history not persisted
4. **No Analytics**: No usage metrics or monitoring

### Future Scalability Enhancements

1. **Multi-Asset Support**: Add ETH, USDT, DAI bridging
2. **Backend Service**: Transaction indexer for history
3. **Database**: PostgreSQL for user transaction records
4. **Caching Layer**: Redis for route caching
5. **Monitoring**: Sentry for error tracking, Datadog for metrics

---

## Security Architecture

### Trust Boundaries

```
┌────────────────────────────────────────────────────┐
│  Trusted Zone                                      │
│  - User's browser                                  │
│  - User's wallet                                   │
│  - Local state management                          │
└────────────────────────────────────────────────────┘
                    ↓ HTTPS
┌────────────────────────────────────────────────────┐
│  Semi-Trusted Zone                                 │
│  - LI.FI API (3rd party)                          │
│  - HyperEVM RPC (centralized)                     │
└────────────────────────────────────────────────────┘
                    ↓ Blockchain
┌────────────────────────────────────────────────────┐
│  Trustless Zone                                    │
│  - ERC20 contracts (audited)                      │
│  - Blockchain consensus                            │
└────────────────────────────────────────────────────┘
                    ↓ Precompile
┌────────────────────────────────────────────────────┐
│  Unknown Trust Zone                                │
│  - Asset Bridge Precompile (black box)            │
│  - Hyperliquid L1 (proprietary)                   │
└────────────────────────────────────────────────────┘
```

### Security Mechanisms

1. **Input Validation**: Safety guard for minimum deposits
2. **Chain Verification**: Ensures correct chain before transactions
3. **User Confirmation**: Every transaction requires signature
4. **Error Boundaries**: Graceful error handling
5. **Type Safety**: Strict TypeScript prevents runtime errors

**See [Security Audit](../security/01-audit-report.md) for detailed analysis.**

---

## Performance Characteristics

### Bundle Sizes

| Package | Development | Production (minified) |
|---------|------------|----------------------|
| Widget | ~2.5 MB | ~450 KB (est.) |
| Demo App | ~3 MB | ~550 KB (est.) |
| Shared UI | ~50 KB | ~10 KB |

**Note**: LI.FI Widget is the largest dependency (~300 KB).

### Load Time Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Wallet Connection: < 500ms

### Transaction Throughput

- Step 1 (Bridge): 30s - 5min (depends on source chain)
- Step 2 (L1 Deposit): 3-10s (HyperEVM block time)
- Total: ~1-6 minutes end-to-end

---

## Deployment Architecture

### Frontend Deployment

```
GitHub Repository
        ↓
   GitHub Actions CI/CD
        ↓
   Turborepo Build
        ↓
┌──────────────────────┐
│  Vercel (Production) │
│  - CDN distribution  │
│  - Edge caching      │
│  - Auto-scaling      │
└──────────────────────┘
```

### Multi-Environment Strategy

| Environment | Branch | URL | Purpose |
|------------|--------|-----|---------|
| Development | `dev` | `dev.hypergate.app` | Testing |
| Staging | `staging` | `staging.hypergate.app` | QA |
| Production | `main` | `hypergate.app` | Live |

---

## Monitoring & Observability

### Recommended Tooling

1. **Error Tracking**: Sentry for JavaScript errors
2. **Analytics**: Mixpanel for user behavior
3. **Performance**: Vercel Analytics for Core Web Vitals
4. **Logging**: Console logs (upgrade to structured logging)

### Key Metrics to Track

- Bridge success rate (%)
- Average transaction time (seconds)
- Error rates by type
- User drop-off points in flow
- Gas costs (USD)

---

## Extensibility

### Adding New Chains

1. Update `wagmi.ts` with chain definition
2. Add chain to LI.FI widget config
3. Test bridge routes
4. Deploy

### Adding New Assets

1. Update `constants.ts` with token addresses
2. Modify `useL1Deposit` hook for new token ABI
3. Update UI for multi-asset selection
4. Test transfer logic

### Widget Theming

```typescript
// Custom theme configuration
theme: {
    container: {
        borderRadius: '16px',
        boxShadow: 'custom-shadow',
    },
    palette: {
        primary: { main: '#CustomColor' },
    },
}
```

---

## Conclusion

HyperGate follows a **modular, event-driven architecture** designed for:
- ✅ **Separation of Concerns**: Clear layer boundaries
- ✅ **Type Safety**: TypeScript-first design
- ✅ **Scalability**: Monorepo structure for growth
- ✅ **Developer Experience**: Fast builds with Vite and Turborepo
- ✅ **User Experience**: Smooth two-step atomic deposits

The architecture prioritizes **simplicity** over complexity, choosing proven libraries (Wagmi, LI.FI, Zustand) rather than custom implementations.

---

**Next Steps**: Review [Monorepo Structure](./02-monorepo-structure.md) for detailed package documentation.

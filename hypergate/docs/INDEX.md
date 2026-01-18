# HyperGate Documentation Index

**Version**: 1.0.0
**Last Updated**: 2026-01-18
**Status**: 🟡 Pre-Alpha / Prototype

---

## 📚 Quick Navigation

### For New Users
1. Start with [Overview](./README.md)
2. Read [Architecture Overview](./architecture/01-overview.md)
3. Follow [Getting Started Guide](./guides/01-getting-started.md)

### For Developers
1. [Monorepo Structure](./architecture/02-monorepo-structure.md)
2. [Component API Reference](./api-reference/01-components.md)
3. [Development Guide](./guides/03-development.md)

### For Security Auditors
1. [Security Audit Report](./security/01-audit-report.md)
2. [Known Issues](./security/02-known-issues.md)
3. [Best Practices](./security/03-best-practices.md)

### For DevOps/Deployment
1. [Deployment Guide](./guides/04-deployment.md)
2. [Configuration Reference](./guides/05-configuration.md)

---

## 📖 Complete Documentation Map

```
docs/
│
├── README.md                          # Documentation home
├── INDEX.md                           # This file
│
├── architecture/                      # System Design
│   ├── 01-overview.md                # High-level architecture (Updated with Demo/Safety Guard)
│   ├── 02-monorepo-structure.md      # Project organization
│   ├── 03-data-flow.md               # Transaction flows
│   └── 04-integration-points.md      # External dependencies
│
├── api-reference/                     # API Documentation
│   ├── 01-components.md              # React components
│   ├── 02-hooks.md                   # Custom hooks (New)
│   ├── 03-state-management.md        # Zustand stores & Types (New)
│   └── 04-constants.md               # Configuration & Limits (New)
│
├── security/                          # Security Documentation
│   ├── 01-audit-report.md            # Comprehensive audit
│   ├── 02-known-issues.md            # Current vulnerabilities
│   └── 03-best-practices.md          # Security guidelines
│
├── guides/                            # User Guides
│   ├── 01-getting-started.md         # Quick start (New)
│   ├── 02-integration-guide.md       # How to integrate (New)
│   ├── 03-development.md             # Local development (New)
│   ├── 04-deployment.md              # Production deployment
│   └── 05-configuration.md           # Configuration options (New)
│
└── diagrams/                          # Visual Documentation
    ├── system-architecture.md        # Architecture diagrams
    ├── sequence-diagrams.md          # Flow diagrams
    └── state-machine.md              # State transitions
```

---

## 🎯 Documentation Coverage

### Architecture Documentation
- ✅ System overview and design patterns
- ✅ Monorepo structure and dependencies
- ⏳ Data flow and transaction lifecycle (TODO)
- ⏳ Integration points and external APIs (TODO)

### API Reference
- ✅ Component API (HyperGate, UI components)
- ✅ Hooks API (useL1Deposit)
- ✅ State management (Zustand stores)
- ✅ Constants and configuration

### Security Documentation
- ✅ Comprehensive security audit
- ⏳ Known issues tracking (TODO)
- ⏳ Security best practices (TODO)

### User Guides
- ✅ Getting started guide
- ✅ Integration guide
- ✅ Development setup (including Demo Mode)
- ✅ Deployment guide
- ✅ Configuration reference

### Visual Documentation
- ⏳ System architecture diagrams (TODO)
- ⏳ Sequence diagrams (TODO)
- ⏳ State machine diagrams (TODO)

**Overall Coverage**: ~85% complete

---

## 🔍 Quick Reference Tables

### File Locations

| Component | File Path | Documentation |
|-----------|-----------|---------------|
| HyperGate Widget | `packages/widget/src/HyperGate.tsx` | [API Ref](./api-reference/01-components.md#hypergate-component) |
| L1 Deposit Hook | `packages/widget/src/hooks/useL1Deposit.ts` | [API Ref](./api-reference/02-hooks.md) |
| Bridge State Store | `packages/widget/src/stores/useBridgeState.ts` | [API Ref](./api-reference/03-state-management.md) |
| Constants | `packages/widget/src/config/constants.ts` | [API Ref](./api-reference/04-constants.md) |
| Wagmi Config | `apps/demo/src/wagmi.ts` | [Architecture](./architecture/04-integration-points.md) |

### Key Configuration Values

| Constant | Current Value | Status | Location |
|----------|--------------|--------|----------|
| Chain ID | 999 | ✅ OK | `constants.ts:36` |
| USDC Address | `0...630f` | ✅ Set | `constants.ts:50` |
| Bridge Address | `0...0a24` | ✅ Set | `constants.ts:51` |
| Min Deposit | $5.10 | ✅ OK | `constants.ts:86` |
| RPC URL | `https://rpc.hyperliquid.xyz/evm` | ✅ OK | `constants.ts:38` |

### State Machine Reference

| State | Description | Next States | Error States |
|-------|-------------|-------------|--------------|
| IDLE | Initial state | QUOTING, BRIDGING | BELOW_MINIMUM |
| QUOTING | Fetching route | BRIDGING | BRIDGE_FAILED |
| BRIDGING | Cross-chain transfer | DEPOSITING | BRIDGE_FAILED |
| DEPOSITING | L1 deposit | SUCCESS | DEPOSIT_FAILED, NO_GAS |
| SAFETY_GUARD | Risk confirmation | BRIDGING (via Proceed) | - |
| AMOUNT_MISMATCH | Slippage check | DEPOSITING | - |
| SUCCESS | Completed | (terminal) | - |

**Full Details**: [State Management](./api-reference/03-state-management.md)

---

## 🚀 Common Tasks

### How do I...

**...get started with development?**
1. Read [Getting Started](./guides/01-getting-started.md)
2. Follow [Development Guide](./guides/03-development.md)
3. Review [Monorepo Structure](./architecture/02-monorepo-structure.md)

**...integrate HyperGate into my app?**
1. Read [Integration Guide](./guides/02-integration-guide.md)
2. Review [Component API](./api-reference/01-components.md)
3. Check [Configuration Options](./guides/05-configuration.md)

**...deploy to production?**
1. Complete [Security Checklist](./security/01-audit-report.md#remediation-checklist)
2. Follow [Deployment Guide](./guides/04-deployment.md)
3. Set up [Monitoring](./guides/04-deployment.md#monitoring--logging)

**...fix security issues?**
1. Review [Security Audit](./security/01-audit-report.md)
2. Follow remediation steps for each CVE
3. Run security tests
4. Re-audit after fixes

**...add a new feature?**
1. Understand [Architecture](./architecture/01-overview.md)
2. Review [Development Guide](./guides/03-development.md)
3. Follow code patterns in existing components
4. Add tests and documentation

**...troubleshoot an issue?**
1. Check [Known Issues](./security/02-known-issues.md)
2. Review error logs
3. Search documentation for error message
4. Check GitHub issues

---

## 📊 Project Statistics

### Codebase Metrics
- **Total Packages**: 5 (2 apps, 3 shared packages)
- **Source Files**: 15 TypeScript/TSX files
- **Lines of Code**: ~2,500 (excluding node_modules)
- **Dependencies**: 40+ production, 30+ dev
- **Build Time**: ~15s (first), ~0.3s (cached)

### Documentation Metrics
- **Total Pages**: 14+
- **Words**: ~30,000
- **Code Examples**: 120+
- **Diagrams**: 10+ (planned)

### Security Metrics
- **Security Score**: 8/10
- **Critical Issues**: 0 (5 fixed)
- **High Issues**: 0 (2 fixed)
- **Medium Issues**: 0 (resolved)
- **Low Issues**: 0 (resolved)

---

## 🔄 Documentation Updates

### Recent Changes

**2026-01-18**:
- ✅ Updated Index and README
- ✅ Added Getting Started, Integration, Development, and Configuration guides
- ✅ Added Hook, State, and Constant API references
- ✅ Documented Demo Mode and Safety Guard 2.0

### Upcoming (TODO)

**Medium Priority**:
- [ ] Create data flow diagrams
- [ ] Create sequence diagrams
- [ ] Document integration points
- [ ] Add troubleshooting guide

**Low Priority**:
- [ ] Add more code examples
- [ ] Create video tutorials
- [ ] Add FAQ section
- [ ] Create changelog
- [ ] Add glossary

---

## 🤝 Contributing to Documentation

### Documentation Standards

**Markdown Style**:
- Use ATX-style headers (`#` not `===`)
- Max line length: 100 characters (code blocks exempt)
- Use fenced code blocks with language tags
- Include table of contents for long documents

**Code Examples**:
- Always specify language: ` ```typescript `
- Include comments for complex logic
- Show both good and bad examples where helpful
- Test all code examples before committing

**Structure**:
- Start with overview/summary
- Use hierarchical sections (H1 → H2 → H3)
- Include cross-references to related docs
- Add "Next Steps" at the end

### How to Update Docs

1. **Find the file**: Use this index to locate the correct file
2. **Make changes**: Edit markdown following standards above
3. **Test links**: Verify all internal links work
4. **Update index**: If adding new pages, update this file
5. **Commit**: Use clear commit message (e.g., "docs: add hooks API reference")

---

## 📞 Getting Help

### Documentation Issues

If you find errors, unclear sections, or missing information:
1. Check if issue already exists in [Known Issues](./security/02-known-issues.md)
2. Open GitHub issue with label `documentation`
3. Propose fix via pull request

### Technical Support

For technical questions about HyperGate:
1. Search this documentation first
2. Check GitHub issues
3. Ask in Discord/Telegram (if available)
4. Email: [support contact]

---

## 📄 License

MIT

---

## 🎯 Documentation Goals

### Short-term (Week 1)
- ✅ Core architecture documented
- ✅ Security audit completed
- ✅ Deployment guide written
- ✅ All API references completed
- ✅ Getting started guide written

### Medium-term (Month 1)
- [ ] All guides completed
- [ ] All diagrams created
- [ ] Video tutorials recorded
- [ ] Interactive examples added
- [ ] Documentation site launched

### Long-term (Quarter 1)
- [ ] Multi-language support
- [ ] Versioned documentation
- [ ] API playground
- [ ] Community contributions
- [ ] Regular updates and maintenance

---

**Status**: 🟢 Documentation is stable and mostly complete. Visual diagrams and advanced troubleshooting guides are pending.

**Next Priority**: Create data flow and sequence diagrams.

---

*This index was last updated: 2026-01-18*

# Soroban Liquidity Router - System Architecture

## Executive Summary

The Soroban Liquidity Router is a programmable liquidity and payment-routing infrastructure built on Stellar and Soroban. It abstracts the complexity of discovering and executing efficient routes for moving value between Stellar assets and liquidity sources, enabling applications to specify desired outcomes and execution policies while the router handles path selection, optimization, and execution.

## Design Principles

1. **Outcome-Oriented**: Applications specify what they want, not how to achieve it
2. **Policy-Driven**: Configurable constraints ensure compliance and risk management
3. **Transparent**: All routing decisions, trade-offs, and assumptions are explicit
4. **Reliable**: Comprehensive simulation, validation, and failure handling
5. **Extensible**: Modular architecture supports new liquidity sources without core rewrites
6. **Observable**: Full visibility into routing performance, costs, and failures

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Wallets    │  │   Fintech    │  │     DeFi     │          │
│  │              │  │     Apps     │  │     Apps     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPER INTERFACE                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  TypeScript  │  │   REST API   │  │   Webhooks   │          │
│  │     SDK      │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ROUTING ENGINE CORE                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Route Discovery → Quote Engine → Policy Validation      │  │
│  │       ↓                 ↓                  ↓              │  │
│  │  Path Finding → Cost Calculation → Constraint Checking   │  │
│  │       ↓                 ↓                  ↓              │  │
│  │  Optimization → Selection → Transaction Building          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EXECUTION & SIMULATION LAYER                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Transaction │  │   Soroban    │  │   Failure    │          │
│  │  Simulation  │  │   Contracts  │  │   Handling   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA & INDEXING LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Asset      │  │   Liquidity  │  │    Market    │          │
│  │  Registry    │  │   Indexer    │  │     Data     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            PostgreSQL + Redis Cache                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STELLAR & SOROBAN LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Stellar    │  │   Liquidity  │  │   Soroban    │          │
│  │     DEX      │  │    Pools     │  │   Contracts  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Asset & Liquidity-Source Registries

**Purpose**: Maintain authoritative records of supported assets, issuers, and liquidity sources.

**Responsibilities**:
- Store asset metadata (code, issuer, network, precision, status)
- Track issuer characteristics (authorization flags, clawback, transfer restrictions)
- Register liquidity sources (type, supported markets, endpoints, reliability)
- Maintain allowlists and asset risk indicators
- Version and audit all registry changes

**Data Model**:
```typescript
Asset {
  id: UUID
  code: string
  issuer: string
  network: "mainnet" | "testnet"
  status: "active" | "deprecated" | "restricted"
  decimals: number
  authorization_required: boolean
  clawback_enabled: boolean
  issuer_risks: string[]
  created_at: timestamp
  updated_at: timestamp
}

LiquiditySource {
  id: UUID
  type: "stellar_dex" | "liquidity_pool" | "amm" | "anchor"
  name: string
  supported_assets: UUID[]
  endpoint: string
  contract_id?: string
  fee_model: FeeStructure
  reliability_score: number
  status: "active" | "degraded" | "offline"
  last_checked: timestamp
}
```

### 2. Liquidity Indexing & Market Data

**Purpose**: Continuously collect and normalize liquidity data from Stellar ledger.

**Responsibilities**:
- Stream Stellar ledger events via Horizon
- Index order book depth and spreads
- Track liquidity pool reserves and fees
- Normalize market data across sources
- Detect and flag stale data
- Calculate market depth and price impact

**Data Freshness Strategy**:
- Every market record includes `fetched_at` timestamp
- Configurable staleness thresholds per source type
- Router rejects or downgrades routes using stale data
- Source failures logged and surfaced in route responses

**Schema**:
```typescript
MarketData {
  id: UUID
  source_id: UUID
  asset_in: UUID
  asset_out: UUID
  price: Decimal
  liquidity_depth: Decimal
  spread: Decimal
  volume_24h: Decimal
  price_impact_1k: Decimal
  fetched_at: timestamp
  expires_at: timestamp
}
```

### 3. Route Discovery Engine

**Purpose**: Find all valid paths from input asset to output asset.

**Algorithm**:
1. Build directed graph of asset pairs from liquidity sources
2. Execute breadth-first search with constraints:
   - Maximum hop limit (configurable, default 3)
   - Cycle detection and prevention
   - Asset allowlist enforcement
   - Source reliability thresholds
3. Return ordered list of candidate routes

**Route Representation**:
```typescript
Route {
  id: UUID
  input_asset: UUID
  output_asset: UUID
  steps: RouteStep[]
  hop_count: number
  estimated_duration_ms: number
  data_freshness: timestamp
}

RouteStep {
  step_number: number
  source_id: UUID
  input_asset: UUID
  output_asset: UUID
  input_amount: Decimal
  expected_output: Decimal
  fee: Decimal
  price_impact: Decimal
}
```

**Extension Points**:
- Pluggable liquidity source adapters
- Custom path-filtering logic
- Dynamic hop limit based on amount
- Parallel path discovery

### 4. Quote Engine

**Purpose**: Calculate expected costs, outputs, and risks for each candidate route.

**Calculations**:
- **Expected Output**: Compound output across all hops considering slippage
- **Total Fees**: Sum of protocol fees, liquidity provider fees, gas costs
- **Price Impact**: Aggregate price movement from trade size
- **Effective Rate**: Overall exchange rate after all costs
- **Slippage Estimate**: Expected vs. guaranteed minimum output
- **Execution Risk**: Based on data freshness, source reliability, hop count

**Quote Types**:
- **Indicative**: Informational, may become stale
- **Firm**: Executable within validity window, includes slippage protection

**Schema**:
```typescript
Quote {
  id: UUID
  route_id: UUID
  quote_type: "indicative" | "firm"
  input_amount: Decimal
  expected_output: Decimal
  minimum_output: Decimal
  total_fees: Decimal
  breakdown: FeeBreakdown[]
  estimated_slippage: Decimal
  effective_rate: Decimal
  execution_assumptions: string[]
  data_freshness: timestamp
  valid_until: timestamp
  created_at: timestamp
}

FeeBreakdown {
  fee_type: string
  amount: Decimal
  description: string
}
```

### 5. Route Optimization & Selection

**Purpose**: Rank routes by configurable objectives and select the best match.

**Optimization Objectives**:
- Lowest total cost (fees + slippage)
- Highest expected output
- Minimum price impact
- Fewest hops
- Highest reliability score
- Best data freshness

**Scoring Algorithm**:
```typescript
score = w1 * output_score 
      + w2 * cost_score 
      + w3 * reliability_score 
      + w4 * freshness_score
      - penalties
```

**Configurable Weights**: Applications can specify preference weights.

**Transparency**: Response includes score breakdown and trade-off explanation.

### 6. Programmable Routing Policies

**Purpose**: Enforce application-specific constraints and compliance requirements.

**Policy Categories**:
1. **Asset Policies**
   - Approved asset allowlist
   - Issuer allowlist
   - Asset risk tolerance
   
2. **Execution Policies**
   - Maximum slippage tolerance
   - Maximum execution cost
   - Minimum expected output
   - Maximum hops
   
3. **Liquidity Policies**
   - Approved source allowlist
   - Minimum liquidity depth
   - Maximum price impact
   
4. **Timing Policies**
   - Quote validity period
   - Maximum data staleness
   - Execution timeout

**Policy Evaluation**:
- Policies evaluated before route selection
- Policy violations prevent execution
- Violation reasons returned in machine-readable format
- Policy compliance logged for audit

**Schema**:
```typescript
RoutingPolicy {
  id: UUID
  application_id: UUID
  name: string
  constraints: PolicyConstraint[]
  optimization_preferences: OptimizationWeights
  active: boolean
  created_at: timestamp
  updated_at: timestamp
}

PolicyConstraint {
  type: string
  operator: "eq" | "lt" | "lte" | "gt" | "gte" | "in" | "not_in"
  value: any
  required: boolean
}
```

### 7. Soroban Smart Contracts

**Purpose**: On-chain execution logic for atomic multi-hop swaps with protections.

**Contracts**:
1. **Router Contract**: Orchestrates multi-hop execution
2. **Path Executor**: Executes individual swap steps
3. **Slippage Guard**: Enforces minimum output requirements

**Key Features**:
- Atomic execution (all-or-nothing)
- Minimum output enforcement
- Deadline protection
- Gas optimization
- Pausable for emergency

**Contract Interface**:
```rust
// Pseudocode
pub fn execute_route(
    env: Env,
    sender: Address,
    route: Vec<SwapStep>,
    input_amount: i128,
    minimum_output: i128,
    deadline: u64
) -> Result<ExecutionResult, Error>
```

### 8. Transaction Simulation & Execution

**Purpose**: Validate and execute routes safely with comprehensive pre-flight checks.

**Simulation Phase**:
1. Construct transaction from route
2. Simulate via Stellar/Soroban RPC
3. Check for:
   - Insufficient balance
   - Missing authorization
   - Invalid asset paths
   - Excessive slippage
   - Policy violations
   - Expired quotes

**Execution Phase**:
1. Re-validate conditions immediately before submission
2. Sign transaction with appropriate keys
3. Submit to Stellar network
4. Monitor confirmation status
5. Record actual vs. expected outcomes
6. Update analytics and metrics

**Execution Result**:
```typescript
ExecutionResult {
  transaction_id: string
  status: "submitted" | "confirmed" | "failed" | "timeout"
  route_id: UUID
  quote_id: UUID
  expected_output: Decimal
  actual_output?: Decimal
  total_fees: Decimal
  slippage: Decimal
  execution_time_ms: number
  failure_reason?: string
  failure_classification?: FailureType
  can_retry: boolean
  fallback_available: boolean
  created_at: timestamp
}
```

### 9. Failure Handling & Retry Logic

**Purpose**: Safely recover from failures without duplicating operations.

**Failure Classification**:
- **Transient**: Network issues, temporary source outage → Safe to retry
- **Invalid**: Bad parameters, unsupported assets → Cannot retry
- **Economic**: Slippage exceeded, insufficient liquidity → Retry with new quote
- **Authorization**: Missing permissions → Requires manual intervention
- **Partial**: Some steps succeeded → Unsafe to retry without reconciliation

**Retry Strategy**:
```typescript
if (failure.type === "transient" && !execution.partial && retry_count < 3) {
  // Safe to retry with same transaction
  retry_with_backoff()
} else if (failure.type === "economic") {
  // Evaluate fallback route
  if (fallback_route && fallback_route.satisfies(policy)) {
    execute_fallback()
  }
}
```

**Idempotency**:
- Every execution request includes `idempotency_key`
- Duplicate keys return cached result
- Keys expire after 24 hours

### 10. Analytics & Observability

**Purpose**: Provide operators and developers with actionable insights.

**Key Metrics**:
- Route volume and value
- Execution success rate
- Average slippage (expected vs. actual)
- Average execution cost
- Liquidity utilization by source
- Route performance by asset pair
- Failure distribution by type
- Data freshness violations
- Policy enforcement events

**Dashboard Views**:
1. **Operations Dashboard**: Real-time routing activity
2. **Performance Dashboard**: Costs, slippage, execution times
3. **Reliability Dashboard**: Failure rates, source health
4. **Policy Dashboard**: Constraint violations, compliance

**Alerting**:
- Source degradation or offline
- Unusual slippage patterns
- Execution failure spikes
- Stale data warnings

## Data Flow: End-to-End Routing

```
1. Application Request
   ↓
2. Policy Retrieval & Validation
   ↓
3. Asset & Source Registry Lookup
   ↓
4. Route Discovery (graph traversal)
   ↓
5. Market Data Retrieval (PostgreSQL + Redis)
   ↓
6. Quote Calculation (all candidate routes)
   ↓
7. Policy Constraint Evaluation
   ↓
8. Route Optimization & Selection
   ↓
9. Transaction Construction
   ↓
10. Pre-Execution Simulation
   ↓
11. Final Validation
   ↓
12. Transaction Signing & Submission
   ↓
13. Status Monitoring
   ↓
14. Result Recording & Analytics Update
   ↓
15. Response to Application
```

## Security Architecture

### Trust Boundaries

1. **Application → API**: Authenticated via API keys, rate limited
2. **API → Routing Engine**: Internal, trusted
3. **Routing Engine → Soroban**: Transaction signing isolated
4. **Indexer → Stellar**: Read-only, validate data integrity
5. **Admin → Configuration**: Strong authentication, audit logged

### Security Controls

**Authentication & Authorization**:
- Scoped API keys (read-only, execute, admin)
- Application-specific policies
- IP allowlisting for sensitive operations
- Webhook signature verification

**Data Protection**:
- No private keys in application memory
- Signing keys in HSM or secure key management
- Secrets in environment variables, never in code
- Audit logs immutable and tamper-evident

**Rate Limiting**:
- Per-key request limits
- Execution value limits
- Concurrent request limits
- Adaptive throttling under load

**Input Validation**:
- Schema validation on all API inputs
- Asset and issuer allowlist enforcement
- Amount bounds checking
- Policy schema validation

**Audit Logging**:
- All quotes, simulations, executions logged
- Policy decisions recorded
- Administrative actions logged
- Failed authentications tracked

### Threat Model

**Threats Addressed**:
- Malicious liquidity sources providing false data
- Stale data leading to unfavorable execution
- Front-running via quote leak
- Duplicate execution via replay
- Policy bypass attempts
- Unauthorized asset/issuer usage
- Excessive slippage exploitation

**Residual Risks**:
- Issuer-level asset risks (clawback, freeze)
- Smart contract vulnerabilities (requires audit)
- Stellar network congestion or outage
- Oracle manipulation in extreme market conditions
- Cross-source price arbitrage during indexing delay

## Technology Stack

**Backend**:
- Runtime: Node.js 20 LTS
- Language: TypeScript 5.x
- Framework: Express.js
- Database: PostgreSQL 16
- Cache: Redis 7
- ORM: Prisma

**Blockchain**:
- Network: Stellar (Mainnet, Testnet)
- Smart Contracts: Rust (Soroban)
- SDK: Stellar SDK for JavaScript

**Frontend**:
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Charts: Recharts
- State: React Query

**Infrastructure**:
- Containerization: Docker
- CI/CD: GitHub Actions
- Monitoring: Prometheus + Grafana
- Logging: Winston + Elasticsearch
- Testing: Jest, Playwright

## Deployment Architecture

**Production Environment**:
```
┌─────────────────────────────────────────────────────┐
│                   Load Balancer                      │
└─────────────────┬───────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐  ┌───────▼────────┐
│   API Server   │  │   API Server   │
│   (Replicas)   │  │   (Replicas)   │
└───────┬────────┘  └───────┬────────┘
        │                   │
        └─────────┬─────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐  ┌───────▼────────┐
│   PostgreSQL   │  │     Redis      │
│   (Primary +   │  │   (Cluster)    │
│    Replica)    │  │                │
└────────────────┘  └────────────────┘

┌─────────────────────────────────────────────────────┐
│            Background Workers                        │
│  ┌───────────────┐  ┌───────────────┐              │
│  │   Liquidity   │  │   Analytics   │              │
│  │    Indexer    │  │   Processor   │              │
│  └───────────────┘  └───────────────┘              │
└─────────────────────────────────────────────────────┘
```

## Extension Points for Future Phases

**Phase 6 Readiness**:
1. **Anchor Integration**:
   - Adapter interface for SEP-24, SEP-31
   - Fiat on/off ramp support
   - KYC/AML provider integration

2. **Cross-Border Payments**:
   - Currency corridor optimization
   - Settlement time estimation
   - Regulatory compliance checks

3. **Multi-Chain Routing**:
   - Bridge adapter interface
   - Cross-chain liquidity aggregation
   - Atomic swap coordination

**Adapter Pattern**:
All liquidity sources implement common interface:
```typescript
interface LiquiditySourceAdapter {
  getMarketData(assetIn, assetOut): Promise<MarketData>
  buildSwapStep(params): Promise<SwapStep>
  simulateSwap(step): Promise<SimulationResult>
}
```

## Performance Targets

- Quote generation: < 500ms (p95)
- Route discovery: < 1s for 3-hop maximum
- Transaction simulation: < 2s
- API response time: < 1s (p95)
- Indexer lag: < 5 seconds behind ledger
- Cache hit rate: > 80% for market data

## Monitoring & Alerting

**Critical Alerts**:
- Indexer lag > 30 seconds
- Execution failure rate > 5%
- Any liquidity source offline > 5 minutes
- Database connection pool exhaustion
- API error rate > 1%

**Metrics Collection**:
- Request/response metrics (latency, status)
- Route metrics (hops, costs, slippage)
- Execution metrics (success, failure, retry)
- Resource metrics (CPU, memory, connections)
- Business metrics (volume, value, users)

## Compliance & Audit

**Audit Trail Requirements**:
- Immutable log of all executions
- Policy decisions with reasoning
- Quote snapshots at execution time
- Asset and source registry changes
- Administrative actions

**Data Retention**:
- Transaction logs: 7 years
- Audit logs: 7 years
- Market data: 90 days
- Analytics: 2 years

## Development Workflow

1. Feature branches from `main`
2. CI runs tests, linting, security scans
3. PR review required for merge
4. Auto-deploy to testnet on merge
5. Manual promotion to mainnet
6. Rollback capability with database migrations

## Testing Strategy

**Unit Tests**: Business logic, calculations, policy evaluation  
**Integration Tests**: API endpoints, database operations, Stellar SDK  
**Contract Tests**: Soroban contract behavior, edge cases  
**End-to-End Tests**: Full routing flow on testnet  
**Load Tests**: Performance under concurrent requests  
**Security Tests**: Authentication, authorization, input validation  

**Coverage Target**: > 80% for critical paths

## Success Criteria

The MVP is complete when:
1. ✅ Direct and multi-hop routes discovered and quoted
2. ✅ Policies enforced before execution
3. ✅ Transactions simulated and executed on testnet
4. ✅ Failures classified and handled appropriately
5. ✅ API and SDK functional with authentication
6. ✅ Dashboard displays real-time metrics
7. ✅ Documentation and examples available
8. ✅ Automated tests passing with >80% coverage
9. ✅ Docker environment running locally
10. ✅ CI/CD pipeline deploying to testnet

---

**Version**: 1.0.0  
**Last Updated**: 2026-09-16  
**Status**: Architecture Approved

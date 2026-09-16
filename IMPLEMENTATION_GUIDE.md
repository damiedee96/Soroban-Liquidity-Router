# Soroban Liquidity Router - Implementation Guide

This guide provides step-by-step instructions for implementing the remaining components of the MVP.

---

## Current State Summary

### ✅ Foundation Complete (20% Progress)

**What's Built:**
1. **Complete Architecture** - System design, security model, data flows documented
2. **Project Infrastructure** - Monorepo, TypeScript, Docker, CI/CD pipeline configured  
3. **Type System** - All domain types defined (assets, routes, quotes, policies, execution)
4. **Database Schema** - Complete Prisma models with 30+ tables
5. **Core Registries** - Asset and liquidity source management services
6. **Utilities** - Logging, validation, financial calculations, Stellar helpers

**What's Ready to Use:**
- Database with seed data (XLM, USDC, EURC, BTC on testnet)
- Asset registration and search
- Liquidity source health monitoring
- Calculation utilities for fees, slippage, price impact
- Type-safe development environment

---

## Implementation Order

### Phase 1: Core Routing Engine (Days 1-7)

#### Day 1-2: Market Data Service

**File**: `packages/routing-engine/src/services/MarketDataService.ts`

```typescript
import { prisma } from '@soroban-router/database';
import { MarketData, AggregatedLiquidity } from '@soroban-router/types';
import { createLogger } from '@soroban-router/utils';

export class MarketDataService {
  private readonly logger = createLogger('MarketDataService');
  private readonly stalenessThreshold = 30; // seconds

  async fetchLatestMarketData(
    sourceId: string,
    assetInId: string,
    assetOutId: string
  ): Promise<MarketData | null> {
    const data = await prisma.marketData.findFirst({
      where: { sourceId, assetInId, assetOutId },
      orderBy: { fetchedAt: 'desc' },
    });

    if (!data) return null;

    // Check freshness
    const age = (Date.now() - data.fetchedAt.getTime()) / 1000;
    if (age > this.stalenessThreshold) {
      this.logger.warn('Market data is stale', { sourceId, age });
    }

    return data as MarketData;
  }

  async getAvailableMarketData(
    assetInId: string,
    assetOutId: string
  ): Promise<MarketData[]> {
    const cutoff = new Date(Date.now() - this.stalenessThreshold * 1000);
    
    return prisma.marketData.findMany({
      where: {
        assetInId,
        assetOutId,
        fetchedAt: { gte: cutoff },
      },
      include: { source: true },
    }) as any;
  }

  async aggregateLiquidity(
    assetInId: string,
    assetOutId: string
  ): Promise<AggregatedLiquidity> {
    const marketData = await this.getAvailableMarketData(assetInId, assetOutId);
    
    // Aggregate total liquidity and calculate weighted average price
    // Implementation details...
    
    return {
      assetIn: assetInId,
      assetOut: assetOutId,
      totalLiquidity: '0',
      sources: [],
      averagePrice: '0',
      weightedAveragePrice: '0',
      calculatedAt: new Date().toISOString(),
    };
  }

  async updateMarketData(data: any): Promise<void> {
    // Store or update market data
    await prisma.marketData.upsert({
      where: { id: data.id || 'new' },
      create: data,
      update: data,
    });
  }
}
```

**Key Points:**
- Check data freshness before returning
- Support multiple sources for same pair
- Log stale data warnings
- Implement aggregation logic

#### Day 3-4: Route Discovery Engine

**File**: `packages/routing-engine/src/services/RouteDiscoveryService.ts`

**Core Algorithm:**
```typescript
export class RouteDiscoveryService {
  async discoverRoutes(request: RouteDiscoveryRequest): Promise<Route[]> {
    // 1. Build liquidity graph from available sources
    const graph = await this.buildLiquidityGraph();
    
    // 2. Find all paths (BFS with cycle detection)
    const paths = this.findPaths(
      graph,
      request.inputAsset,
      request.outputAsset,
      request.maxHops || 3
    );
    
    // 3. Convert paths to routes with market data
    const routes = await Promise.all(
      paths.map(path => this.pathToRoute(path, request.inputAmount))
    );
    
    // 4. Filter valid routes
    return routes.filter(route => this.isValidRoute(route));
  }

  private findPaths(
    graph: Map<string, Set<string>>,
    start: string,
    end: string,
    maxHops: number
  ): string[][] {
    const paths: string[][] = [];
    const queue: { node: string; path: string[] }[] = [{ node: start, path: [start] }];
    
    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      
      if (node === end) {
        paths.push(path);
        continue;
      }
      
      if (path.length >= maxHops + 1) continue;
      
      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!path.includes(neighbor)) { // Cycle prevention
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }
    
    return paths;
  }
}
```

#### Day 5: Quote Engine

**File**: `packages/routing-engine/src/services/QuoteService.ts`

```typescript
export class QuoteService {
  async generateQuote(routeId: string, params: QuoteRequest): Promise<Quote> {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: { steps: true },
    });

    if (!route) throw new NotFoundError('Route', routeId);

    // Calculate expected output through all steps
    const expectedOutput = await this.calculateExpectedOutput(route);
    
    // Calculate total fees
    const totalFees = await this.calculateTotalFees(route);
    
    // Calculate slippage estimate
    const estimatedSlippage = this.calculateSlippage(route);
    
    // Calculate minimum output with slippage tolerance
    const minimumOutput = this.calculateMinimumOutput(
      expectedOutput,
      params.maxSlippage || '0.01'
    );

    // Create quote
    return prisma.quote.create({
      data: {
        routeId,
        quoteType: params.quoteType || 'FIRM',
        // ... other fields
        validUntil: new Date(Date.now() + 60000), // 1 minute
      },
    }) as any;
  }
}
```

#### Day 6: Route Optimization

**File**: `packages/routing-engine/src/services/RouteOptimizationService.ts`

```typescript
export class RouteOptimizationService {
  selectOptimalRoute(
    routes: Route[],
    preferences: OptimizationPreferences
  ): Route {
    const scores = routes.map(route => ({
      route,
      score: this.calculateScore(route, preferences),
    }));

    scores.sort((a, b) => b.score - a.score);
    return scores[0]!.route;
  }

  private calculateScore(
    route: Route,
    preferences: OptimizationPreferences
  ): number {
    const weights = preferences.weights || {
      output: 0.4,
      cost: 0.3,
      reliability: 0.2,
      freshness: 0.1,
    };

    // Normalize and weight each factor
    return (
      weights.output * this.scoreOutput(route) +
      weights.cost * this.scoreCost(route) +
      weights.reliability * this.scoreReliability(route) +
      weights.freshness * this.scoreFreshness(route)
    );
  }
}
```

#### Day 7: Policy Service

**File**: `packages/routing-engine/src/services/PolicyService.ts`

```typescript
export class PolicyService {
  async evaluatePolicy(
    policyId: string,
    route: Route,
    quote: Quote
  ): Promise<PolicyEvaluation> {
    const policy = await prisma.routingPolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy) throw new NotFoundError('Policy', policyId);

    const violations: PolicyViolation[] = [];

    // Check asset constraints
    await this.checkAssetConstraints(route, policy, violations);
    
    // Check execution constraints
    this.checkExecutionConstraints(quote, policy, violations);
    
    // Check liquidity constraints
    await this.checkLiquidityConstraints(route, policy, violations);

    return {
      policyId,
      compliant: violations.length === 0,
      violations: violations as any,
      warnings: [],
      evaluatedAt: new Date().toISOString(),
    };
  }
}
```

---

### Phase 2: API & Execution (Days 8-14)

#### Day 8-9: REST API

**File**: `apps/api/src/index.ts`

**Setup:**
```bash
cd apps/api
npm init -y
npm install express @types/express cors helmet morgan
```

**Basic Structure:**
```typescript
import express from 'express';
import { AssetRegistry, RouteDiscoveryService, QuoteService } from '@soroban-router/routing-engine';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

// Middleware
app.use(authenticationMiddleware);
app.use(rateLimitMiddleware);

// Routes
app.get('/api/v1/assets', async (req, res) => {
  const registry = new AssetRegistry();
  const result = await registry.listAssets(req.query);
  res.json({ success: true, data: result.data, pagination: result.pagination });
});

app.post('/api/v1/routes/discover', async (req, res) => {
  const service = new RouteDiscoveryService();
  const routes = await service.discoverRoutes(req.body);
  res.json({ success: true, data: routes });
});

// ... other endpoints

app.listen(3000, () => console.log('API running on port 3000'));
```

#### Day 10-11: Execution Service

**File**: `packages/routing-engine/src/services/ExecutionService.ts`

```typescript
import { Server, Keypair, Transaction } from '@stellar/stellar-sdk';

export class ExecutionService {
  private readonly server: Server;

  constructor(horizonUrl: string) {
    this.server = new Server(horizonUrl);
  }

  async simulateTransaction(quoteId: string): Promise<SimulationResult> {
    const quote = await this.getQuote(quoteId);
    const tx = await this.buildTransaction(quote);
    
    try {
      const simulation = await this.server.simulateTransaction(tx);
      return {
        success: true,
        expectedOutput: quote.expectedOutput,
        checks: [{ name: 'Simulation', passed: true }],
        errors: [],
        warnings: [],
        policyCompliant: true,
        simulatedAt: new Date().toISOString(),
        simulationDurationMs: 0,
      };
    } catch (error) {
      return {
        success: false,
        checks: [],
        errors: [{ code: 'SIMULATION_FAILED', message: error.message }],
        warnings: [],
        policyCompliant: false,
        simulatedAt: new Date().toISOString(),
        simulationDurationMs: 0,
      };
    }
  }

  async executeRoute(request: ExecutionRequest): Promise<ExecutionResult> {
    // 1. Validate idempotency
    // 2. Simulate transaction
    // 3. Submit if valid
    // 4. Monitor and return result
  }
}
```

#### Day 12-14: TypeScript SDK

**File**: `packages/sdk/src/index.ts`

```typescript
export class SorobanLiquidityRouter {
  constructor(private config: { apiKey: string; baseUrl: string; network: string }) {}

  async getQuote(params: {
    inputAsset: string;
    outputAsset: string;
    inputAmount: string;
    maxSlippage?: string;
  }): Promise<Quote> {
    // 1. Discover routes
    const routes = await this.discoverRoutes(params);
    
    // 2. Get quote for best route
    const quote = await this.generateQuote(routes[0]!.id);
    
    return quote;
  }

  async executeRoute(params: {
    quoteId: string;
    signerSecret: string;
  }): Promise<ExecutionResult> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/routes/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteId: params.quoteId,
        idempotencyKey: `exec_${Date.now()}`,
      }),
    });

    return response.json();
  }
}
```

---

### Phase 3: Testing & Deployment (Days 15-21)

#### Day 15-16: Test Suite

**File**: `packages/routing-engine/src/__tests__/RouteDiscoveryService.test.ts`

```typescript
import { RouteDiscoveryService } from '../services/RouteDiscoveryService';

describe('RouteDiscoveryService', () => {
  let service: RouteDiscoveryService;

  beforeEach(() => {
    service = new RouteDiscoveryService();
  });

  it('should find direct route between assets', async () => {
    const routes = await service.discoverRoutes({
      inputAsset: 'USDC:ISSUER',
      outputAsset: 'XLM:native',
      inputAmount: '1000',
    });

    expect(routes.length).toBeGreaterThan(0);
    expect(routes[0]!.hopCount).toBe(1);
  });

  it('should respect max hops constraint', async () => {
    const routes = await service.discoverRoutes({
      inputAsset: 'USDC:ISSUER',
      outputAsset: 'BTC:ISSUER',
      inputAmount: '1000',
      maxHops: 2,
    });

    routes.forEach(route => {
      expect(route.hopCount).toBeLessThanOrEqualTo(2);
    });
  });
});
```

#### Day 17-18: Dashboard

**File**: `apps/dashboard/app/page.tsx`

```typescript
export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Soroban Liquidity Router</h1>
      
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard title="Total Volume (24h)" value="$1.2M" />
        <MetricCard title="Success Rate" value="98.5%" />
        <MetricCard title="Avg Slippage" value="0.12%" />
        <MetricCard title="Active Sources" value="3" />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <VolumeChart />
        <SourceHealthChart />
      </div>
    </div>
  );
}
```

#### Day 19-21: Testnet Deployment

**Steps:**
1. Build Docker images: `docker-compose build`
2. Deploy infrastructure
3. Run migrations: `npm run migrate:deploy`
4. Seed testnet data: `npm run db:seed`
5. Start services: `docker-compose up -d`
6. Run E2E tests
7. Monitor and validate

---

## Quick Reference Commands

### Development
```bash
npm install           # Install dependencies
npm run dev          # Start all services
npm run build        # Build all packages
npm test             # Run tests
npm run lint         # Run linters
```

### Database
```bash
npm run db:studio    # Open Prisma Studio
npm run migrate:dev  # Run migrations
npm run db:seed      # Seed data
```

### Docker
```bash
npm run docker:up    # Start infrastructure
npm run docker:down  # Stop infrastructure
npm run docker:logs  # View logs
```

---

## Success Criteria

### MVP is Complete When:
- ✅ Asset and source registries operational
- ✅ Route discovery finds direct and 2-hop paths
- ✅ Quotes generated with accurate fees and slippage
- ✅ Policies enforced before execution
- ✅ Transactions execute on testnet
- ✅ API endpoints functional
- ✅ SDK works end-to-end
- ✅ Basic dashboard displays metrics
- ✅ Tests cover critical paths (>80%)
- ✅ Documentation complete

### Demo Script:
1. Register new testnet asset
2. Discover routes USDC → XLM
3. Get quote with policy constraints
4. Simulate transaction
5. Execute on testnet
6. View execution in dashboard
7. Check audit logs

---

## Troubleshooting

### Common Issues

**Database connection fails:**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Restart if needed
npm run docker:down && npm run docker:up
```

**TypeScript errors:**
```bash
# Rebuild type packages
cd packages/types && npm run build
cd packages/database && npm run generate
```

**Port conflicts:**
```bash
# Kill processes on ports
npx kill-port 3000 3001 5432 6379
```

---

## Next Steps After MVP

1. **Phase 2 Enhancements**:
   - Multi-source liquidity aggregation
   - Advanced Soroban contracts
   - Anchor integration (SEP-24)

2. **Performance Optimization**:
   - Redis caching layer
   - Query optimization
   - Connection pooling

3. **Security Hardening**:
   - HSM integration
   - Security audit
   - Penetration testing

4. **Production Readiness**:
   - Load testing
   - Monitoring setup
   - Incident response plan

---

**Ready to implement? Start with Day 1: Market Data Service!**

# Soroban Liquidity Router

> Programmable liquidity and payment-routing infrastructure for Stellar and Soroban

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-20+-green)](https://nodejs.org/)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-purple)](https://stellar.org/)

## Overview

The Soroban Liquidity Router is a production-grade liquidity aggregation and routing infrastructure that abstracts the complexity of discovering and executing efficient routes for moving value between Stellar assets and liquidity sources.

### Key Features

- 🔄 **Multi-Hop Routing**: Discover direct and multi-hop routes across Stellar DEX and liquidity pools
- 📊 **Intelligent Optimization**: Minimize fees, slippage, and execution steps
- 🛡️ **Policy-Driven**: Configurable routing policies for compliance and risk management
- ⚡ **Transaction Simulation**: Pre-flight validation before execution
- 🔍 **Full Observability**: Comprehensive analytics and monitoring
- 🛠️ **Developer-First**: REST API, TypeScript SDK, and extensive documentation
- 🔐 **Production-Ready**: Security controls, audit logging, and failure handling

## Architecture

```
Application Layer (Wallets, Fintech Apps, DeFi)
           ↓
Developer Interface (SDK, REST API, Webhooks)
           ↓
Routing Engine (Discovery, Quotes, Optimization)
           ↓
Execution Layer (Simulation, Contracts, Failure Handling)
           ↓
Data Layer (Asset Registry, Market Data, Analytics)
           ↓
Stellar/Soroban Network
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

## Quick Start

### Prerequisites

- Node.js 20+ and npm 10+
- Docker and Docker Compose
- Rust and Cargo (for smart contracts)
- PostgreSQL 16+ and Redis 7+
- Stellar/Soroban CLI tools

### Installation

```bash
# Clone the repository
git clone https://github.com/damiedee96/Soroban-Liquidity-Router.git
cd Soroban-Liquidity-Router

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start infrastructure (PostgreSQL, Redis)
npm run docker:up

# Run database migrations
npm run migrate:dev

# Seed initial data
npm run db:seed

# Build all packages
npm run build

# Start development servers
npm run dev
```

The API will be available at `http://localhost:3000` and the dashboard at `http://localhost:3001`.

## Project Structure

```
soroban-liquidity-router/
├── apps/
│   ├── api/                 # REST API server
│   ├── dashboard/           # Analytics dashboard (Next.js)
│   └── worker/              # Background workers (indexer, analytics)
├── packages/
│   ├── contracts/           # Soroban smart contracts (Rust)
│   ├── database/            # Prisma schema and migrations
│   ├── sdk/                 # TypeScript SDK
│   ├── routing-engine/      # Core routing logic
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Shared utilities
├── docs/                    # Documentation
├── scripts/                 # Deployment and utility scripts
├── ARCHITECTURE.md          # System architecture
├── SECURITY.md              # Security threat model
└── docker-compose.yml       # Local development environment
```

## Usage

### TypeScript SDK

```typescript
import { SorobanLiquidityRouter } from '@soroban-router/sdk';

// Initialize the router
const router = new SorobanLiquidityRouter({
  apiKey: process.env.API_KEY,
  network: 'testnet',
});

// Define routing policy
const policy = {
  maxSlippage: 0.01, // 1%
  maxHops: 3,
  approvedAssets: ['USDC', 'XLM', 'EURC'],
  optimizationObjective: 'lowest_cost',
};

// Get quote
const quote = await router.getQuote({
  inputAsset: 'USDC:ISSUER_ADDRESS',
  outputAsset: 'XLM:native',
  inputAmount: '1000',
  policy,
});

console.log(`Expected output: ${quote.expectedOutput}`);
console.log(`Total fees: ${quote.totalFees}`);
console.log(`Route: ${quote.route.steps.length} hops`);

// Execute route
const result = await router.executeRoute({
  quoteId: quote.id,
  signerSecret: process.env.SIGNER_SECRET,
});

console.log(`Status: ${result.status}`);
console.log(`Transaction: ${result.transactionId}`);
```

### REST API

```bash
# Get available assets
curl http://localhost:3000/api/v1/assets

# Discover routes
curl -X POST http://localhost:3000/api/v1/routes/discover \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "inputAsset": "USDC:ISSUER",
    "outputAsset": "XLM:native",
    "inputAmount": "1000"
  }'

# Get quote
curl -X POST http://localhost:3000/api/v1/quotes \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "routeId": "route-uuid",
    "policy": {
      "maxSlippage": 0.01
    }
  }'

# Execute route
curl -X POST http://localhost:3000/api/v1/routes/execute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "quoteId": "quote-uuid",
    "idempotencyKey": "unique-key"
  }'
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run end-to-end tests
npm run test:e2e

# Run specific package tests
cd packages/routing-engine && npm test
```

### Building Smart Contracts

```bash
# Build Soroban contracts
npm run contracts:build

# Test contracts
npm run contracts:test

# Deploy to testnet
npm run contracts:deploy
```

### Database Management

```bash
# Create new migration
npm run migrate:dev -- --name add_new_table

# Apply migrations
npm run migrate:deploy

# Open Prisma Studio
npm run db:studio
```

## Deployment

### Using Docker

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Environment Variables

See `.env.example` for all required configuration. Key variables:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `STELLAR_NETWORK`: `testnet` or `mainnet`
- `HORIZON_URL`: Stellar Horizon API endpoint
- `SOROBAN_RPC_URL`: Soroban RPC endpoint
- `API_PORT`: API server port (default: 3000)

## Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Security & Threat Model](./SECURITY.md)
- [API Reference](./docs/API.md)
- [SDK Documentation](./docs/SDK.md)
- [Smart Contract Documentation](./docs/CONTRACTS.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## Roadmap

### Phase 1: Core Routing Engine ✅ (Current)
- Asset and liquidity-source registries
- Direct and multi-hop route discovery
- Quote calculation and route selection

### Phase 2: Soroban Execution (In Progress)
- Routing smart contracts
- Transaction simulation and execution
- Slippage protection and failure handling

### Phase 3: Programmable Routing
- Application-specific policies
- Advanced routing constraints
- Configurable optimization profiles

### Phase 4: Developer Platform
- Public APIs and TypeScript SDK
- Webhooks and integrations
- Developer sandbox and documentation

### Phase 5: Liquidity Intelligence
- Real-time liquidity monitoring
- Route performance tracking
- Dynamic route selection

### Phase 6: Payment & Settlement Expansion
- Stellar anchor integration
- Fiat settlement support
- Cross-border payment routing
- Multi-chain liquidity aggregation

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

Security is paramount for financial infrastructure. Please see [SECURITY.md](./SECURITY.md) for our threat model and security controls.

### Reporting Vulnerabilities

**Do not** open public issues for security vulnerabilities. Instead, email security@soroban-router.dev with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

- 📧 Email: support@soroban-router.dev
- 💬 Discord: [Join our community](https://discord.gg/soroban-router)
- 📚 Documentation: [docs.soroban-router.dev](https://docs.soroban-router.dev)
- 🐛 Issues: [GitHub Issues](https://github.com/damiedee96/Soroban-Liquidity-Router/issues)

## Acknowledgments

Built with:
- [Stellar](https://stellar.org/) - Blockchain platform
- [Soroban](https://soroban.stellar.org/) - Smart contracts platform
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Redis](https://redis.io/) - Cache

---

**Principle**: *Soroban Liquidity Router turns fragmented Stellar liquidity into programmable, application-ready routing infrastructure.*

# @soroban-router/database

Database schema, migrations, and client for Soroban Liquidity Router.

## Overview

This package contains:
- Prisma schema defining the complete data model
- Database client with connection pooling
- Migration utilities
- Seed data for development
- Utility functions for database operations

## Setup

### Prerequisites

- PostgreSQL 16+
- Node.js 20+

### Installation

```bash
npm install
```

### Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your database connection:

```
DATABASE_URL="postgresql://user:password@localhost:5432/soroban_router"
```

### Initialize Database

```bash
# Generate Prisma Client
npm run generate

# Run migrations
npm run migrate:dev

# Seed initial data
npm run db:seed
```

## Usage

### In Your Application

```typescript
import { prisma } from '@soroban-router/database';

// Query assets
const assets = await prisma.asset.findMany({
  where: { status: 'ACTIVE' },
  include: { basePairs: true },
});

// Create route
const route = await prisma.route.create({
  data: {
    inputAssetId: 'asset-uuid',
    outputAssetId: 'asset-uuid',
    hopCount: 2,
    estimatedDurationMs: 500,
    dataFreshness: new Date(),
    allDataFresh: true,
    validUntil: new Date(Date.now() + 60000),
    steps: {
      create: [
        {
          stepNumber: 1,
          sourceId: 'source-uuid',
          inputAssetId: 'asset-uuid',
          outputAssetId: 'asset-uuid',
          inputAmount: '1000',
          expectedOutput: '1020',
          minimumOutput: '1010',
          fee: '0.5',
          feePercentage: '0.0005',
          priceImpact: '0.001',
          price: '1.02',
          dataFetchedAt: new Date(),
          dataExpiration: new Date(Date.now() + 60000),
        },
      ],
    },
  },
  include: { steps: true },
});
```

### Database Operations

```bash
# Open Prisma Studio (GUI)
npm run db:studio

# Create new migration
npm run migrate:dev -- --name add_new_field

# Deploy migrations (production)
npm run migrate:deploy

# Reset database (development only)
npm run migrate:reset

# Format schema
npm run format
```

## Schema Overview

### Core Entities

**Assets**: Stellar assets with issuer information, characteristics, and risk indicators

**Liquidity Sources**: DEX, AMM, pools, and other liquidity providers

**Asset Pairs**: Tradable markets between assets

**Market Data**: Real-time pricing, liquidity, and volume data

### Routing

**Routes**: Multi-hop paths from input to output asset

**Route Steps**: Individual swaps in a route

**Quotes**: Price quotes with slippage and fee estimates

### Policies

**Routing Policies**: Application-specific constraints and preferences

**Policy Evaluations**: Policy compliance checks

### Execution

**Executions**: Transaction submissions and results

**Execution History**: Status changes and events

**Webhook Deliveries**: Status notification deliveries

### Analytics

**Audit Logs**: All system actions for compliance

**System Metrics**: Performance and usage metrics

**Alerts**: System health and performance alerts

## Migrations

Migrations are managed by Prisma Migrate and stored in `prisma/migrations/`.

### Creating Migrations

```bash
# After schema changes
npm run migrate:dev -- --name descriptive_name
```

### Migration Strategy

- **Development**: Use `migrate:dev` for automatic migration creation
- **Production**: Use `migrate:deploy` for applying pending migrations
- **Rollback**: Use `migrate:resolve` to mark failed migrations

## Performance

### Indexes

The schema includes indexes on:
- Foreign keys
- Frequently queried fields
- Composite unique constraints
- Timestamp fields for time-based queries

### Connection Pooling

Connection pool is configured via `DATABASE_URL`:

```
postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=60
```

Recommended settings:
- **API servers**: 10-20 connections per instance
- **Workers**: 5-10 connections per worker
- **Total**: Monitor with `getConnectionPoolInfo()`

## Utilities

### Pagination

```typescript
import { calculatePagination, buildPaginationMetadata } from '@soroban-router/database';

const { skip, take } = calculatePagination({ page: 1, limit: 50 });
const items = await prisma.asset.findMany({ skip, take });
const total = await prisma.asset.count();
const metadata = buildPaginationMetadata(total, 1, 50);
```

### Decimal Handling

```typescript
import { toPrismaDecimal, fromPrismaDecimal } from '@soroban-router/database';

// Convert to Prisma Decimal
const amount = toPrismaDecimal('123.456');

// Convert from Prisma Decimal  
const value = fromPrismaDecimal(amount); // "123.456"
```

### Retry Logic

```typescript
import { withRetry } from '@soroban-router/database';

const result = await withRetry(
  async () => {
    return await prisma.asset.create({ data: { ... } });
  },
  3, // max retries
  1000 // base delay ms
);
```

## Health Checks

```typescript
import { checkDatabaseHealth, getDatabaseStats } from '@soroban-router/database';

// Connection health
const isHealthy = await checkDatabaseHealth();

// Table statistics
const stats = await getDatabaseStats();

// Connection pool
const poolInfo = await getConnectionPoolInfo();
```

## Testing

### Test Database

Use separate database for tests:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/test_db"
```

### Test Utilities

```typescript
import { prisma } from '@soroban-router/database';

beforeEach(async () => {
  // Clean tables
  await prisma.execution.deleteMany();
  await prisma.quote.deleteMany();
  // ...
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

## Troubleshooting

### Connection Issues

```bash
# Test connection
npx prisma db execute --stdin <<< "SELECT 1"

# Check migrations
npx prisma migrate status
```

### Schema Sync Issues

```bash
# Reset and regenerate
npm run generate
npm run migrate:reset
npm run db:seed
```

### Lock Conflicts

```bash
# Kill hanging connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'soroban_router' AND pid <> pg_backend_pid();
```

## Production Considerations

### Backups

- Configure automated backups
- Test restore procedures
- Retain migration history

### Monitoring

- Track connection pool usage
- Monitor slow queries
- Set up alerts for errors

### Security

- Use connection pooling
- Limit database user permissions
- Enable SSL/TLS for connections
- Rotate credentials regularly

## Documentation

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Schema Reference](./prisma/schema.prisma)

## Support

For issues or questions:
- Open an issue on GitHub
- Check documentation
- Review schema comments

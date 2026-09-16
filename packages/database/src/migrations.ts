/**
 * Migration utilities and helpers
 */

import { prisma } from './client';

/**
 * Check if migrations are up to date
 */
export async function checkMigrationStatus(): Promise<{
  upToDate: boolean;
  pendingMigrations: number;
}> {
  try {
    // This is a simplified check - in production you'd use Prisma Migrate commands
    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `;

    if (!result[0]?.exists) {
      return { upToDate: false, pendingMigrations: -1 };
    }

    // Check for pending migrations
    const migrations = await prisma.$queryRaw<
      Array<{ applied_steps_count: number; migration_name: string }>
    >`
      SELECT applied_steps_count, migration_name
      FROM _prisma_migrations
      WHERE finished_at IS NULL;
    `;

    return {
      upToDate: migrations.length === 0,
      pendingMigrations: migrations.length,
    };
  } catch (error) {
    console.error('Failed to check migration status:', error);
    return { upToDate: false, pendingMigrations: -1 };
  }
}

/**
 * Get applied migrations
 */
export async function getAppliedMigrations(): Promise<
  Array<{
    name: string;
    startedAt: Date;
    finishedAt: Date | null;
    success: boolean;
  }>
> {
  try {
    const result = await prisma.$queryRaw<
      Array<{
        migration_name: string;
        started_at: Date;
        finished_at: Date | null;
        applied_steps_count: number;
      }>
    >`
      SELECT 
        migration_name,
        started_at,
        finished_at,
        applied_steps_count
      FROM _prisma_migrations
      ORDER BY started_at DESC;
    `;

    return result.map((row) => ({
      name: row.migration_name,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      success: row.finished_at !== null && row.applied_steps_count > 0,
    }));
  } catch (error) {
    console.error('Failed to get applied migrations:', error);
    return [];
  }
}

/**
 * Initialize database with required seed data
 */
export async function initializeDatabase() {
  console.log('Initializing database with seed data...');

  try {
    // Check if already initialized
    const assetCount = await prisma.asset.count();
    if (assetCount > 0) {
      console.log('Database already initialized');
      return;
    }

    // Create native asset (XLM)
    const xlm = await prisma.asset.create({
      data: {
        code: 'XLM',
        issuer: 'native',
        type: 'NATIVE',
        network: 'TESTNET',
        status: 'ACTIVE',
        decimals: 7,
        name: 'Stellar Lumens',
        description: 'Native asset of the Stellar network',
        issuerVerified: true,
        issuerVerificationLevel: 'INSTITUTIONAL',
      },
    });

    console.log(`Created native asset: ${xlm.code}`);

    // Create Stellar DEX source
    const stellarDex = await prisma.liquiditySource.create({
      data: {
        type: 'STELLAR_DEX',
        name: 'Stellar DEX',
        description: 'Native Stellar decentralized exchange',
        status: 'ACTIVE',
        feeType: 'PERCENTAGE',
        feeValue: '0.003', // 0.3%
        reliabilityScore: 100,
        uptimePercentage: '99.9',
        averageResponseTime: 200,
      },
    });

    console.log(`Created liquidity source: ${stellarDex.name}`);

    // Create system configuration
    await prisma.configuration.createMany({
      data: [
        {
          key: 'max_hops',
          value: 3,
          category: 'routing',
          description: 'Maximum number of hops allowed in a route',
          updatedBy: 'system',
        },
        {
          key: 'staleness_threshold_seconds',
          value: 30,
          category: 'data',
          description: 'Maximum age of market data before considered stale',
          updatedBy: 'system',
        },
        {
          key: 'quote_validity_seconds',
          value: 60,
          category: 'quotes',
          description: 'Default validity period for quotes',
          updatedBy: 'system',
        },
        {
          key: 'default_slippage_tolerance',
          value: '0.01',
          category: 'execution',
          description: 'Default slippage tolerance (1%)',
          updatedBy: 'system',
        },
      ],
    });

    console.log('Created system configuration');
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

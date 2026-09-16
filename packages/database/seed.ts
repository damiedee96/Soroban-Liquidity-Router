/**
 * Database seeding script
 * Populates database with initial data for development and testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clean existing data (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('Cleaning existing data...');
    await prisma.executionHistory.deleteMany();
    await prisma.webhookDelivery.deleteMany();
    await prisma.execution.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.routeStep.deleteMany();
    await prisma.route.deleteMany();
    await prisma.policyEvaluation.deleteMany();
    await prisma.policyChangeHistory.deleteMany();
    await prisma.routingPolicy.deleteMany();
    await prisma.marketData.deleteMany();
    await prisma.poolAsset.deleteMany();
    await prisma.liquidityPool.deleteMany();
    await prisma.sourceHealthCheck.deleteMany();
    await prisma.sourceAsset.deleteMany();
    await prisma.assetAllowlist.deleteMany();
    await prisma.issuerAllowlist.deleteMany();
    await prisma.assetPair.deleteMany();
    await prisma.liquiditySource.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.systemMetric.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.configuration.deleteMany();
  }

  // Create assets
  console.log('Creating assets...');

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
      riskLevel: 'LOW',
    },
  });

  const usdc = await prisma.asset.create({
    data: {
      code: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      type: 'CREDIT_ALPHANUM4',
      network: 'TESTNET',
      status: 'ACTIVE',
      decimals: 7,
      name: 'USD Coin',
      description: 'Stablecoin pegged to US Dollar',
      issuerName: 'Circle',
      issuerWebsite: 'https://circle.com',
      issuerVerified: true,
      issuerVerificationLevel: 'INSTITUTIONAL',
      riskLevel: 'LOW',
    },
  });

  const eurc = await prisma.asset.create({
    data: {
      code: 'EURC',
      issuer: 'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2',
      type: 'CREDIT_ALPHANUM4',
      network: 'TESTNET',
      status: 'ACTIVE',
      decimals: 7,
      name: 'Euro Coin',
      description: 'Stablecoin pegged to Euro',
      issuerName: 'Circle',
      issuerWebsite: 'https://circle.com',
      issuerVerified: true,
      issuerVerificationLevel: 'INSTITUTIONAL',
      riskLevel: 'LOW',
    },
  });

  const btc = await prisma.asset.create({
    data: {
      code: 'BTC',
      issuer: 'GAUTUYY2THLF7SGITDFMXJVYH3LHDSMGEAKSBU267M2K7A3W543CKUEF',
      type: 'CREDIT_ALPHANUM4',
      network: 'TESTNET',
      status: 'ACTIVE',
      decimals: 7,
      name: 'Bitcoin',
      description: 'Wrapped Bitcoin on Stellar',
      issuerName: 'Test Anchor',
      issuerVerified: false,
      riskLevel: 'MEDIUM',
    },
  });

  console.log(`Created ${4} assets`);

  // Create asset pairs
  console.log('Creating asset pairs...');

  await prisma.assetPair.createMany({
    data: [
      { baseAssetId: xlm.id, quoteAssetId: usdc.id },
      { baseAssetId: xlm.id, quoteAssetId: eurc.id },
      { baseAssetId: usdc.id, quoteAssetId: eurc.id },
      { baseAssetId: xlm.id, quoteAssetId: btc.id },
      { baseAssetId: usdc.id, quoteAssetId: btc.id },
    ],
  });

  console.log('Created asset pairs');

  // Create liquidity sources
  console.log('Creating liquidity sources...');

  const stellarDex = await prisma.liquiditySource.create({
    data: {
      type: 'STELLAR_DEX',
      name: 'Stellar DEX',
      description: 'Native Stellar decentralized exchange',
      status: 'ACTIVE',
      endpoint: 'https://horizon-testnet.stellar.org',
      feeType: 'FIXED',
      feeValue: '0.00001',
      reliabilityScore: 100,
      uptimePercentage: '99.99',
      averageResponseTime: 150,
      healthStatus: 'HEALTHY',
    },
  });

  const liquidityPool = await prisma.liquiditySource.create({
    data: {
      type: 'LIQUIDITY_POOL',
      name: 'Stellar Liquidity Pools',
      description: 'Automated market maker liquidity pools',
      status: 'ACTIVE',
      feeType: 'PERCENTAGE',
      feeValue: '0.003',
      reliabilityScore: 95,
      uptimePercentage: '99.5',
      averageResponseTime: 200,
      healthStatus: 'HEALTHY',
    },
  });

  console.log(`Created ${2} liquidity sources`);

  // Link sources to assets
  await prisma.sourceAsset.createMany({
    data: [
      { sourceId: stellarDex.id, assetId: xlm.id },
      { sourceId: stellarDex.id, assetId: usdc.id },
      { sourceId: stellarDex.id, assetId: eurc.id },
      { sourceId: stellarDex.id, assetId: btc.id },
      { sourceId: liquidityPool.id, assetId: xlm.id },
      { sourceId: liquidityPool.id, assetId: usdc.id },
      { sourceId: liquidityPool.id, assetId: eurc.id },
    ],
  });

  // Create sample market data
  console.log('Creating sample market data...');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60000); // 1 minute

  await prisma.marketData.createMany({
    data: [
      {
        sourceId: stellarDex.id,
        assetInId: usdc.id,
        assetOutId: xlm.id,
        price: '10.5',
        inversePrice: '0.095238',
        liquidityDepth: '100000',
        spread: '0.001',
        feePercentage: '0.0001',
        priceImpact100: '0.0001',
        priceImpact1k: '0.001',
        priceImpact10k: '0.01',
        volume24h: '50000',
        trades24h: 150,
        fetchedAt: now,
        expiresAt: expiresAt,
      },
      {
        sourceId: stellarDex.id,
        assetInId: xlm.id,
        assetOutId: usdc.id,
        price: '0.095',
        inversePrice: '10.526',
        liquidityDepth: '1000000',
        spread: '0.001',
        feePercentage: '0.0001',
        priceImpact100: '0.00001',
        priceImpact1k: '0.0001',
        priceImpact10k: '0.001',
        volume24h: '500000',
        trades24h: 200,
        fetchedAt: now,
        expiresAt: expiresAt,
      },
    ],
  });

  console.log('Created sample market data');

  // Create system configuration
  console.log('Creating system configuration...');

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
      {
        key: 'indexer_interval_ms',
        value: 5000,
        category: 'indexer',
        description: 'Interval for indexer updates in milliseconds',
        updatedBy: 'system',
      },
    ],
  });

  console.log('Created system configuration');

  // Create sample routing policy
  console.log('Creating sample routing policy...');

  await prisma.routingPolicy.create({
    data: {
      applicationId: 'demo-app',
      name: 'Default Policy',
      description: 'Default routing policy for demo application',
      active: true,
      assetConstraints: {
        allowedAssets: [xlm.id, usdc.id, eurc.id],
        requireVerifiedAssets: false,
        maxRiskLevel: 'MEDIUM',
      },
      executionConstraints: {
        maxSlippage: '0.02',
        maxHops: 3,
        minTradeAmount: '1',
      },
      liquidityConstraints: {
        minSourceReliability: 80,
        requireHealthySources: true,
      },
      timingConstraints: {
        quoteValiditySeconds: 60,
        maxDataStaleness: 30,
      },
      optimizationPreferences: {
        primaryObjective: 'lowest_cost',
        allowFallbackRoutes: true,
      },
      createdBy: 'system',
    },
  });

  console.log('Created sample routing policy');

  // Create audit log entry
  await prisma.auditLog.create({
    data: {
      actor: 'system',
      action: 'DATABASE_SEEDED',
      resource: 'database',
      resourceId: 'initial-seed',
      metadata: {
        assets: 4,
        sources: 2,
        pairs: 5,
      },
    },
  });

  console.log('Database seed completed successfully!');
}

main()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

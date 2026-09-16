import { prisma } from '@soroban-router/database';
import {
  MarketData,
  AggregatedLiquidity,
  NotFoundError,
  StaleDataError,
} from '@soroban-router/types';
import { createLogger } from '@soroban-router/utils';
import { Decimal } from 'decimal.js';

const logger = createLogger('MarketDataService');

/**
 * Market Data Service
 * Manages market data fetching, aggregation, and freshness validation
 */
export class MarketDataService {
  private readonly stalenessThreshold: number;

  constructor(stalenessThresholdSeconds: number = 30) {
    this.stalenessThreshold = stalenessThresholdSeconds;
  }

  /**
   * Fetch latest market data for a specific source and asset pair
   */
  async fetchLatestMarketData(
    sourceId: string,
    assetInId: string,
    assetOutId: string
  ): Promise<MarketData | null> {
    const data = await prisma.marketData.findFirst({
      where: { sourceId, assetInId, assetOutId },
      orderBy: { fetchedAt: 'desc' },
    });

    if (!data) {
      logger.debug('No market data found', { sourceId, assetInId, assetOutId });
      return null;
    }

    // Check freshness
    const age = (Date.now() - data.fetchedAt.getTime()) / 1000;
    if (age > this.stalenessThreshold) {
      logger.warn('Market data is stale', { sourceId, age, threshold: this.stalenessThreshold });
    }

    return data as MarketData;
  }

  /**
   * Get all available fresh market data for an asset pair
   */
  async getAvailableMarketData(
    assetInId: string,
    assetOutId: string
  ): Promise<MarketData[]> {
    const cutoff = new Date(Date.now() - this.stalenessThreshold * 1000);

    const data = await prisma.marketData.findMany({
      where: {
        assetInId,
        assetOutId,
        fetchedAt: { gte: cutoff },
      },
      include: { source: true },
      orderBy: { liquidityDepth: 'desc' },
    });

    logger.info('Retrieved market data', {
      assetInId,
      assetOutId,
      sources: data.length,
    });

    return data as MarketData[];
  }

  /**
   * Aggregate liquidity across all sources for an asset pair
   */
  async aggregateLiquidity(
    assetInId: string,
    assetOutId: string
  ): Promise<AggregatedLiquidity> {
    const marketData = await this.getAvailableMarketData(assetInId, assetOutId);

    if (marketData.length === 0) {
      logger.warn('No liquidity data available', { assetInId, assetOutId });
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

    // Calculate totals
    let totalLiquidity = new Decimal(0);
    const sources: Array<{ sourceId: string; liquidity: string; share: string }> = [];

    for (const data of marketData) {
      const liquidity = new Decimal(data.liquidityDepth);
      totalLiquidity = totalLiquidity.plus(liquidity);

      sources.push({
        sourceId: data.sourceId,
        liquidity: liquidity.toString(),
        share: '0', // Will calculate after total is known
      });
    }

    // Calculate shares
    for (const source of sources) {
      const liquidity = new Decimal(source.liquidity);
      source.share = totalLiquidity.isZero()
        ? '0'
        : liquidity.dividedBy(totalLiquidity).times(100).toString();
    }

    // Calculate average price
    const priceSum = marketData.reduce(
      (sum, data) => sum.plus(new Decimal(data.price)),
      new Decimal(0)
    );
    const averagePrice = priceSum.dividedBy(marketData.length).toString();

    // Calculate weighted average price
    let weightedSum = new Decimal(0);
    for (const data of marketData) {
      const price = new Decimal(data.price);
      const weight = new Decimal(data.liquidityDepth).dividedBy(totalLiquidity);
      weightedSum = weightedSum.plus(price.times(weight));
    }

    return {
      assetIn: assetInId,
      assetOut: assetOutId,
      totalLiquidity: totalLiquidity.toString(),
      sources,
      averagePrice,
      weightedAveragePrice: weightedSum.toString(),
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Update market data for a source
   */
  async updateMarketData(data: {
    sourceId: string;
    assetInId: string;
    assetOutId: string;
    price: string;
    liquidityDepth: string;
    spread: string;
    feePercentage: string;
    volume24h: string;
    trades24h: number;
  }): Promise<MarketData> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.stalenessThreshold * 1000);

    // Calculate derived fields
    const price = new Decimal(data.price);
    const inversePrice = new Decimal(1).dividedBy(price);
    const liquidity = new Decimal(data.liquidityDepth);

    // Estimate price impact
    const priceImpact100 = new Decimal(100).dividedBy(liquidity);
    const priceImpact1k = new Decimal(1000).dividedBy(liquidity);
    const priceImpact10k = new Decimal(10000).dividedBy(liquidity);

    const marketData = await prisma.marketData.create({
      data: {
        sourceId: data.sourceId,
        assetInId: data.assetInId,
        assetOutId: data.assetOutId,
        price: data.price,
        inversePrice: inversePrice.toString(),
        liquidityDepth: data.liquidityDepth,
        spread: data.spread,
        feePercentage: data.feePercentage,
        priceImpact100: priceImpact100.toString(),
        priceImpact1k: priceImpact1k.toString(),
        priceImpact10k: priceImpact10k.toString(),
        volume24h: data.volume24h,
        trades24h: data.trades24h,
        fetchedAt: now,
        expiresAt,
      },
    });

    logger.info('Market data updated', {
      sourceId: data.sourceId,
      assetInId: data.assetInId,
      assetOutId: data.assetOutId,
      price: data.price,
    });

    return marketData as MarketData;
  }

  /**
   * Check data freshness across all sources
   */
  async checkDataFreshness(): Promise<{
    totalSources: number;
    freshSources: number;
    staleSources: number;
    staleSourceIds: string[];
  }> {
    const cutoff = new Date(Date.now() - this.stalenessThreshold * 1000);

    const allSources = await prisma.liquiditySource.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    const freshData = await prisma.marketData.findMany({
      where: { fetchedAt: { gte: cutoff } },
      distinct: ['sourceId'],
      select: { sourceId: true },
    });

    const freshSourceIds = new Set(freshData.map((d) => d.sourceId));
    const staleSourceIds = allSources
      .filter((s) => !freshSourceIds.has(s.id))
      .map((s) => s.id);

    return {
      totalSources: allSources.length,
      freshSources: freshSourceIds.size,
      staleSources: staleSourceIds.length,
      staleSourceIds,
    };
  }

  /**
   * Get best price for asset pair
   */
  async getBestPrice(assetInId: string, assetOutId: string): Promise<{
    price: string;
    sourceId: string;
    liquidity: string;
  } | null> {
    const marketData = await this.getAvailableMarketData(assetInId, assetOutId);

    if (marketData.length === 0) {
      return null;
    }

    // Sort by best effective price (considering fees)
    const sorted = marketData.sort((a, b) => {
      const priceA = new Decimal(a.price).times(new Decimal(1).plus(a.feePercentage));
      const priceB = new Decimal(b.price).times(new Decimal(1).plus(b.feePercentage));
      return priceA.comparedTo(priceB);
    });

    const best = sorted[0]!;

    return {
      price: best.price,
      sourceId: best.sourceId,
      liquidity: best.liquidityDepth,
    };
  }
}

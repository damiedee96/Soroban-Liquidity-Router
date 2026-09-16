import {
  prisma,
  PaginationParams,
  calculatePagination,
  buildPaginationMetadata,
} from '@soroban-router/database';
import {
  LiquiditySource,
  SourceHealthCheck,
  PaginatedResponse,
  NotFoundError,
  ValidationError,
  SourceUnavailableError,
} from '@soroban-router/types';
import { createLogger, validateRequired } from '@soroban-router/utils';

const logger = createLogger('LiquiditySourceRegistry');

/**
 * Liquidity Source Registry Service
 * Manages liquidity sources, their health, and supported assets
 */
export class LiquiditySourceRegistry {
  /**
   * Register a new liquidity source
   */
  async registerSource(data: {
    type: 'STELLAR_DEX' | 'LIQUIDITY_POOL' | 'AMM' | 'ANCHOR' | 'BRIDGE' | 'CUSTOM';
    name: string;
    description?: string;
    endpoint?: string;
    contractId?: string;
    feeType: 'FIXED' | 'PERCENTAGE' | 'TIERED';
    feeValue: string;
    feeCurrency?: string;
    supportedAssetIds: string[];
  }): Promise<LiquiditySource> {
    validateRequired(data, ['type', 'name', 'feeType', 'feeValue']);

    // Validate assets exist
    const assetCount = await prisma.asset.count({
      where: {
        id: { in: data.supportedAssetIds },
      },
    });

    if (assetCount !== data.supportedAssetIds.length) {
      throw new ValidationError('One or more asset IDs are invalid');
    }

    // Create source
    const source = await prisma.liquiditySource.create({
      data: {
        type: data.type,
        name: data.name,
        description: data.description,
        endpoint: data.endpoint,
        contractId: data.contractId,
        feeType: data.feeType,
        feeValue: data.feeValue,
        feeCurrency: data.feeCurrency,
        status: 'ACTIVE',
        supportedAssets: {
          create: data.supportedAssetIds.map((assetId) => ({
            assetId,
          })),
        },
      },
      include: {
        supportedAssets: true,
      },
    });

    logger.info('Liquidity source registered', {
      sourceId: source.id,
      type: source.type,
      name: source.name,
    });

    return source as LiquiditySource;
  }

  /**
   * Get source by ID
   */
  async getSource(id: string): Promise<LiquiditySource> {
    const source = await prisma.liquiditySource.findUnique({
      where: { id },
      include: {
        supportedAssets: true,
      },
    });

    if (!source) {
      throw new NotFoundError('LiquiditySource', id);
    }

    return source as LiquiditySource;
  }

  /**
   * List sources with pagination and filters
   */
  async listSources(
    params: PaginationParams & {
      type?: string;
      status?: string;
      healthStatus?: string;
    }
  ): Promise<PaginatedResponse<LiquiditySource>> {
    const { skip, take } = calculatePagination(params);

    // Build where clause
    const where: any = {};

    if (params.type) {
      where.type = params.type;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.healthStatus) {
      where.healthStatus = params.healthStatus;
    }

    // Query
    const [sources, total] = await Promise.all([
      prisma.liquiditySource.findMany({
        where,
        skip,
        take,
        orderBy: { reliabilityScore: 'desc' },
        include: {
          supportedAssets: true,
        },
      }),
      prisma.liquiditySource.count({ where }),
    ]);

    const metadata = buildPaginationMetadata(total, params.page || 1, take);

    return {
      data: sources as LiquiditySource[],
      pagination: metadata,
    };
  }

  /**
   * Update source information
   */
  async updateSource(
    id: string,
    data: Partial<{
      status: string;
      description: string;
      endpoint: string;
      feeValue: string;
      reliabilityScore: number;
      healthStatus: string;
    }>
  ): Promise<LiquiditySource> {
    const source = await prisma.liquiditySource.update({
      where: { id },
      data: data as any,
      include: {
        supportedAssets: true,
      },
    });

    logger.info('Liquidity source updated', {
      sourceId: id,
      changes: Object.keys(data),
    });

    return source as LiquiditySource;
  }

  /**
   * Add asset support to source
   */
  async addAssetSupport(sourceId: string, assetId: string): Promise<void> {
    // Verify source and asset exist
    await this.getSource(sourceId);

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundError('Asset', assetId);
    }

    // Check if already supported
    const existing = await prisma.sourceAsset.findUnique({
      where: {
        sourceId_assetId: {
          sourceId,
          assetId,
        },
      },
    });

    if (existing) {
      logger.warn('Asset already supported by source', { sourceId, assetId });
      return;
    }

    await prisma.sourceAsset.create({
      data: {
        sourceId,
        assetId,
      },
    });

    logger.info('Asset support added to source', { sourceId, assetId });
  }

  /**
   * Remove asset support from source
   */
  async removeAssetSupport(sourceId: string, assetId: string): Promise<void> {
    await prisma.sourceAsset.delete({
      where: {
        sourceId_assetId: {
          sourceId,
          assetId,
        },
      },
    });

    logger.info('Asset support removed from source', { sourceId, assetId });
  }

  /**
   * Get sources supporting specific asset
   */
  async getSourcesForAsset(assetId: string): Promise<LiquiditySource[]> {
    const sourceAssets = await prisma.sourceAsset.findMany({
      where: { assetId },
      include: {
        source: {
          include: {
            supportedAssets: true,
          },
        },
      },
    });

    return sourceAssets.map((sa) => sa.source) as LiquiditySource[];
  }

  /**
   * Get sources supporting asset pair
   */
  async getSourcesForPair(assetInId: string, assetOutId: string): Promise<LiquiditySource[]> {
    const sources = await prisma.$queryRaw<any[]>`
      SELECT DISTINCT ls.*
      FROM liquidity_sources ls
      INNER JOIN source_assets sa1 ON ls.id = sa1.source_id AND sa1.asset_id = ${assetInId}
      INNER JOIN source_assets sa2 ON ls.id = sa2.source_id AND sa2.asset_id = ${assetOutId}
      WHERE ls.status = 'ACTIVE'
      AND ls.health_status != 'OFFLINE'
      ORDER BY ls.reliability_score DESC;
    `;

    return sources as LiquiditySource[];
  }

  /**
   * Check source health
   */
  async checkSourceHealth(sourceId: string): Promise<SourceHealthCheck> {
    const source = await this.getSource(sourceId);

    const startTime = Date.now();

    // Perform health checks
    let connectivityOk = true;
    let apiResponsive = true;
    let dataFreshnessOk = true;
    let liquidityAvailable = true;
    const errors: string[] = [];

    try {
      // Check endpoint connectivity (if applicable)
      if (source.endpoint) {
        // In production, make actual HTTP request
        // For now, simulate
        connectivityOk = true;
      }

      // Check data freshness
      const recentData = await prisma.marketData.count({
        where: {
          sourceId,
          fetchedAt: {
            gte: new Date(Date.now() - 60000), // Last minute
          },
        },
      });

      dataFreshnessOk = recentData > 0;
      if (!dataFreshnessOk) {
        errors.push('No recent market data');
      }

      // Check liquidity availability
      const liquidityCount = await prisma.marketData.count({
        where: {
          sourceId,
          liquidityDepth: {
            gt: 0,
          },
        },
      });

      liquidityAvailable = liquidityCount > 0;
      if (!liquidityAvailable) {
        errors.push('No liquidity available');
      }
    } catch (error) {
      connectivityOk = false;
      errors.push((error as Error).message);
    }

    const responseTime = Date.now() - startTime;

    // Determine overall status
    let status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
    if (!connectivityOk) {
      status = 'OFFLINE';
    } else if (!dataFreshnessOk || !liquidityAvailable) {
      status = 'DEGRADED';
    } else {
      status = 'HEALTHY';
    }

    // Record health check
    const healthCheck = await prisma.sourceHealthCheck.create({
      data: {
        sourceId,
        status,
        responseTime,
        connectivityOk,
        dataFreshnessOk,
        apiResponsive,
        liquidityAvailable,
        errors,
      },
    });

    // Update source health status
    await this.updateSource(sourceId, {
      healthStatus: status,
    });

    logger.info('Source health check completed', {
      sourceId,
      status,
      responseTime,
    });

    return healthCheck as SourceHealthCheck;
  }

  /**
   * Get source health history
   */
  async getHealthHistory(
    sourceId: string,
    hours: number = 24
  ): Promise<SourceHealthCheck[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const checks = await prisma.sourceHealthCheck.findMany({
      where: {
        sourceId,
        timestamp: {
          gte: since,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return checks as SourceHealthCheck[];
  }

  /**
   * Calculate source reliability score
   */
  async updateReliabilityScore(sourceId: string): Promise<number> {
    // Get health checks from last 7 days
    const checks = await this.getHealthHistory(sourceId, 24 * 7);

    if (checks.length === 0) {
      return 100; // Default score
    }

    // Calculate uptime percentage
    const healthyChecks = checks.filter((c) => c.status === 'HEALTHY').length;
    const uptimePercentage = (healthyChecks / checks.length) * 100;

    // Calculate average response time
    const avgResponseTime =
      checks.reduce((sum, c) => sum + c.responseTime, 0) / checks.length;

    // Response time penalty (>1s is degraded)
    const responseTimePenalty = avgResponseTime > 1000 ? 10 : 0;

    // Calculate reliability score
    const score = Math.max(0, Math.min(100, uptimePercentage - responseTimePenalty));

    // Update source
    await prisma.liquiditySource.update({
      where: { id: sourceId },
      data: {
        reliabilityScore: Math.round(score),
        uptimePercentage: uptimePercentage.toFixed(2),
        averageResponseTime: Math.round(avgResponseTime),
      },
    });

    logger.info('Source reliability score updated', {
      sourceId,
      score: Math.round(score),
      uptimePercentage: uptimePercentage.toFixed(2),
    });

    return Math.round(score);
  }

  /**
   * Check if source is available for routing
   */
  async isSourceAvailable(sourceId: string): Promise<boolean> {
    const source = await this.getSource(sourceId);

    return (
      source.status === 'ACTIVE' &&
      source.healthStatus !== 'OFFLINE' &&
      source.reliabilityScore >= 50 // Minimum reliability threshold
    );
  }

  /**
   * Get available sources for routing
   */
  async getAvailableSources(): Promise<LiquiditySource[]> {
    const sources = await prisma.liquiditySource.findMany({
      where: {
        status: 'ACTIVE',
        healthStatus: {
          not: 'OFFLINE',
        },
        reliabilityScore: {
          gte: 50,
        },
      },
      include: {
        supportedAssets: true,
      },
      orderBy: {
        reliabilityScore: 'desc',
      },
    });

    return sources as LiquiditySource[];
  }

  /**
   * Get source statistics
   */
  async getSourceStatistics(sourceId: string, days: number = 30): Promise<{
    totalVolume: string;
    totalTrades: number;
    averageSlippage: string;
    uptimePercentage: number;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get health checks for uptime
    const healthChecks = await prisma.sourceHealthCheck.findMany({
      where: {
        sourceId,
        timestamp: {
          gte: since,
        },
      },
    });

    const healthyChecks = healthChecks.filter((c) => c.status === 'HEALTHY').length;
    const uptimePercentage =
      healthChecks.length > 0 ? (healthyChecks / healthChecks.length) * 100 : 100;

    // This would aggregate from execution and analytics tables
    // Simplified for now
    return {
      totalVolume: '0',
      totalTrades: 0,
      averageSlippage: '0',
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
    };
  }

  /**
   * Deactivate unhealthy source
   */
  async deactivateIfUnhealthy(sourceId: string, minUptimePercent: number = 90): Promise<void> {
    const stats = await this.getSourceStatistics(sourceId, 1); // Last 24 hours

    if (stats.uptimePercentage < minUptimePercent) {
      await this.updateSource(sourceId, {
        status: 'INACTIVE',
      });

      logger.warn('Source deactivated due to low uptime', {
        sourceId,
        uptimePercentage: stats.uptimePercentage,
      });
    }
  }
}

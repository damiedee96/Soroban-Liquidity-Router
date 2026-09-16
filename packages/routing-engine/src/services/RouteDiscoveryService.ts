import { prisma } from '@soroban-router/database';
import {
  Route,
  RouteStep,
  RouteDiscoveryRequest,
  RouteDiscoveryResponse,
  NotFoundError,
  NoRouteFoundError,
} from '@soroban-router/types';
import { createLogger, parseAssetIdentifier } from '@soroban-router/utils';
import { AssetRegistry } from '../registries/AssetRegistry';
import { LiquiditySourceRegistry } from '../registries/LiquiditySourceRegistry';
import { MarketDataService } from './MarketDataService';
import { Decimal } from 'decimal.js';

const logger = createLogger('RouteDiscoveryService');

interface Graph {
  adjacency: Map<string, Set<string>>;
  edges: Map<string, Array<{ to: string; sourceId: string }>>;
}

/**
 * Route Discovery Service
 * Finds optimal paths between assets using graph traversal
 */
export class RouteDiscoveryService {
  private assetRegistry: AssetRegistry;
  private sourceRegistry: LiquiditySourceRegistry;
  private marketDataService: MarketDataService;

  constructor() {
    this.assetRegistry = new AssetRegistry();
    this.sourceRegistry = new LiquiditySourceRegistry();
    this.marketDataService = new MarketDataService();
  }

  /**
   * Discover all valid routes between assets
   */
  async discoverRoutes(request: RouteDiscoveryRequest): Promise<RouteDiscoveryResponse> {
    const startTime = Date.now();

    // Resolve assets
    const network = process.env.STELLAR_NETWORK || 'TESTNET';
    const inputAsset = await this.resolveAsset(request.inputAsset, network);
    const outputAsset = await this.resolveAsset(request.outputAsset, network);

    logger.info('Discovering routes', {
      inputAsset: inputAsset.code,
      outputAsset: outputAsset.code,
      inputAmount: request.inputAmount,
    });

    // Build liquidity graph
    const graph = await this.buildLiquidityGraph();

    // Find all paths
    const maxHops = request.maxHops || 3;
    const paths = this.findPaths(graph, inputAsset.id, outputAsset.id, maxHops);

    logger.info('Paths found', { count: paths.length });

    if (paths.length === 0) {
      throw new NoRouteFoundError(request.inputAsset, request.outputAsset);
    }

    // Convert paths to routes with market data
    const routes = await Promise.all(
      paths.map((path) => this.pathToRoute(path, graph, request.inputAmount))
    );

    // Filter out invalid routes
    const validRoutes = routes.filter((r) => r !== null) as Route[];

    const searchCompletedIn = Date.now() - startTime;

    logger.info('Routes discovered', {
      total: validRoutes.length,
      timeMs: searchCompletedIn,
    });

    return {
      routes: validRoutes,
      totalRoutesFound: validRoutes.length,
      searchCompletedIn,
      constraints: {
        maxHops,
        allowedSources: request.includeSources || [],
        allowedAssets: request.includeAssets || [],
        stalenessThreshold: 30,
      },
      warnings: validRoutes.length === 0 ? ['No valid routes found'] : undefined,
    };
  }

  /**
   * Build liquidity graph from available sources
   */
  private async buildLiquidityGraph(): Promise<Graph> {
    const sources = await this.sourceRegistry.getAvailableSources();

    const adjacency = new Map<string, Set<string>>();
    const edges = new Map<string, Array<{ to: string; sourceId: string }>>();

    for (const source of sources) {
      const supportedAssetIds = source.supportedAssets.map((sa: any) => sa.assetId);

      // Create edges between all pairs of supported assets
      for (const assetIn of supportedAssetIds) {
        if (!adjacency.has(assetIn)) {
          adjacency.set(assetIn, new Set());
        }
        if (!edges.has(assetIn)) {
          edges.set(assetIn, []);
        }

        for (const assetOut of supportedAssetIds) {
          if (assetIn !== assetOut) {
            adjacency.get(assetIn)!.add(assetOut);
            edges.get(assetIn)!.push({ to: assetOut, sourceId: source.id });
          }
        }
      }
    }

    logger.debug('Liquidity graph built', {
      nodes: adjacency.size,
      sources: sources.length,
    });

    return { adjacency, edges };
  }

  /**
   * Find all paths using BFS with cycle detection
   */
  private findPaths(
    graph: Graph,
    startAssetId: string,
    endAssetId: string,
    maxHops: number
  ): string[][] {
    const paths: string[][] = [];
    const queue: { assetId: string; path: string[] }[] = [
      { assetId: startAssetId, path: [startAssetId] },
    ];

    while (queue.length > 0) {
      const { assetId, path } = queue.shift()!;

      // Found destination
      if (assetId === endAssetId) {
        paths.push(path);
        continue;
      }

      // Max hops reached
      if (path.length > maxHops) {
        continue;
      }

      // Get neighbors
      const neighbors = graph.adjacency.get(assetId);
      if (!neighbors) continue;

      // Add unvisited neighbors to queue
      for (const neighbor of neighbors) {
        if (!path.includes(neighbor)) {
          // Cycle prevention
          queue.push({
            assetId: neighbor,
            path: [...path, neighbor],
          });
        }
      }
    }

    return paths;
  }

  /**
   * Convert asset path to route with market data
   */
  private async pathToRoute(
    path: string[],
    graph: Graph,
    inputAmount: string
  ): Promise<Route | null> {
    try {
      const steps: RouteStep[] = [];
      let currentAmount = new Decimal(inputAmount);
      let oldestDataPoint = new Date();

      for (let i = 0; i < path.length - 1; i++) {
        const assetInId = path[i]!;
        const assetOutId = path[i + 1]!;

        // Find available sources for this hop
        const edgesForAsset = graph.edges.get(assetInId) || [];
        const sourcesForHop = edgesForAsset.filter((e) => e.to === assetOutId);

        if (sourcesForHop.length === 0) {
          return null; // No source available
        }

        // Get market data for first available source
        const sourceId = sourcesForHop[0]!.sourceId;
        const marketData = await this.marketDataService.fetchLatestMarketData(
          sourceId,
          assetInId,
          assetOutId
        );

        if (!marketData) {
          return null; // No market data available
        }

        // Track oldest data point
        if (marketData.fetchedAt < oldestDataPoint) {
          oldestDataPoint = marketData.fetchedAt;
        }

        // Calculate output for this step
        const price = new Decimal(marketData.price);
        const feePercentage = new Decimal(marketData.feePercentage);
        const expectedOutput = currentAmount
          .times(price)
          .times(new Decimal(1).minus(feePercentage));

        const minimumOutput = expectedOutput.times(0.99); // 1% slippage tolerance

        const step: RouteStep = {
          stepNumber: i + 1,
          sourceId,
          sourceName: 'Source', // Would fetch from source registry
          sourceType: 'STELLAR_DEX',
          inputAsset: assetInId,
          outputAsset: assetOutId,
          inputAmount: currentAmount.toString(),
          expectedOutput: expectedOutput.toString(),
          minimumOutput: minimumOutput.toString(),
          fee: currentAmount.times(feePercentage).toString(),
          feePercentage: feePercentage.toString(),
          priceImpact: marketData.priceImpact1k,
          price: marketData.price,
          marketDataId: marketData.id,
          dataFetchedAt: marketData.fetchedAt.toISOString(),
          dataExpiration: marketData.expiresAt.toISOString(),
        };

        steps.push(step);
        currentAmount = expectedOutput;
      }

      // Create route
      const now = new Date();
      const route = await prisma.route.create({
        data: {
          inputAssetId: path[0]!,
          outputAssetId: path[path.length - 1]!,
          hopCount: path.length - 1,
          estimatedDurationMs: 500 * (path.length - 1), // Estimate 500ms per hop
          dataFreshness: oldestDataPoint,
          allDataFresh: (now.getTime() - oldestDataPoint.getTime()) / 1000 < 30,
          validUntil: new Date(now.getTime() + 60000), // Valid for 1 minute
          steps: {
            create: steps as any,
          },
        },
        include: {
          steps: true,
        },
      });

      return route as Route;
    } catch (error) {
      logger.error('Failed to convert path to route', { error, path });
      return null;
    }
  }

  /**
   * Resolve asset from identifier
   */
  private async resolveAsset(identifier: string, network: string) {
    const { code, issuer } = parseAssetIdentifier(identifier);
    return this.assetRegistry.getAssetByIdentifier(code, issuer, network);
  }

  /**
   * Get route by ID
   */
  async getRoute(routeId: string): Promise<Route> {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: { steps: true },
    });

    if (!route) {
      throw new NotFoundError('Route', routeId);
    }

    return route as Route;
  }

  /**
   * Validate route is still valid
   */
  async validateRoute(routeId: string): Promise<boolean> {
    const route = await this.getRoute(routeId);

    // Check if expired
    if (new Date() > route.validUntil) {
      logger.warn('Route expired', { routeId });
      return false;
    }

    // Check if all data is still fresh
    if (!route.allDataFresh) {
      logger.warn('Route has stale data', { routeId });
      return false;
    }

    return true;
  }
}

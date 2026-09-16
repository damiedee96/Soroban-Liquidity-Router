import { UUID, Timestamp, DecimalAmount, TimeRange } from './common';

/**
 * Analytics time period
 */
export type AnalyticsPeriod = '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';

/**
 * Overall platform metrics
 */
export interface PlatformMetrics {
  /** Volume metrics */
  totalVolume: DecimalAmount;
  volumeChange: DecimalAmount; // Percentage change from previous period
  totalTransactions: number;
  transactionsChange: number;
  
  /** Performance metrics */
  successRate: number;
  averageExecutionTime: number;
  averageSlippage: DecimalAmount;
  
  /** Cost metrics */
  totalFees: DecimalAmount;
  averageFeePerTransaction: DecimalAmount;
  
  /** User metrics */
  activeApplications: number;
  newApplications: number;
  
  /** Period */
  period: AnalyticsPeriod;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  calculatedAt: Timestamp;
}

/**
 * Route performance metrics
 */
export interface RoutePerformanceMetrics {
  routeId?: UUID;
  assetPair: {
    inputAsset: UUID;
    outputAsset: UUID;
  };
  
  /** Usage */
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  
  /** Volume */
  totalVolume: DecimalAmount;
  averageTradeSize: DecimalAmount;
  
  /** Performance */
  averageExecutionTime: number;
  medianExecutionTime: number;
  
  /** Cost efficiency */
  averageSlippage: DecimalAmount;
  averageFees: DecimalAmount;
  averagePriceImpact: DecimalAmount;
  
  /** Route characteristics */
  averageHops: number;
  mostCommonHops: number;
  
  /** Period */
  period: AnalyticsPeriod;
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

/**
 * Liquidity source performance
 */
export interface SourcePerformanceMetrics {
  sourceId: UUID;
  sourceName: string;
  sourceType: string;
  
  /** Usage */
  timesUsed: number;
  volumeRouted: DecimalAmount;
  shareOfTotalVolume: DecimalAmount;
  
  /** Reliability */
  uptimePercentage: number;
  failureCount: number;
  averageResponseTime: number;
  
  /** Economic */
  totalFeesGenerated: DecimalAmount;
  averageFeePerTrade: DecimalAmount;
  
  /** Liquidity */
  averageLiquidityDepth: DecimalAmount;
  averageSlippage: DecimalAmount;
  
  /** Period */
  period: AnalyticsPeriod;
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

/**
 * Asset pair analytics
 */
export interface AssetPairAnalytics {
  baseAsset: UUID;
  quoteAsset: UUID;
  
  /** Volume */
  volume: DecimalAmount;
  trades: number;
  uniqueRoutes: number;
  
  /** Pricing */
  averagePrice: DecimalAmount;
  highPrice: DecimalAmount;
  lowPrice: DecimalAmount;
  currentPrice: DecimalAmount;
  priceChange: DecimalAmount;
  
  /** Efficiency */
  averageSlippage: DecimalAmount;
  averageFees: DecimalAmount;
  averageExecutionTime: number;
  
  /** Liquidity */
  totalLiquidity: DecimalAmount;
  liquiditySources: number;
  
  /** Period */
  period: AnalyticsPeriod;
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

/**
 * Slippage analytics
 */
export interface SlippageAnalytics {
  /** Distribution */
  averageSlippage: DecimalAmount;
  medianSlippage: DecimalAmount;
  p95Slippage: DecimalAmount;
  p99Slippage: DecimalAmount;
  maxSlippage: DecimalAmount;
  
  /** Breakdown by range */
  slippageDistribution: SlippageDistribution[];
  
  /** Factors */
  slippageByHopCount: Array<{
    hops: number;
    averageSlippage: DecimalAmount;
    count: number;
  }>;
  
  slippageByTradeSize: Array<{
    sizeRange: string;
    averageSlippage: DecimalAmount;
    count: number;
  }>;
  
  /** Period */
  period: AnalyticsPeriod;
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

/**
 * Slippage distribution bucket
 */
export interface SlippageDistribution {
  range: string; // e.g., "0-0.1%"
  count: number;
  percentage: number;
}

/**
 * Failure analytics
 */
export interface FailureAnalytics {
  totalFailures: number;
  failureRate: number;
  
  /** Breakdown by type */
  failuresByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  
  /** Breakdown by source */
  failuresBySource: Array<{
    sourceId: UUID;
    sourceName: string;
    count: number;
  }>;
  
  /** Breakdown by asset */
  failuresByAsset: Array<{
    assetId: UUID;
    assetCode: string;
    count: number;
  }>;
  
  /** Retry statistics */
  retriedFailures: number;
  successfulRetries: number;
  retrySuccessRate: number;
  
  /** Period */
  period: AnalyticsPeriod;
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

/**
 * Cost analytics
 */
export interface CostAnalytics {
  /** Total costs */
  totalFees: DecimalAmount;
  totalGasCosts: DecimalAmount;
  totalCosts: DecimalAmount;
  
  /** Averages */
  averageFeePerTrade: DecimalAmount;
  averageFeePercentage: DecimalAmount;
  
  /** Breakdown */
  feesByType: Array<{
    type: string;
    amount: DecimalAmount;
    percentage: number;
  }>;
  
  feesBySource: Array<{
    sourceId: UUID;
    sourceName: string;
    amount: DecimalAmount;
  }>;
  
  /** Trends */
  costTrend: Array<{
    timestamp: Timestamp;
    totalCost: DecimalAmount;
    averageCost: DecimalAmount;
  }>;
  
  /** Period */
  period: AnalyticsPeriod;
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

/**
 * Policy compliance analytics
 */
export interface PolicyComplianceAnalytics {
  policyId?: UUID;
  
  /** Compliance */
  totalEvaluations: number;
  compliantExecutions: number;
  violations: number;
  complianceRate: number;
  
  /** Violation breakdown */
  violationsByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  
  violationsByConstraint: Array<{
    constraint: string;
    count: number;
  }>;
  
  /** Most violated constraints */
  topViolations: Array<{
    constraint: string;
    count: number;
    impact: 'low' | 'medium' | 'high';
  }>;
  
  /** Period */
  period: AnalyticsPeriod;
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

/**
 * Liquidity utilization analytics
 */
export interface LiquidityUtilizationAnalytics {
  /** Overall utilization */
  totalAvailableLiquidity: DecimalAmount;
  totalUtilizedLiquidity: DecimalAmount;
  utilizationRate: number;
  
  /** By source */
  utilizationBySource: Array<{
    sourceId: UUID;
    sourceName: string;
    availableLiquidity: DecimalAmount;
    utilizedLiquidity: DecimalAmount;
    utilizationRate: number;
  }>;
  
  /** By asset */
  utilizationByAsset: Array<{
    assetId: UUID;
    assetCode: string;
    availableLiquidity: DecimalAmount;
    utilizedLiquidity: DecimalAmount;
    utilizationRate: number;
  }>;
  
  /** Period */
  period: AnalyticsPeriod;
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint {
  timestamp: Timestamp;
  value: number | DecimalAmount;
  metadata?: Record<string, any>;
}

/**
 * Time series data
 */
export interface TimeSeriesData {
  metric: string;
  unit: string;
  dataPoints: TimeSeriesDataPoint[];
  aggregation: 'sum' | 'average' | 'min' | 'max' | 'count';
  interval: string; // e.g., "1h", "1d"
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

/**
 * Analytics query parameters
 */
export interface AnalyticsQuery {
  period: AnalyticsPeriod;
  timeRange?: TimeRange;
  
  /** Filters */
  assetIds?: UUID[];
  sourceIds?: UUID[];
  policyIds?: UUID[];
  applicationIds?: UUID[];
  
  /** Grouping */
  groupBy?: string[];
  
  /** Aggregation */
  metrics?: string[];
}

/**
 * Real-time metrics
 */
export interface RealtimeMetrics {
  /** Current activity */
  activeExecutions: number;
  executionsPerSecond: number;
  
  /** Recent performance (last 5 minutes) */
  recentSuccessRate: number;
  recentAverageExecutionTime: number;
  recentAverageSlippage: DecimalAmount;
  
  /** System health */
  apiResponseTime: number;
  indexerLag: number; // seconds
  databaseConnections: number;
  
  /** Alerts */
  activeAlerts: number;
  criticalAlerts: number;
  
  /** Timestamp */
  timestamp: Timestamp;
}

/**
 * Alert definition
 */
export interface Alert {
  id: UUID;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
  triggeredAt: Timestamp;
  resolvedAt?: Timestamp;
  acknowledged: boolean;
}

/**
 * Dashboard widget data
 */
export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert';
  title: string;
  data: any;
  updatedAt: Timestamp;
}

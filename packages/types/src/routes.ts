import { UUID, Timestamp, DecimalAmount } from './common';

/**
 * Route represents a path from input asset to output asset
 */
export interface Route {
  id: UUID;
  inputAsset: UUID;
  outputAsset: UUID;
  steps: RouteStep[];
  hopCount: number;
  
  /** Estimated performance */
  estimatedDurationMs: number;
  estimatedGas?: DecimalAmount;
  
  /** Data quality */
  dataFreshness: Timestamp; // Oldest data point in route
  allDataFresh: boolean;
  
  /** Route metadata */
  createdAt: Timestamp;
  validUntil: Timestamp;
}

/**
 * Individual step in a route
 */
export interface RouteStep {
  stepNumber: number;
  sourceId: UUID;
  sourceName: string;
  sourceType: string;
  
  /** Assets */
  inputAsset: UUID;
  outputAsset: UUID;
  
  /** Amounts */
  inputAmount: DecimalAmount;
  expectedOutput: DecimalAmount;
  minimumOutput: DecimalAmount;
  
  /** Costs */
  fee: DecimalAmount;
  feePercentage: DecimalAmount;
  priceImpact: DecimalAmount;
  
  /** Execution details */
  price: DecimalAmount;
  marketDataId?: UUID;
  
  /** Data quality */
  dataFetchedAt: Timestamp;
  dataExpiration: Timestamp;
}

/**
 * Route discovery request
 */
export interface RouteDiscoveryRequest {
  inputAsset: string; // Format: "CODE:ISSUER" or "XLM:native"
  outputAsset: string;
  inputAmount: DecimalAmount;
  
  /** Optional constraints */
  maxHops?: number;
  excludeSources?: UUID[];
  includeSources?: UUID[];
  excludeAssets?: UUID[];
  includeAssets?: UUID[];
  
  /** Optimization preferences */
  optimizationObjective?: OptimizationObjective;
  
  /** Policy */
  policyId?: UUID;
}

/**
 * Optimization objectives for route selection
 */
export type OptimizationObjective =
  | 'lowest_cost'
  | 'highest_output'
  | 'lowest_slippage'
  | 'fewest_hops'
  | 'fastest_execution'
  | 'highest_reliability'
  | 'freshest_data';

/**
 * Route discovery response
 */
export interface RouteDiscoveryResponse {
  routes: Route[];
  totalRoutesFound: number;
  searchCompletedIn: number; // milliseconds
  constraints: RouteConstraints;
  warnings?: string[];
}

/**
 * Constraints applied during route discovery
 */
export interface RouteConstraints {
  maxHops: number;
  allowedSources: UUID[];
  allowedAssets: UUID[];
  stalenessThreshold: number; // seconds
}

/**
 * Route optimization weights
 */
export interface OptimizationWeights {
  output: number;       // Weight for expected output amount
  cost: number;         // Weight for total cost
  reliability: number;  // Weight for source reliability
  freshness: number;    // Weight for data freshness
  hops: number;         // Weight for number of hops (negative)
  slippage: number;     // Weight for slippage (negative)
}

/**
 * Route score breakdown
 */
export interface RouteScore {
  routeId: UUID;
  totalScore: number;
  breakdown: {
    outputScore: number;
    costScore: number;
    reliabilityScore: number;
    freshnessScore: number;
    hopPenalty: number;
    slippagePenalty: number;
  };
  ranking: number;
  explanation: string;
}

/**
 * Route comparison
 */
export interface RouteComparison {
  routes: Route[];
  scores: RouteScore[];
  recommendation: UUID; // Recommended route ID
  tradeoffs: TradeoffAnalysis[];
}

/**
 * Tradeoff analysis between routes
 */
export interface TradeoffAnalysis {
  metric: string;
  bestRouteId: UUID;
  worstRouteId: UUID;
  difference: DecimalAmount | number;
  unit: string;
  significance: 'low' | 'medium' | 'high';
}

/**
 * Route validation result
 */
export interface RouteValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  checkedAt: Timestamp;
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'critical';
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  recommendation?: string;
}

/**
 * Route statistics
 */
export interface RouteStatistics {
  routeId: UUID;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  
  /** Performance metrics */
  averageExecutionTime: number;
  averageSlippage: DecimalAmount;
  averageCost: DecimalAmount;
  
  /** Volume */
  totalVolume: DecimalAmount;
  
  /** Time range */
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

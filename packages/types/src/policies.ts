import { UUID, Timestamp, DecimalAmount, StellarAddress } from './common';

/**
 * Routing policy for an application
 */
export interface RoutingPolicy {
  id: UUID;
  applicationId: UUID;
  name: string;
  description?: string;
  active: boolean;
  
  /** Asset constraints */
  assetConstraints: AssetConstraints;
  
  /** Execution constraints */
  executionConstraints: ExecutionConstraints;
  
  /** Liquidity constraints */
  liquidityConstraints: LiquidityConstraints;
  
  /** Timing constraints */
  timingConstraints: TimingConstraints;
  
  /** Optimization preferences */
  optimizationPreferences: OptimizationPreferences;
  
  /** Metadata */
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastUsedAt?: Timestamp;
}

/**
 * Asset-related constraints
 */
export interface AssetConstraints {
  /** Allowlists */
  allowedAssets?: UUID[];
  allowedIssuers?: StellarAddress[];
  
  /** Blocklists */
  blockedAssets?: UUID[];
  blockedIssuers?: StellarAddress[];
  
  /** Requirements */
  requireVerifiedAssets?: boolean;
  requireVerifiedIssuers?: boolean;
  maxRiskLevel?: 'low' | 'medium' | 'high';
  
  /** Asset characteristics */
  allowAuthorizationRequired?: boolean;
  allowClawbackEnabled?: boolean;
  allowUnverifiedIssuers?: boolean;
}

/**
 * Execution-related constraints
 */
export interface ExecutionConstraints {
  /** Slippage limits */
  maxSlippage: DecimalAmount; // e.g., "0.01" for 1%
  maxSlippageUsd?: DecimalAmount; // Absolute USD amount
  
  /** Cost limits */
  maxTotalCost?: DecimalAmount;
  maxCostPercentage?: DecimalAmount;
  
  /** Output requirements */
  minimumOutput?: DecimalAmount;
  minimumOutputPercentage?: DecimalAmount; // Of expected output
  
  /** Routing limits */
  maxHops: number;
  preferDirectRoutes?: boolean;
  
  /** Amount limits */
  minTradeAmount?: DecimalAmount;
  maxTradeAmount?: DecimalAmount;
}

/**
 * Liquidity-related constraints
 */
export interface LiquidityConstraints {
  /** Source restrictions */
  allowedSources?: UUID[];
  blockedSources?: UUID[];
  preferredSources?: UUID[];
  
  /** Source requirements */
  minSourceReliability?: number; // 0-100
  requireHealthySources?: boolean;
  
  /** Liquidity requirements */
  minLiquidityDepth?: DecimalAmount;
  minLiquidityUsd?: DecimalAmount;
  
  /** Market requirements */
  maxPriceImpact?: DecimalAmount;
  minVolume24h?: DecimalAmount;
}

/**
 * Timing-related constraints
 */
export interface TimingConstraints {
  /** Quote validity */
  quoteValiditySeconds: number;
  maxQuoteAge?: number;
  
  /** Data freshness */
  maxDataStaleness: number; // seconds
  requireFreshData?: boolean;
  
  /** Execution timing */
  executionDeadline?: Timestamp;
  maxExecutionTime?: number; // seconds
}

/**
 * Optimization preferences
 */
export interface OptimizationPreferences {
  primaryObjective: 'lowest_cost' | 'highest_output' | 'lowest_slippage' | 'fewest_hops' | 'fastest_execution' | 'highest_reliability';
  
  /** Weights for multi-objective optimization */
  weights?: {
    output: number;
    cost: number;
    reliability: number;
    freshness: number;
    speed: number;
  };
  
  /** Fallback behavior */
  allowFallbackRoutes?: boolean;
  fallbackIfSlippageExceeded?: boolean;
}

/**
 * Policy constraint definition
 */
export interface PolicyConstraint {
  id: UUID;
  policyId: UUID;
  type: ConstraintType;
  field: string;
  operator: ConstraintOperator;
  value: any;
  required: boolean;
  errorMessage?: string;
}

/**
 * Constraint types
 */
export type ConstraintType =
  | 'asset'
  | 'execution'
  | 'liquidity'
  | 'timing'
  | 'amount'
  | 'cost'
  | 'slippage';

/**
 * Constraint operators
 */
export type ConstraintOperator =
  | 'eq'
  | 'ne'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'not_contains';

/**
 * Policy evaluation result
 */
export interface PolicyEvaluation {
  policyId: UUID;
  compliant: boolean;
  violations: PolicyViolation[];
  warnings: PolicyWarning[];
  evaluatedAt: Timestamp;
}

/**
 * Policy violation
 */
export interface PolicyViolation {
  constraintId?: UUID;
  type: ConstraintType;
  field: string;
  expectedValue: any;
  actualValue: any;
  message: string;
  severity: 'error' | 'critical';
  canProceed: boolean;
}

/**
 * Policy warning
 */
export interface PolicyWarning {
  type: ConstraintType;
  field: string;
  message: string;
  recommendation?: string;
}

/**
 * Policy template for common use cases
 */
export interface PolicyTemplate {
  id: UUID;
  name: string;
  description: string;
  category: string;
  constraints: Partial<RoutingPolicy>;
  isPublic: boolean;
  usageCount: number;
}

/**
 * Policy application usage
 */
export interface PolicyUsage {
  policyId: UUID;
  applicationId: UUID;
  totalExecutions: number;
  successfulExecutions: number;
  violations: number;
  lastUsed: Timestamp;
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

/**
 * Policy change history
 */
export interface PolicyChangeHistory {
  id: UUID;
  policyId: UUID;
  changedBy: string;
  changeType: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
  changesBefore?: Partial<RoutingPolicy>;
  changesAfter?: Partial<RoutingPolicy>;
  reason?: string;
  timestamp: Timestamp;
}

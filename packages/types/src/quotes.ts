import { UUID, Timestamp, DecimalAmount } from './common';
import { Route } from './routes';

/**
 * Quote type
 */
export type QuoteType = 'indicative' | 'firm';

/**
 * Quote for a specific route
 */
export interface Quote {
  id: UUID;
  routeId: UUID;
  quoteType: QuoteType;
  
  /** Input/Output */
  inputAsset: UUID;
  outputAsset: UUID;
  inputAmount: DecimalAmount;
  expectedOutput: DecimalAmount;
  minimumOutput: DecimalAmount;
  
  /** Pricing */
  effectiveRate: DecimalAmount;
  inverseRate: DecimalAmount;
  
  /** Costs */
  totalFees: DecimalAmount;
  feeBreakdown: FeeBreakdown[];
  
  /** Slippage */
  estimatedSlippage: DecimalAmount;
  maxSlippage: DecimalAmount;
  priceImpact: DecimalAmount;
  
  /** Execution assumptions */
  assumptions: string[];
  risks: RiskIndicator[];
  
  /** Route details */
  route: Route;
  
  /** Data quality */
  dataFreshness: Timestamp;
  oldestDataPoint: Timestamp;
  allDataFresh: boolean;
  
  /** Validity */
  createdAt: Timestamp;
  validUntil: Timestamp;
  expiresIn: number; // seconds
}

/**
 * Fee breakdown by category
 */
export interface FeeBreakdown {
  category: string;
  description: string;
  amount: DecimalAmount;
  percentage: DecimalAmount;
  paidTo?: string;
}

/**
 * Risk indicator
 */
export interface RiskIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation?: string;
}

/**
 * Quote request
 */
export interface QuoteRequest {
  routeId: UUID;
  quoteType?: QuoteType;
  maxSlippage?: DecimalAmount;
  validitySeconds?: number;
  policyId?: UUID;
}

/**
 * Quote response with multiple options
 */
export interface QuoteResponse {
  quotes: Quote[];
  recommended: UUID; // Recommended quote ID
  warnings?: string[];
  generatedAt: Timestamp;
}

/**
 * Quote comparison
 */
export interface QuoteComparison {
  quotes: Quote[];
  bestByOutput: UUID;
  bestByCost: UUID;
  bestBySlippage: UUID;
  metrics: ComparisonMetric[];
}

/**
 * Comparison metric
 */
export interface ComparisonMetric {
  metric: string;
  values: {
    quoteId: UUID;
    value: DecimalAmount | number | string;
  }[];
  best: UUID;
  worst: UUID;
}

/**
 * Quote refresh request
 */
export interface QuoteRefreshRequest {
  quoteId: UUID;
}

/**
 * Quote expiration info
 */
export interface QuoteExpiration {
  quoteId: UUID;
  isExpired: boolean;
  validUntil: Timestamp;
  remainingSeconds: number;
  canRefresh: boolean;
}

/**
 * Historical quote for audit
 */
export interface HistoricalQuote extends Quote {
  executionId?: UUID;
  wasExecuted: boolean;
  actualOutput?: DecimalAmount;
  actualSlippage?: DecimalAmount;
  deviationFromQuote?: DecimalAmount;
}

/**
 * Quote statistics
 */
export interface QuoteStatistics {
  totalQuotes: number;
  quotesExecuted: number;
  executionRate: number;
  
  /** Average metrics */
  averageExpectedOutput: DecimalAmount;
  averageActualOutput: DecimalAmount;
  averageDeviation: DecimalAmount;
  
  /** Accuracy */
  quotesWithinTolerance: number;
  accuracyRate: number;
  
  /** Time range */
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

/**
 * Quote validation result
 */
export interface QuoteValidation {
  isValid: boolean;
  isExpired: boolean;
  dataStale: boolean;
  policyCompliant: boolean;
  errors: string[];
  warnings: string[];
  validatedAt: Timestamp;
}

import {
  UUID,
  Timestamp,
  EntityStatus,
  DecimalAmount,
  ContractId,
  FeeStructure,
} from './common';

/**
 * Liquidity source types
 */
export type LiquiditySourceType =
  | 'stellar_dex'
  | 'liquidity_pool'
  | 'amm'
  | 'anchor'
  | 'bridge'
  | 'custom';

/**
 * Liquidity source representation
 */
export interface LiquiditySource {
  id: UUID;
  type: LiquiditySourceType;
  name: string;
  description?: string;
  status: EntityStatus;
  
  /** Source configuration */
  endpoint?: string;
  contractId?: ContractId;
  supportedAssets: UUID[];
  
  /** Fee structure */
  feeModel: FeeStructure;
  
  /** Reliability metrics */
  reliabilityScore: number; // 0-100
  uptimePercentage: number;
  averageResponseTime: number; // milliseconds
  
  /** Usage statistics */
  totalVolume?: DecimalAmount;
  totalTrades?: number;
  
  /** Health monitoring */
  lastHealthCheck: Timestamp;
  healthStatus: 'healthy' | 'degraded' | 'offline';
  healthMessage?: string;
  
  /** Metadata */
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

/**
 * Market data for a specific asset pair on a liquidity source
 */
export interface MarketData {
  id: UUID;
  sourceId: UUID;
  assetIn: UUID;
  assetOut: UUID;
  
  /** Pricing */
  price: DecimalAmount;
  inversePrice: DecimalAmount;
  
  /** Liquidity depth */
  liquidityDepth: DecimalAmount;
  reserveAssetIn?: DecimalAmount;
  reserveAssetOut?: DecimalAmount;
  
  /** Spread and fees */
  spread: DecimalAmount;
  feePercentage: DecimalAmount;
  
  /** Price impact estimates */
  priceImpact100: DecimalAmount; // Impact for $100 trade
  priceImpact1k: DecimalAmount;  // Impact for $1000 trade
  priceImpact10k: DecimalAmount; // Impact for $10000 trade
  
  /** Volume */
  volume24h: DecimalAmount;
  trades24h: number;
  
  /** Data freshness */
  fetchedAt: Timestamp;
  expiresAt: Timestamp;
  blockNumber?: number;
  ledgerSequence?: number;
}

/**
 * Order book snapshot
 */
export interface OrderBook {
  sourceId: UUID;
  assetBase: UUID;
  assetQuote: UUID;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: DecimalAmount;
  fetchedAt: Timestamp;
}

/**
 * Order book level (price and quantity)
 */
export interface OrderBookLevel {
  price: DecimalAmount;
  quantity: DecimalAmount;
  total: DecimalAmount;
  orderCount?: number;
}

/**
 * Liquidity pool information
 */
export interface LiquidityPool {
  id: UUID;
  sourceId: UUID;
  poolId: string; // On-chain pool identifier
  type: 'constant_product' | 'stable_swap' | 'weighted' | 'concentrated';
  
  /** Pool assets */
  assets: UUID[];
  reserves: DecimalAmount[];
  weights?: DecimalAmount[]; // For weighted pools
  
  /** Pool characteristics */
  feePercentage: DecimalAmount;
  totalLiquidity: DecimalAmount;
  totalShares: DecimalAmount;
  
  /** Performance */
  volume24h: DecimalAmount;
  fees24h: DecimalAmount;
  apy?: DecimalAmount;
  
  /** Metadata */
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Liquidity source capability
 */
export interface LiquiditySourceCapability {
  sourceId: UUID;
  capability: string;
  enabled: boolean;
  configuration?: Record<string, any>;
}

/**
 * Price feed data
 */
export interface PriceFeed {
  id: UUID;
  assetId: UUID;
  sourceId: UUID;
  price: DecimalAmount;
  confidence: DecimalAmount;
  timestamp: Timestamp;
  expiresAt: Timestamp;
}

/**
 * Liquidity aggregation across sources
 */
export interface AggregatedLiquidity {
  assetIn: UUID;
  assetOut: UUID;
  totalLiquidity: DecimalAmount;
  sources: {
    sourceId: UUID;
    liquidity: DecimalAmount;
    share: DecimalAmount; // Percentage
  }[];
  averagePrice: DecimalAmount;
  weightedAveragePrice: DecimalAmount;
  calculatedAt: Timestamp;
}

/**
 * Liquidity source health check result
 */
export interface SourceHealthCheck {
  sourceId: UUID;
  timestamp: Timestamp;
  status: 'healthy' | 'degraded' | 'offline';
  responseTime: number;
  checks: {
    connectivity: boolean;
    dataFreshness: boolean;
    apiResponsive: boolean;
    liquidityAvailable: boolean;
  };
  errors?: string[];
}

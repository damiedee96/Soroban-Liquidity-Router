import {
  UUID,
  Timestamp,
  EntityStatus,
  StellarNetwork,
  StellarAddress,
  DecimalAmount,
} from './common';

/**
 * Asset type on Stellar
 */
export type AssetType = 'native' | 'credit_alphanum4' | 'credit_alphanum12' | 'contract';

/**
 * Asset representation
 */
export interface Asset {
  id: UUID;
  code: string;
  issuer: StellarAddress | 'native';
  type: AssetType;
  network: StellarNetwork;
  status: EntityStatus;
  decimals: number;
  name?: string;
  description?: string;
  iconUrl?: string;
  
  /** Asset characteristics */
  authorizationRequired: boolean;
  authorizationRevocable: boolean;
  authorizationImmutable: boolean;
  clawbackEnabled: boolean;
  
  /** Issuer information */
  issuerInfo?: IssuerInfo;
  
  /** Risk indicators */
  riskLevel?: 'low' | 'medium' | 'high';
  riskFactors?: string[];
  
  /** Metadata */
  createdAt: Timestamp;
  updatedAt: Timestamp;
  verifiedAt?: Timestamp;
}

/**
 * Issuer information
 */
export interface IssuerInfo {
  name?: string;
  description?: string;
  website?: string;
  email?: string;
  logo?: string;
  verified: boolean;
  verificationLevel?: 'basic' | 'enhanced' | 'institutional';
  restrictions?: string[];
  redemptionInstructions?: string;
}

/**
 * Asset pair represents a tradable market between two assets
 */
export interface AssetPair {
  id: UUID;
  baseAsset: UUID;
  quoteAsset: UUID;
  status: EntityStatus;
  
  /** Market statistics */
  volume24h?: DecimalAmount;
  trades24h?: number;
  lastPrice?: DecimalAmount;
  priceChange24h?: DecimalAmount;
  
  /** Liquidity information */
  totalLiquidity?: DecimalAmount;
  
  /** Metadata */
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Asset with full details including issuer and market data
 */
export interface AssetDetails extends Asset {
  pairs: AssetPair[];
  marketData?: AssetMarketData;
  regulations?: AssetRegulations;
}

/**
 * Asset market data
 */
export interface AssetMarketData {
  price?: DecimalAmount;
  volume24h: DecimalAmount;
  marketCap?: DecimalAmount;
  circulatingSupply?: DecimalAmount;
  totalSupply?: DecimalAmount;
  holders?: number;
  lastUpdated: Timestamp;
}

/**
 * Asset regulations and compliance
 */
export interface AssetRegulations {
  jurisdictions?: string[];
  requiresKyc: boolean;
  restrictedCountries?: string[];
  complianceDocuments?: string[];
  regulatoryStatus?: string;
}

/**
 * Asset search filters
 */
export interface AssetSearchFilters {
  code?: string;
  issuer?: StellarAddress;
  network?: StellarNetwork;
  status?: EntityStatus;
  verified?: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
  authorizationRequired?: boolean;
  clawbackEnabled?: boolean;
}

/**
 * Asset allowlist entry
 */
export interface AssetAllowlistEntry {
  id: UUID;
  assetId: UUID;
  applicationId: UUID;
  addedBy: string;
  reason?: string;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

/**
 * Issuer allowlist entry
 */
export interface IssuerAllowlistEntry {
  id: UUID;
  issuerAddress: StellarAddress;
  applicationId: UUID;
  addedBy: string;
  reason?: string;
  trustLevel: 'low' | 'medium' | 'high';
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

import { Decimal } from 'decimal.js';

/**
 * Stellar network types
 */
export type StellarNetwork = 'mainnet' | 'testnet' | 'futurenet';

/**
 * Status types for various entities
 */
export type EntityStatus = 'active' | 'inactive' | 'deprecated' | 'restricted';

/**
 * UUID type
 */
export type UUID = string;

/**
 * ISO 8601 timestamp
 */
export type Timestamp = string;

/**
 * Decimal amount represented as string to avoid precision issues
 */
export type DecimalAmount = string;

/**
 * Address on Stellar network
 */
export type StellarAddress = string;

/**
 * Contract ID for Soroban contracts
 */
export type ContractId = string;

/**
 * Transaction hash
 */
export type TransactionHash = string;

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: Record<string, any>;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  trace?: string;
}

/**
 * Fee structure
 */
export interface FeeStructure {
  type: 'fixed' | 'percentage' | 'tiered';
  value: DecimalAmount;
  currency?: string;
  tiers?: FeeTier[];
}

/**
 * Fee tier for tiered fee structures
 */
export interface FeeTier {
  minAmount: DecimalAmount;
  maxAmount?: DecimalAmount;
  feePercentage: DecimalAmount;
}

/**
 * Time range filter
 */
export interface TimeRange {
  startTime: Timestamp;
  endTime: Timestamp;
}

/**
 * Health status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Timestamp;
  checks: Record<string, HealthCheck>;
}

/**
 * Individual health check
 */
export interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  responseTime?: number;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: UUID;
  timestamp: Timestamp;
  actor: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Configuration object
 */
export interface Configuration {
  id: UUID;
  key: string;
  value: any;
  category: string;
  description?: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

/**
 * Error codes for the Soroban Liquidity Router
 */

/**
 * Base error class for all router errors
 */
export class RouterError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'RouterError';
    Object.setPrototypeOf(this, RouterError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Authentication errors (401)
 */
export class AuthenticationError extends RouterError {
  constructor(message: string = 'Authentication failed', details?: Record<string, any>) {
    super('AUTHENTICATION_ERROR', message, 401, details);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization errors (403)
 */
export class AuthorizationError extends RouterError {
  constructor(message: string = 'Insufficient permissions', details?: Record<string, any>) {
    super('AUTHORIZATION_ERROR', message, 403, details);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends RouterError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Not found errors (404)
 */
export class NotFoundError extends RouterError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super('NOT_FOUND', message, 404, { resource, identifier });
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Route discovery errors
 */
export class RouteDiscoveryError extends RouterError {
  constructor(message: string, details?: Record<string, any>) {
    super('ROUTE_DISCOVERY_ERROR', message, 400, details);
    this.name = 'RouteDiscoveryError';
    Object.setPrototypeOf(this, RouteDiscoveryError.prototype);
  }
}

export class NoRouteFoundError extends RouteDiscoveryError {
  constructor(inputAsset: string, outputAsset: string) {
    super(`No route found from ${inputAsset} to ${outputAsset}`, {
      inputAsset,
      outputAsset,
    });
    this.name = 'NoRouteFoundError';
    Object.setPrototypeOf(this, NoRouteFoundError.prototype);
  }
}

/**
 * Quote errors
 */
export class QuoteError extends RouterError {
  constructor(message: string, details?: Record<string, any>) {
    super('QUOTE_ERROR', message, 400, details);
    this.name = 'QuoteError';
    Object.setPrototypeOf(this, QuoteError.prototype);
  }
}

export class QuoteExpiredError extends QuoteError {
  constructor(quoteId: string, expiredAt: string) {
    super(`Quote ${quoteId} expired at ${expiredAt}`, { quoteId, expiredAt });
    this.name = 'QuoteExpiredError';
    Object.setPrototypeOf(this, QuoteExpiredError.prototype);
  }
}

export class StaleDataError extends QuoteError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, details);
    this.name = 'StaleDataError';
    Object.setPrototypeOf(this, StaleDataError.prototype);
  }
}

/**
 * Policy errors
 */
export class PolicyError extends RouterError {
  constructor(message: string, details?: Record<string, any>) {
    super('POLICY_ERROR', message, 400, details);
    this.name = 'PolicyError';
    Object.setPrototypeOf(this, PolicyError.prototype);
  }
}

export class PolicyViolationError extends PolicyError {
  constructor(policyId: string, violations: string[]) {
    super(`Policy ${policyId} violated`, { policyId, violations });
    this.name = 'PolicyViolationError';
    Object.setPrototypeOf(this, PolicyViolationError.prototype);
  }
}

/**
 * Execution errors
 */
export class ExecutionError extends RouterError {
  constructor(message: string, code: string = 'EXECUTION_ERROR', details?: Record<string, any>) {
    super(code, message, 500, details);
    this.name = 'ExecutionError';
    Object.setPrototypeOf(this, ExecutionError.prototype);
  }
}

export class SimulationError extends ExecutionError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'SIMULATION_ERROR', details);
    this.name = 'SimulationError';
    Object.setPrototypeOf(this, SimulationError.prototype);
  }
}

export class InsufficientBalanceError extends ExecutionError {
  constructor(asset: string, required: string, available: string) {
    super(
      `Insufficient balance: required ${required} ${asset}, available ${available}`,
      'INSUFFICIENT_BALANCE',
      { asset, required, available }
    );
    this.name = 'InsufficientBalanceError';
    Object.setPrototypeOf(this, InsufficientBalanceError.prototype);
  }
}

export class SlippageExceededError extends ExecutionError {
  constructor(expected: string, actual: string, maxSlippage: string) {
    super(
      `Slippage exceeded: expected ${expected}, actual ${actual}, max allowed ${maxSlippage}`,
      'SLIPPAGE_EXCEEDED',
      { expected, actual, maxSlippage }
    );
    this.name = 'SlippageExceededError';
    Object.setPrototypeOf(this, SlippageExceededError.prototype);
  }
}

export class TransactionFailedError extends ExecutionError {
  constructor(transactionId: string, reason: string, details?: Record<string, any>) {
    super(
      `Transaction ${transactionId} failed: ${reason}`,
      'TRANSACTION_FAILED',
      { transactionId, reason, ...details }
    );
    this.name = 'TransactionFailedError';
    Object.setPrototypeOf(this, TransactionFailedError.prototype);
  }
}

/**
 * Liquidity errors
 */
export class LiquidityError extends RouterError {
  constructor(message: string, details?: Record<string, any>) {
    super('LIQUIDITY_ERROR', message, 400, details);
    this.name = 'LiquidityError';
    Object.setPrototypeOf(this, LiquidityError.prototype);
  }
}

export class InsufficientLiquidityError extends LiquidityError {
  constructor(assetPair: string, required: string, available: string) {
    super(
      `Insufficient liquidity for ${assetPair}: required ${required}, available ${available}`,
      { assetPair, required, available }
    );
    this.name = 'InsufficientLiquidityError';
    Object.setPrototypeOf(this, InsufficientLiquidityError.prototype);
  }
}

export class SourceUnavailableError extends LiquidityError {
  constructor(sourceId: string, sourceName: string) {
    super(`Liquidity source ${sourceName} (${sourceId}) is unavailable`, {
      sourceId,
      sourceName,
    });
    this.name = 'SourceUnavailableError';
    Object.setPrototypeOf(this, SourceUnavailableError.prototype);
  }
}

/**
 * Asset errors
 */
export class AssetError extends RouterError {
  constructor(message: string, details?: Record<string, any>) {
    super('ASSET_ERROR', message, 400, details);
    this.name = 'AssetError';
    Object.setPrototypeOf(this, AssetError.prototype);
  }
}

export class UnsupportedAssetError extends AssetError {
  constructor(asset: string) {
    super(`Asset ${asset} is not supported`, { asset });
    this.name = 'UnsupportedAssetError';
    Object.setPrototypeOf(this, UnsupportedAssetError.prototype);
  }
}

export class RestrictedAssetError extends AssetError {
  constructor(asset: string, reason: string) {
    super(`Asset ${asset} is restricted: ${reason}`, { asset, reason });
    this.name = 'RestrictedAssetError';
    Object.setPrototypeOf(this, RestrictedAssetError.prototype);
  }
}

/**
 * Rate limiting errors (429)
 */
export class RateLimitError extends RouterError {
  constructor(
    public readonly retryAfter: number,
    message: string = 'Rate limit exceeded'
  ) {
    super('RATE_LIMIT_EXCEEDED', message, 429, { retryAfter });
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Timeout errors (408)
 */
export class TimeoutError extends RouterError {
  constructor(operation: string, timeoutMs: number) {
    super(
      'TIMEOUT',
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      408,
      { operation, timeoutMs }
    );
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Network/External service errors (502, 503)
 */
export class ExternalServiceError extends RouterError {
  constructor(service: string, message: string, details?: Record<string, any>) {
    super('EXTERNAL_SERVICE_ERROR', `${service}: ${message}`, 502, {
      service,
      ...details,
    });
    this.name = 'ExternalServiceError';
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * Internal server errors (500)
 */
export class InternalServerError extends RouterError {
  constructor(message: string = 'Internal server error', details?: Record<string, any>) {
    super('INTERNAL_ERROR', message, 500, details);
    this.name = 'InternalServerError';
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * Database errors
 */
export class DatabaseError extends RouterError {
  constructor(operation: string, message: string, details?: Record<string, any>) {
    super('DATABASE_ERROR', `Database ${operation} failed: ${message}`, 500, {
      operation,
      ...details,
    });
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends RouterError {
  constructor(message: string, details?: Record<string, any>) {
    super('CONFIGURATION_ERROR', message, 500, details);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Error code constants
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  INVALID_API_KEY: 'INVALID_API_KEY',
  EXPIRED_API_KEY: 'EXPIRED_API_KEY',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ASSET_NOT_FOUND: 'ASSET_NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  QUOTE_NOT_FOUND: 'QUOTE_NOT_FOUND',
  
  // Routes
  ROUTE_DISCOVERY_ERROR: 'ROUTE_DISCOVERY_ERROR',
  NO_ROUTE_FOUND: 'NO_ROUTE_FOUND',
  MAX_HOPS_EXCEEDED: 'MAX_HOPS_EXCEEDED',
  
  // Quotes
  QUOTE_ERROR: 'QUOTE_ERROR',
  QUOTE_EXPIRED: 'QUOTE_EXPIRED',
  STALE_DATA: 'STALE_DATA',
  
  // Policy
  POLICY_ERROR: 'POLICY_ERROR',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  POLICY_NOT_FOUND: 'POLICY_NOT_FOUND',
  
  // Execution
  EXECUTION_ERROR: 'EXECUTION_ERROR',
  SIMULATION_ERROR: 'SIMULATION_ERROR',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  SLIPPAGE_EXCEEDED: 'SLIPPAGE_EXCEEDED',
  DEADLINE_EXCEEDED: 'DEADLINE_EXCEEDED',
  
  // Liquidity
  LIQUIDITY_ERROR: 'LIQUIDITY_ERROR',
  INSUFFICIENT_LIQUIDITY: 'INSUFFICIENT_LIQUIDITY',
  SOURCE_UNAVAILABLE: 'SOURCE_UNAVAILABLE',
  
  // Assets
  ASSET_ERROR: 'ASSET_ERROR',
  UNSUPPORTED_ASSET: 'UNSUPPORTED_ASSET',
  RESTRICTED_ASSET: 'RESTRICTED_ASSET',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // System
  TIMEOUT: 'TIMEOUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

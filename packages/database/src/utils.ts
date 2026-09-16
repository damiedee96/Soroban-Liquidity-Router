import { Prisma } from '@prisma/client';
import { Decimal } from 'decimal.js';

/**
 * Utility functions for database operations
 */

/**
 * Convert Decimal.js to Prisma Decimal
 */
export function toPrismaDecimal(value: string | number | Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value.toString());
}

/**
 * Convert Prisma Decimal to string
 */
export function fromPrismaDecimal(value: Prisma.Decimal): string {
  return value.toString();
}

/**
 * Pagination helper
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult {
  skip: number;
  take: number;
}

export function calculatePagination(params: PaginationParams): PaginationResult {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 50));

  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * Build pagination metadata
 */
export interface PaginationMetadata {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function buildPaginationMetadata(
  totalItems: number,
  currentPage: number,
  pageSize: number
): PaginationMetadata {
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}

/**
 * Generate unique idempotency key
 */
export function generateIdempotencyKey(prefix: string = 'exec'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Check if data is stale based on threshold
 */
export function isDataStale(fetchedAt: Date, thresholdSeconds: number): boolean {
  const now = new Date();
  const ageSeconds = (now.getTime() - fetchedAt.getTime()) / 1000;
  return ageSeconds > thresholdSeconds;
}

/**
 * Calculate expiration time
 */
export function calculateExpiration(validitySeconds: number): Date {
  const now = new Date();
  return new Date(now.getTime() + validitySeconds * 1000);
}

/**
 * Format asset identifier
 */
export function formatAssetIdentifier(code: string, issuer: string): string {
  return issuer === 'native' ? `${code}:native` : `${code}:${issuer}`;
}

/**
 * Parse asset identifier
 */
export function parseAssetIdentifier(identifier: string): {
  code: string;
  issuer: string;
} {
  const [code, issuer] = identifier.split(':');
  if (!code || !issuer) {
    throw new Error(`Invalid asset identifier: ${identifier}`);
  }
  return { code, issuer };
}

/**
 * Transaction retry helper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || // Unique constraint violation
          error.code === 'P2003' || // Foreign key constraint violation
          error.code === 'P2025') // Record not found
      ) {
        throw error;
      }

      // Calculate backoff delay
      const delay = baseDelayMs * Math.pow(2, attempt);

      // Wait before retry (except on last attempt)
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Build search filter for text fields
 */
export function buildSearchFilter(searchTerm?: string, fields: string[] = []) {
  if (!searchTerm || fields.length === 0) {
    return undefined;
  }

  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive' as const,
      },
    })),
  };
}

/**
 * Build date range filter
 */
export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

export function buildDateRangeFilter(field: string, range?: DateRange) {
  if (!range || (!range.startDate && !range.endDate)) {
    return undefined;
  }

  const filter: Record<string, any> = {};

  if (range.startDate) {
    filter.gte = range.startDate;
  }

  if (range.endDate) {
    filter.lte = range.endDate;
  }

  return { [field]: filter };
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Safe JSON parse with fallback
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Batch operation helper
 */
export async function batchOperation<T, R>(
  items: T[],
  operation: (batch: T[]) => Promise<R[]>,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await operation(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Transaction isolation levels
 */
export const ISOLATION_LEVELS = {
  READ_UNCOMMITTED: Prisma.TransactionIsolationLevel.ReadUncommitted,
  READ_COMMITTED: Prisma.TransactionIsolationLevel.ReadCommitted,
  REPEATABLE_READ: Prisma.TransactionIsolationLevel.RepeatableRead,
  SERIALIZABLE: Prisma.TransactionIsolationLevel.Serializable,
} as const;

/**
 * Common where clauses
 */
export const CommonFilters = {
  active: { status: 'ACTIVE' },
  notDeleted: { deletedAt: null },
  recent: (days: number) => ({
    createdAt: {
      gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    },
  }),
};

/**
 * Sort direction type
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Build order by clause
 */
export function buildOrderBy(sortBy?: string, sortOrder: SortDirection = 'desc') {
  if (!sortBy) {
    return { createdAt: 'desc' };
  }

  return { [sortBy]: sortOrder };
}

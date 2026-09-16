import { ValidationError } from '@soroban-router/types';
import { Decimal } from 'decimal.js';

/**
 * Validation utilities
 */

/**
 * Validate Stellar address format
 */
export function isValidStellarAddress(address: string): boolean {
  // Stellar addresses are 56 characters starting with G
  const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
  return stellarAddressRegex.test(address);
}

/**
 * Validate asset code format
 */
export function isValidAssetCode(code: string): boolean {
  // Asset codes are 1-12 alphanumeric characters
  return /^[a-zA-Z0-9]{1,12}$/.test(code);
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
 * Validate decimal amount
 */
export function isValidAmount(amount: string): boolean {
  try {
    const decimal = new Decimal(amount);
    return decimal.isPositive() && decimal.isFinite();
  } catch {
    return false;
  }
}

/**
 * Validate percentage (0-100)
 */
export function isValidPercentage(percentage: string | number): boolean {
  try {
    const decimal = new Decimal(percentage);
    return (
      decimal.greaterThanOrEqualTo(0) &&
      decimal.lessThanOrEqualTo(100) &&
      decimal.isFinite()
    );
  } catch {
    return false;
  }
}

/**
 * Validate decimal is between 0 and 1
 */
export function isValidRatio(ratio: string | number): boolean {
  try {
    const decimal = new Decimal(ratio);
    return (
      decimal.greaterThanOrEqualTo(0) && decimal.lessThanOrEqualTo(1) && decimal.isFinite()
    );
  } catch {
    return false;
  }
}

/**
 * Validate asset identifier format (CODE:ISSUER)
 */
export function parseAssetIdentifier(identifier: string): {
  code: string;
  issuer: string;
} {
  const parts = identifier.split(':');
  if (parts.length !== 2) {
    throw new ValidationError(
      `Invalid asset identifier format: ${identifier}. Expected format: CODE:ISSUER`
    );
  }

  const [code, issuer] = parts;

  if (!code || !issuer) {
    throw new ValidationError(`Invalid asset identifier: ${identifier}`);
  }

  if (!isValidAssetCode(code)) {
    throw new ValidationError(`Invalid asset code: ${code}`);
  }

  if (issuer !== 'native' && !isValidStellarAddress(issuer)) {
    throw new ValidationError(`Invalid issuer address: ${issuer}`);
  }

  return { code, issuer };
}

/**
 * Format asset identifier
 */
export function formatAssetIdentifier(code: string, issuer: string): string {
  return `${code}:${issuer}`;
}

/**
 * Validate hop count
 */
export function validateHopCount(hops: number, maxHops: number = 5): void {
  if (!Number.isInteger(hops) || hops < 1) {
    throw new ValidationError('Hop count must be a positive integer');
  }

  if (hops > maxHops) {
    throw new ValidationError(`Hop count ${hops} exceeds maximum of ${maxHops}`);
  }
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(page?: number, limit?: number): void {
  if (page !== undefined) {
    if (!Number.isInteger(page) || page < 1) {
      throw new ValidationError('Page must be a positive integer');
    }
  }

  if (limit !== undefined) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
  }
}

/**
 * Validate required fields
 */
export function validateRequired<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): void {
  const missing: string[] = [];

  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(String(field));
    }
  }

  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string,
  enumValues: readonly T[],
  fieldName: string
): T {
  if (!enumValues.includes(value as T)) {
    throw new ValidationError(
      `Invalid ${fieldName}: ${value}. Must be one of: ${enumValues.join(', ')}`
    );
  }
  return value as T;
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input.trim().slice(0, maxLength);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate webhook URL
 */
export function validateWebhookUrl(url: string): void {
  if (!isValidUrl(url)) {
    throw new ValidationError(`Invalid webhook URL: ${url}`);
  }

  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'https:') {
    throw new ValidationError('Webhook URL must use HTTPS protocol');
  }
}

/**
 * Validate deadline is in the future
 */
export function validateDeadline(deadline: Date): void {
  const now = new Date();
  if (deadline <= now) {
    throw new ValidationError('Deadline must be in the future');
  }
}

/**
 * Validate time range
 */
export function validateTimeRange(startDate: Date, endDate: Date): void {
  if (startDate >= endDate) {
    throw new ValidationError('Start date must be before end date');
  }

  const now = new Date();
  if (endDate > now) {
    throw new ValidationError('End date cannot be in the future');
  }
}

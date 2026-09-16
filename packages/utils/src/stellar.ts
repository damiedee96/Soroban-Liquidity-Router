/**
 * Stellar-specific utilities
 */

/**
 * Stellar asset types
 */
export enum StellarAssetType {
  NATIVE = 'native',
  CREDIT_ALPHANUM4 = 'credit_alphanum4',
  CREDIT_ALPHANUM12 = 'credit_alphanum12',
}

/**
 * Determine Stellar asset type from code
 */
export function getStellarAssetType(code: string): StellarAssetType {
  if (code === 'XLM') {
    return StellarAssetType.NATIVE;
  } else if (code.length <= 4) {
    return StellarAssetType.CREDIT_ALPHANUM4;
  } else if (code.length <= 12) {
    return StellarAssetType.CREDIT_ALPHANUM12;
  } else {
    throw new Error(`Invalid asset code length: ${code}`);
  }
}

/**
 * Convert Stellar stroops to XLM
 */
export function stroopsToXlm(stroops: string | number): string {
  const stroopsNum = typeof stroops === 'string' ? parseFloat(stroops) : stroops;
  return (stroopsNum / 10000000).toFixed(7);
}

/**
 * Convert XLM to Stellar stroops
 */
export function xlmToStroops(xlm: string | number): string {
  const xlmNum = typeof xlm === 'string' ? parseFloat(xlm) : xlm;
  return Math.floor(xlmNum * 10000000).toString();
}

/**
 * Format Stellar asset for display
 */
export function formatStellarAsset(code: string, issuer: string): string {
  if (code === 'XLM' && issuer === 'native') {
    return 'XLM';
  }
  return `${code}:${issuer.substring(0, 4)}...${issuer.substring(issuer.length - 4)}`;
}

/**
 * Validate Stellar network passphrase
 */
export function getStellarNetworkPassphrase(network: 'mainnet' | 'testnet' | 'futurenet'): string {
  const passphrases = {
    mainnet: 'Public Global Stellar Network ; September 2015',
    testnet: 'Test SDF Network ; September 2015',
    futurenet: 'Test SDF Future Network ; October 2022',
  };

  return passphrases[network];
}

/**
 * Calculate Stellar transaction fee
 */
export function calculateStellarFee(operationCount: number, baseFee: number = 100): number {
  return operationCount * baseFee;
}

/**
 * Stellar DEX price representation
 */
export interface StellarPrice {
  n: number; // numerator
  d: number; // denominator
}

/**
 * Convert decimal price to Stellar price format
 */
export function decimalToStellarPrice(price: number): StellarPrice {
  const precision = 1000000; // 6 decimal places
  const n = Math.round(price * precision);
  const d = precision;

  // Simplify fraction
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(n, d);

  return {
    n: n / divisor,
    d: d / divisor,
  };
}

/**
 * Convert Stellar price to decimal
 */
export function stellarPriceToDecimal(price: StellarPrice): number {
  return price.n / price.d;
}

/**
 * Check if account requires authorization
 */
export function requiresAuthorization(flags: number): boolean {
  const AUTH_REQUIRED_FLAG = 1;
  return (flags & AUTH_REQUIRED_FLAG) !== 0;
}

/**
 * Check if account can be clawed back
 */
export function isClawbackEnabled(flags: number): boolean {
  const CLAWBACK_ENABLED_FLAG = 8;
  return (flags & CLAWBACK_ENABLED_FLAG) !== 0;
}

/**
 * Generate liquidity pool ID (simplified)
 */
export function generatePoolId(assetA: string, assetB: string): string {
  // In production, would use proper Stellar pool ID generation
  const sorted = [assetA, assetB].sort();
  return `pool_${sorted[0]}_${sorted[1]}`;
}

/**
 * Validate Stellar memo
 */
export function isValidMemo(memo: string, type: 'text' | 'id' | 'hash' | 'return'): boolean {
  switch (type) {
    case 'text':
      return memo.length <= 28;
    case 'id':
      return /^\d+$/.test(memo) && BigInt(memo) <= BigInt('18446744073709551615');
    case 'hash':
    case 'return':
      return /^[0-9a-fA-F]{64}$/.test(memo);
    default:
      return false;
  }
}

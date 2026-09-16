import { Decimal } from 'decimal.js';

/**
 * Financial and routing calculation utilities
 */

// Configure Decimal.js for financial precision
Decimal.set({
  precision: 30,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 30,
});

/**
 * Calculate output amount after fees
 */
export function calculateOutputAfterFee(
  inputAmount: string | Decimal,
  feePercentage: string | Decimal
): Decimal {
  const input = new Decimal(inputAmount);
  const fee = new Decimal(feePercentage);

  if (fee.greaterThan(1)) {
    throw new Error('Fee percentage must be between 0 and 1');
  }

  return input.times(new Decimal(1).minus(fee));
}

/**
 * Calculate price impact for a trade
 */
export function calculatePriceImpact(
  tradeAmount: string | Decimal,
  liquidity: string | Decimal
): Decimal {
  const amount = new Decimal(tradeAmount);
  const liquidityDepth = new Decimal(liquidity);

  if (liquidityDepth.isZero()) {
    return new Decimal(1); // 100% impact
  }

  return amount.dividedBy(liquidityDepth);
}

/**
 * Calculate effective exchange rate
 */
export function calculateEffectiveRate(
  inputAmount: string | Decimal,
  outputAmount: string | Decimal
): Decimal {
  const input = new Decimal(inputAmount);
  const output = new Decimal(outputAmount);

  if (input.isZero()) {
    throw new Error('Input amount cannot be zero');
  }

  return output.dividedBy(input);
}

/**
 * Calculate slippage percentage
 */
export function calculateSlippage(
  expectedOutput: string | Decimal,
  actualOutput: string | Decimal
): Decimal {
  const expected = new Decimal(expectedOutput);
  const actual = new Decimal(actualOutput);

  if (expected.isZero()) {
    throw new Error('Expected output cannot be zero');
  }

  return expected.minus(actual).dividedBy(expected).abs();
}

/**
 * Calculate minimum output with slippage tolerance
 */
export function calculateMinimumOutput(
  expectedOutput: string | Decimal,
  slippageTolerance: string | Decimal
): Decimal {
  const expected = new Decimal(expectedOutput);
  const tolerance = new Decimal(slippageTolerance);

  if (tolerance.greaterThan(1)) {
    throw new Error('Slippage tolerance must be between 0 and 1');
  }

  return expected.times(new Decimal(1).minus(tolerance));
}

/**
 * Calculate compound output through multi-hop route
 */
export function calculateCompoundOutput(
  inputAmount: string | Decimal,
  rates: (string | Decimal)[],
  fees: (string | Decimal)[]
): Decimal {
  if (rates.length !== fees.length) {
    throw new Error('Rates and fees arrays must have the same length');
  }

  let amount = new Decimal(inputAmount);

  for (let i = 0; i < rates.length; i++) {
    const rate = new Decimal(rates[i]!);
    const fee = new Decimal(fees[i]!);

    // Apply rate
    amount = amount.times(rate);

    // Apply fee
    amount = calculateOutputAfterFee(amount, fee);
  }

  return amount;
}

/**
 * Calculate total fees for a route
 */
export function calculateTotalFees(
  inputAmount: string | Decimal,
  feePercentages: (string | Decimal)[],
  fixedFees: (string | Decimal)[] = []
): Decimal {
  const input = new Decimal(inputAmount);
  let totalFee = new Decimal(0);
  let currentAmount = input;

  // Variable fees (percentage-based)
  for (const feePercentage of feePercentages) {
    const fee = new Decimal(feePercentage);
    const feeAmount = currentAmount.times(fee);
    totalFee = totalFee.plus(feeAmount);
    currentAmount = currentAmount.minus(feeAmount);
  }

  // Fixed fees
  for (const fixedFee of fixedFees) {
    totalFee = totalFee.plus(new Decimal(fixedFee));
  }

  return totalFee;
}

/**
 * Calculate price with constant product formula (x * y = k)
 */
export function calculateConstantProductPrice(
  reserveIn: string | Decimal,
  reserveOut: string | Decimal,
  amountIn: string | Decimal
): Decimal {
  const xReserve = new Decimal(reserveIn);
  const yReserve = new Decimal(reserveOut);
  const dx = new Decimal(amountIn);

  if (xReserve.isZero() || yReserve.isZero()) {
    throw new Error('Reserves cannot be zero');
  }

  // k = x * y
  const k = xReserve.times(yReserve);

  // dy = y - (k / (x + dx))
  const newX = xReserve.plus(dx);
  const newY = k.dividedBy(newX);
  const dy = yReserve.minus(newY);

  return dy;
}

/**
 * Calculate optimal split for parallel routes
 */
export function calculateOptimalSplit(
  totalAmount: string | Decimal,
  routes: Array<{ liquidity: string | Decimal; rate: string | Decimal }>
): Decimal[] {
  // Simple proportional split based on liquidity
  // In production, would use more sophisticated optimization
  const total = new Decimal(totalAmount);
  const totalLiquidity = routes.reduce(
    (sum, route) => sum.plus(new Decimal(route.liquidity)),
    new Decimal(0)
  );

  if (totalLiquidity.isZero()) {
    throw new Error('Total liquidity cannot be zero');
  }

  return routes.map((route) => {
    const liquidity = new Decimal(route.liquidity);
    return total.times(liquidity.dividedBy(totalLiquidity));
  });
}

/**
 * Calculate weighted average
 */
export function calculateWeightedAverage(
  values: (string | Decimal)[],
  weights: (string | Decimal)[]
): Decimal {
  if (values.length !== weights.length) {
    throw new Error('Values and weights arrays must have the same length');
  }

  let weightedSum = new Decimal(0);
  let totalWeight = new Decimal(0);

  for (let i = 0; i < values.length; i++) {
    const value = new Decimal(values[i]!);
    const weight = new Decimal(weights[i]!);

    weightedSum = weightedSum.plus(value.times(weight));
    totalWeight = totalWeight.plus(weight);
  }

  if (totalWeight.isZero()) {
    throw new Error('Total weight cannot be zero');
  }

  return weightedSum.dividedBy(totalWeight);
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(
  oldValue: string | Decimal,
  newValue: string | Decimal
): Decimal {
  const old = new Decimal(oldValue);
  const current = new Decimal(newValue);

  if (old.isZero()) {
    return new Decimal(0);
  }

  return current.minus(old).dividedBy(old).times(100);
}

/**
 * Compare amounts with tolerance
 */
export function areAmountsEqual(
  amount1: string | Decimal,
  amount2: string | Decimal,
  tolerance: string | Decimal = '0.000001'
): boolean {
  const a1 = new Decimal(amount1);
  const a2 = new Decimal(amount2);
  const tol = new Decimal(tolerance);

  return a1.minus(a2).abs().lessThanOrEqualTo(tol);
}

/**
 * Round to specified decimal places
 */
export function roundToDecimals(
  value: string | Decimal,
  decimalPlaces: number
): Decimal {
  return new Decimal(value).toDecimalPlaces(decimalPlaces);
}

/**
 * Convert to human-readable format
 */
export function formatAmount(
  value: string | Decimal,
  decimalPlaces: number = 7
): string {
  return new Decimal(value).toFixed(decimalPlaces);
}

/**
 * Convert to percentage string
 */
export function formatPercentage(
  value: string | Decimal,
  decimalPlaces: number = 2
): string {
  return `${new Decimal(value).times(100).toFixed(decimalPlaces)}%`;
}

/**
 * Calculate APY (Annual Percentage Yield)
 */
export function calculateAPY(
  principal: string | Decimal,
  interest: string | Decimal,
  periods: number
): Decimal {
  const p = new Decimal(principal);
  const i = new Decimal(interest);

  if (p.isZero()) {
    return new Decimal(0);
  }

  const rate = i.dividedBy(p);
  const apy = new Decimal(1).plus(rate.dividedBy(periods)).pow(periods).minus(1);

  return apy;
}

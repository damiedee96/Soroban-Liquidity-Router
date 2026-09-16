import { prisma } from '@soroban-router/database';
import {
  Quote,
  QuoteRequest,
  FeeBreakdown,
  NotFoundError,
  QuoteExpiredError,
} from '@soroban-router/types';
import { createLogger, calculateMinimumOutput } from '@soroban-router/utils';
import { RouteDiscoveryService } from './RouteDiscoveryService';
import { Decimal } from 'decimal.js';

const logger = createLogger('QuoteService');

/**
 * Quote Service
 * Generates price quotes with fees and slippage calculations
 */
export class QuoteService {
  private routeDiscovery: RouteDiscoveryService;

  constructor() {
    this.routeDiscovery = new RouteDiscoveryService();
  }

  /**
   * Generate quote for a route
   */
  async generateQuote(routeId: string, params: QuoteRequest): Promise<Quote> {
    const route = await this.routeDiscovery.getRoute(routeId);

    // Validate route is still valid
    const isValid = await this.routeDiscovery.validateRoute(routeId);
    if (!isValid) {
      throw new QuoteExpiredError(routeId, route.validUntil.toISOString());
    }

    // Calculate expected output through all steps
    const expectedOutput = this.calculateExpectedOutput(route);

    // Calculate total fees
    const { totalFees, breakdown } = this.calculateTotalFees(route);

    // Calculate slippage estimate
    const estimatedSlippage = this.calculateSlippage(route);

    // Calculate minimum output with slippage tolerance
    const maxSlippage = params.maxSlippage || '0.01';
    const minimumOutput = calculateMinimumOutput(expectedOutput, maxSlippage);

    // Calculate effective rate
    const inputAmount = new Decimal(route.steps[0]!.inputAmount);
    const effectiveRate = new Decimal(expectedOutput).dividedBy(inputAmount);
    const inverseRate = new Decimal(1).dividedBy(effectiveRate);

    // Determine quote validity
    const validitySeconds = params.validitySeconds || 60;
    const validUntil = new Date(Date.now() + validitySeconds * 1000);

    // Create quote
    const quote = await prisma.quote.create({
      data: {
        routeId,
        quoteType: params.quoteType || 'FIRM',
        inputAssetId: route.inputAssetId,
        outputAssetId: route.outputAssetId,
        inputAmount: inputAmount.toString(),
        expectedOutput: expectedOutput.toString(),
        minimumOutput: minimumOutput.toString(),
        effectiveRate: effectiveRate.toString(),
        inverseRate: inverseRate.toString(),
        totalFees: totalFees.toString(),
        estimatedSlippage: estimatedSlippage.toString(),
        maxSlippage,
        priceImpact: this.calculatePriceImpact(route),
        assumptions: this.buildAssumptions(route),
        risks: this.identifyRisks(route),
        dataFreshness: route.dataFreshness,
        oldestDataPoint: route.dataFreshness,
        allDataFresh: route.allDataFresh,
        validUntil,
      },
    });

    logger.info('Quote generated', {
      quoteId: quote.id,
      routeId,
      expectedOutput: expectedOutput.toString(),
    });

    return {
      ...quote,
      route: route as any,
      feeBreakdown: breakdown,
      expiresIn: validitySeconds,
    } as any;
  }

  /**
   * Calculate expected output through route
   */
  private calculateExpectedOutput(route: any): Decimal {
    let amount = new Decimal(route.steps[0].inputAmount);

    for (const step of route.steps) {
      amount = new Decimal(step.expectedOutput);
    }

    return amount;
  }

  /**
   * Calculate total fees
   */
  private calculateTotalFees(route: any): {
    totalFees: Decimal;
    breakdown: FeeBreakdown[];
  } {
    const breakdown: FeeBreakdown[] = [];
    let totalFees = new Decimal(0);

    for (const step of route.steps) {
      const fee = new Decimal(step.fee);
      totalFees = totalFees.plus(fee);

      breakdown.push({
        category: `Hop ${step.stepNumber}`,
        description: `${step.sourceName} trading fee`,
        amount: fee.toString(),
        percentage: step.feePercentage,
        paidTo: step.sourceId,
      });
    }

    return { totalFees, breakdown };
  }

  /**
   * Calculate slippage estimate
   */
  private calculateSlippage(route: any): Decimal {
    // Simplified: use average price impact
    let totalImpact = new Decimal(0);

    for (const step of route.steps) {
      totalImpact = totalImpact.plus(new Decimal(step.priceImpact));
    }

    return totalImpact.dividedBy(route.steps.length);
  }

  /**
   * Calculate total price impact
   */
  private calculatePriceImpact(route: any): string {
    let cumulativeImpact = new Decimal(1);

    for (const step of route.steps) {
      const impact = new Decimal(1).plus(step.priceImpact);
      cumulativeImpact = cumulativeImpact.times(impact);
    }

    return cumulativeImpact.minus(1).toString();
  }

  /**
   * Build execution assumptions
   */
  private buildAssumptions(route: any): any {
    return [
      `Route valid until ${route.validUntil.toISOString()}`,
      `Market data age: ${Math.floor((Date.now() - route.dataFreshness.getTime()) / 1000)}s`,
      `${route.steps.length} hop(s) required`,
      'Assumes sufficient liquidity at execution time',
      'Gas fees not included in estimate',
    ];
  }

  /**
   * Identify risks
   */
  private identifyRisks(route: any): any {
    const risks = [];

    if (!route.allDataFresh) {
      risks.push({
        type: 'stale_data',
        severity: 'medium',
        description: 'Some market data may be stale',
      });
    }

    if (route.hopCount > 2) {
      risks.push({
        type: 'complex_route',
        severity: 'low',
        description: 'Multi-hop route increases execution risk',
      });
    }

    return risks;
  }

  /**
   * Get quote by ID
   */
  async getQuote(quoteId: string): Promise<Quote> {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { route: { include: { steps: true } } },
    });

    if (!quote) {
      throw new NotFoundError('Quote', quoteId);
    }

    return quote as any;
  }

  /**
   * Refresh quote
   */
  async refreshQuote(quoteId: string): Promise<Quote> {
    const oldQuote = await this.getQuote(quoteId);
    return this.generateQuote(oldQuote.routeId, {
      quoteType: oldQuote.quoteType as any,
      maxSlippage: oldQuote.maxSlippage,
    });
  }
}

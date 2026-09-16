import { UUID, Timestamp, DecimalAmount, TransactionHash, ContractId } from './common';
import { Quote } from './quotes';
import { Route } from './routes';

/**
 * Execution status
 */
export type ExecutionStatus =
  | 'pending'
  | 'simulating'
  | 'simulation_failed'
  | 'ready'
  | 'submitting'
  | 'submitted'
  | 'confirming'
  | 'confirmed'
  | 'failed'
  | 'timeout'
  | 'cancelled'
  | 'reverted';

/**
 * Execution request
 */
export interface ExecutionRequest {
  quoteId: UUID;
  idempotencyKey: string;
  
  /** Signer information (in production, would use secure signing service) */
  signerAddress: string;
  
  /** Optional overrides */
  maxSlippage?: DecimalAmount;
  deadline?: Timestamp;
  
  /** Execution preferences */
  autoRetry?: boolean;
  maxRetries?: number;
  
  /** Callback */
  webhookUrl?: string;
  
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  id: UUID;
  status: ExecutionStatus;
  
  /** Request details */
  executionRequest: ExecutionRequest;
  quote: Quote;
  route: Route;
  
  /** Transaction details */
  transactionId?: TransactionHash;
  transactionUrl?: string;
  blockNumber?: number;
  ledgerSequence?: number;
  
  /** Actual results */
  inputAmount: DecimalAmount;
  expectedOutput: DecimalAmount;
  actualOutput?: DecimalAmount;
  slippage?: DecimalAmount;
  
  /** Costs */
  totalFees: DecimalAmount;
  gasCost?: DecimalAmount;
  
  /** Performance */
  executionTimeMs?: number;
  confirmationTimeMs?: number;
  
  /** Failure information */
  failureReason?: string;
  failureClassification?: FailureType;
  canRetry: boolean;
  retryAttempts: number;
  
  /** Fallback information */
  fallbackAvailable: boolean;
  fallbackRouteId?: UUID;
  
  /** Timestamps */
  createdAt: Timestamp;
  simulatedAt?: Timestamp;
  submittedAt?: Timestamp;
  confirmedAt?: Timestamp;
  failedAt?: Timestamp;
  
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Failure classification
 */
export type FailureType =
  | 'transient'        // Network issues, temporary outage - safe to retry
  | 'invalid'          // Bad parameters, unsupported operation - cannot retry
  | 'economic'         // Slippage exceeded, insufficient liquidity - retry with new quote
  | 'authorization'    // Missing permissions - requires manual intervention
  | 'partial'          // Some steps succeeded - unsafe to retry without reconciliation
  | 'timeout'          // Operation timed out - depends on state
  | 'simulation_failed' // Pre-flight check failed
  | 'contract_error'   // Smart contract execution failed
  | 'unknown';         // Unclassified failure

/**
 * Transaction simulation request
 */
export interface SimulationRequest {
  quoteId: UUID;
  signerAddress: string;
  maxSlippage?: DecimalAmount;
  deadline?: Timestamp;
}

/**
 * Transaction simulation result
 */
export interface SimulationResult {
  id: UUID;
  success: boolean;
  
  /** Simulated outcomes */
  expectedOutput?: DecimalAmount;
  estimatedFees?: DecimalAmount;
  estimatedGas?: DecimalAmount;
  
  /** Validation checks */
  checks: SimulationCheck[];
  
  /** Issues */
  errors: SimulationError[];
  warnings: SimulationWarning[];
  
  /** Policy compliance */
  policyCompliant: boolean;
  policyViolations?: string[];
  
  /** Transaction preview */
  operations?: any[]; // Stellar operations
  transactionXdr?: string;
  
  /** Metadata */
  simulatedAt: Timestamp;
  simulationDurationMs: number;
}

/**
 * Simulation check
 */
export interface SimulationCheck {
  name: string;
  passed: boolean;
  message?: string;
  details?: Record<string, any>;
}

/**
 * Simulation error
 */
export interface SimulationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'critical';
  canProceed: boolean;
}

/**
 * Simulation warning
 */
export interface SimulationWarning {
  code: string;
  message: string;
  recommendation?: string;
}

/**
 * Retry strategy
 */
export interface RetryStrategy {
  enabled: boolean;
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryableFailures: FailureType[];
}

/**
 * Execution history entry
 */
export interface ExecutionHistoryEntry {
  id: UUID;
  executionId: UUID;
  status: ExecutionStatus;
  timestamp: Timestamp;
  details?: Record<string, any>;
  error?: string;
}

/**
 * Batch execution request
 */
export interface BatchExecutionRequest {
  executions: ExecutionRequest[];
  sequential?: boolean; // Execute one by one or in parallel
  stopOnError?: boolean;
  idempotencyKey: string;
}

/**
 * Batch execution result
 */
export interface BatchExecutionResult {
  id: UUID;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  results: ExecutionResult[];
  completedAt: Timestamp;
}

/**
 * Execution statistics
 */
export interface ExecutionStatistics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  
  /** Performance metrics */
  averageExecutionTime: number;
  medianExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  
  /** Economic metrics */
  totalVolume: DecimalAmount;
  totalFees: DecimalAmount;
  averageSlippage: DecimalAmount;
  
  /** Failure breakdown */
  failuresByType: Record<FailureType, number>;
  
  /** Time range */
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

/**
 * Idempotency record
 */
export interface IdempotencyRecord {
  idempotencyKey: string;
  executionId: UUID;
  status: ExecutionStatus;
  result?: ExecutionResult;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

/**
 * Webhook delivery
 */
export interface WebhookDelivery {
  id: UUID;
  executionId: UUID;
  webhookUrl: string;
  payload: any;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttemptAt?: Timestamp;
  deliveredAt?: Timestamp;
  error?: string;
}

/**
 * Contract execution details (Soroban-specific)
 */
export interface ContractExecution {
  contractId: ContractId;
  function: string;
  parameters: any[];
  returnValue?: any;
  gasUsed?: number;
  events?: ContractEvent[];
}

/**
 * Contract event
 */
export interface ContractEvent {
  contractId: ContractId;
  topics: string[];
  data: any;
  ledgerSequence: number;
}

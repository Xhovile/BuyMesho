import { randomUUID } from 'crypto';
import { buildPayChanguPayoutChargeId } from '../payments/paychangu.flow.js';

export type PayChanguPayoutExecutionStatus =
  | 'queued'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'pending';

export interface ExecutePayChanguPayoutInput {
  payoutId: string;
  sellerId: string;
  amount: number;
  currency: string;
  providerName: string;
  destinationReference: string;
  attemptNo: number;
}

export interface PayChanguPayoutExecutionResult {
  payoutId: string;
  provider: 'paychangu';
  providerChargeId: string;
  providerReference: string;
  status: PayChanguPayoutExecutionStatus;
  amount: number;
  currency: string;
  attemptNo: number;
  rawResponse: Record<string, unknown>;
  processedAt: string;
}

export interface PayChanguPayoutBalanceResult {
  provider: 'paychangu';
  currency: string;
  availableBalance: number;
  checkedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildProviderReference(payoutId: string): string {
  return `PAYCHANGU-PAYOUT-${payoutId}-${randomUUID().slice(0, 8)}`;
}

export async function executePayChanguPayout(
  input: ExecutePayChanguPayoutInput,
): Promise<PayChanguPayoutExecutionResult> {
  const providerChargeId = buildPayChanguPayoutChargeId(input.payoutId, input.attemptNo);
  const providerReference = buildProviderReference(input.payoutId);

  return {
    payoutId: input.payoutId,
    provider: 'paychangu',
    providerChargeId,
    providerReference,
    status: 'processing',
    amount: input.amount,
    currency: input.currency,
    attemptNo: input.attemptNo,
    processedAt: nowIso(),
    rawResponse: {
      provider: 'paychangu',
      providerChargeId,
      providerReference,
      destinationReference: input.destinationReference,
      sellerId: input.sellerId,
      providerName: input.providerName,
      simulated: true,
    },
  };
}

export async function getPayChanguPayoutBalance(
  currency = 'MWK',
): Promise<PayChanguPayoutBalanceResult> {
  return {
    provider: 'paychangu',
    currency,
    availableBalance: 0,
    checkedAt: nowIso(),
  };
}

export const PAYOUT_POLICY = {
  platformFeeBps: 300,
  payoutFeeBps: {
    airtel_money: 180,
    tnm_mpamba: 150,
    bank_transfer: 170,
  },
  bankPayoutFlatFeeAmount: 700,
  reserveCapBps: 600,
  disputeWindowHours: 72,
  minimumPayoutAmount: 1,
  // Immediate submission plus retries at 3h, 6h, ... 45h = 16 attempts max.
  maxRetryCount: 16,
  automaticRetryIntervalHours: 3,
  automaticRetryWindowHours: 48,
  launchMode: 'admin_approved' as const,
  // Both automatic and manual retries use the same retryable failure policy.
  // A provider configuration/authentication error is still retried automatically
  // through the normal attempt cap; the provider error remains visible to admins.
  retryableFailureCodes: new Set([
    'provider_timeout',
    'provider_unavailable',
    'provider_network_error',
    'provider_rate_limited',
    'provider_rejected',
    'provider_authentication_error',
    'provider_configuration_error',
    'provider_conflict',
    'balance_insufficient',
  ]),
  nonRetryableFailureCodes: new Set([
    'destination_not_verified',
    'destination_inactive',
    'seller_suspended',
    'order_disputed',
    'order_not_releasable',
    'payment_not_captured',
    'manual_review_required',
    'payout_not_found',
    'payout_cancelled',
  ]),
} as const;

export type PayoutLaunchMode = typeof PAYOUT_POLICY.launchMode;

export type PayoutFormulaInput = {
  grossAmount: number;
  processingFeeAmount?: number;
  reserveAmount?: number;
  manualAdjustmentAmount?: number;
  payoutMethod?: 'airtel_money' | 'tnm_mpamba' | 'bank_transfer' | null;
  currency?: string;
};

/**
 * Shared payout result contract used by marketplace and event payout flows.
 */
export interface PayoutFormulaResult {
  [key: string]: unknown;
  grossAmount: number;
  platformFeeAmount: number;
  processingFeeAmount: number;
  reserveAmount: number;
  reserveCapAmount: number;
  manualAdjustmentAmount: number;
  payoutFeeAmount: number;
  sellerReceivesAmount: number;
  netAmount: number;
  currency: string;
}

/** Normalize a financial amount to the application's whole-MWK storage unit. */
export function toFixedMoney(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  const normalized = Math.round(amount);
  return normalized < 0 ? 0 : normalized;
}

export function calculatePayoutFee(amount: number, payoutMethod?: PayoutFormulaInput['payoutMethod']): number {
  const payoutAmount = toFixedMoney(amount);
  if (!payoutMethod) return 0;

  const variableFee = toFixedMoney((payoutAmount * PAYOUT_POLICY.payoutFeeBps[payoutMethod]) / 10_000);
  const flatFee = payoutMethod === 'bank_transfer' ? PAYOUT_POLICY.bankPayoutFlatFeeAmount : 0;
  return toFixedMoney(variableFee + flatFee);
}

export function calculatePayoutFormula(input: PayoutFormulaInput): PayoutFormulaResult {
  const grossAmount = toFixedMoney(input.grossAmount);
  const manualAdjustmentAmount = toFixedMoney(input.manualAdjustmentAmount ?? 0);
  const reserveCapAmount = toFixedMoney((grossAmount * PAYOUT_POLICY.reserveCapBps) / 10_000);
  const requestedReserveAmount = toFixedMoney(input.reserveAmount ?? 0);
  const reserveAmount = Math.min(requestedReserveAmount, reserveCapAmount);
  const platformFeeAmount = toFixedMoney((grossAmount * PAYOUT_POLICY.platformFeeBps) / 10_000);
  const processingFeeAmount = 0;

  const amountBeforePayoutFee = Math.max(
    0,
    toFixedMoney(
      grossAmount -
        platformFeeAmount -
        reserveAmount -
        manualAdjustmentAmount,
    ),
  );
  const payoutFeeAmount = calculatePayoutFee(grossAmount, input.payoutMethod ?? null);
  const netAmount = Math.max(0, toFixedMoney(amountBeforePayoutFee - payoutFeeAmount));
  const sellerReceivesAmount = netAmount;

  return {
    grossAmount,
    platformFeeAmount,
    processingFeeAmount,
    reserveAmount,
    reserveCapAmount,
    manualAdjustmentAmount,
    payoutFeeAmount,
    sellerReceivesAmount,
    netAmount,
    currency: (input.currency ?? 'MWK').toUpperCase(),
  };
}

export function isRetryableFailureCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return PAYOUT_POLICY.retryableFailureCodes.has(code);
}


export function isNonRetryableFailureCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return PAYOUT_POLICY.nonRetryableFailureCodes.has(code);
}

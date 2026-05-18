export const PAYOUT_POLICY = {
  platformFeeBps: 200,
  reserveCapBps: 600,
  disputeWindowHours: 72,
  minimumPayoutAmount: 1000,
  maxRetryCount: 3,
  launchMode: 'admin_approved' as const,
  retryableFailureCodes: new Set([
    'provider_timeout',
    'provider_unavailable',
    'provider_network_error',
    'provider_rate_limited',
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
  currency?: string;
};

export type PayoutFormulaResult = {
  grossAmount: number;
  platformFeeAmount: number;
  processingFeeAmount: number;
  reserveAmount: number;
  reserveCapAmount: number;
  manualAdjustmentAmount: number;
  netAmount: number;
  currency: string;
};

export function toFixedMoney(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}

export function calculatePayoutFormula(input: PayoutFormulaInput): PayoutFormulaResult {
  const grossAmount = toFixedMoney(input.grossAmount);
  const manualAdjustmentAmount = toFixedMoney(input.manualAdjustmentAmount ?? 0);
  const reserveCapAmount = toFixedMoney((grossAmount * PAYOUT_POLICY.reserveCapBps) / 10_000);
  const requestedReserveAmount = toFixedMoney(input.reserveAmount ?? 0);
  const reserveAmount = Math.min(requestedReserveAmount, reserveCapAmount);
  const platformFeeAmount = toFixedMoney((grossAmount * PAYOUT_POLICY.platformFeeBps) / 10_000);

  // Customer-paid transaction fees are handled at checkout, not in seller payout math.
  // Keep this field for compatibility, but it is no longer part of the payout formula.
  const processingFeeAmount = 0;

  const netAmount = Math.max(
    0,
    toFixedMoney(
      grossAmount -
        platformFeeAmount -
        reserveAmount -
        manualAdjustmentAmount,
    ),
  );

  return {
    grossAmount,
    platformFeeAmount,
    processingFeeAmount,
    reserveAmount,
    reserveCapAmount,
    manualAdjustmentAmount,
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

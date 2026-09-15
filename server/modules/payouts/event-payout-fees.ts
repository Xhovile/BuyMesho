import {
  calculatePayoutFee,
  PAYOUT_POLICY,
  toFixedMoney,
  type PayoutFormulaResult,
} from './payout.policy.js';

export const EVENT_PAYOUT_FORMULA_VERSION = 'event-payout-v1';

export type EventPayoutFeeInput = {
  eventId: string;
  grossAmount: number;
  currency?: string;
  payoutMethod?: 'airtel_money' | 'tnm_mpamba' | 'bank_transfer' | null;
  processingFeeAmount?: number;
  reserveAmount?: number;
  manualAdjustmentAmount?: number;
};

export type EventPayoutFeeBreakdown = PayoutFormulaResult & {
  eventId: string;
  formulaVersion: string;
};

export type EventPayoutFormulaSnapshot = {
  formulaVersion: string;
  scope: 'event';
  eventId: string;
  currency: string;
  inputs: {
    grossAmount: number;
    processingFeeAmount: number;
    reserveAmount: number;
    manualAdjustmentAmount: number;
    payoutMethod: EventPayoutFeeInput['payoutMethod'];
  };
  policy: {
    platformFeeBps: number;
    payoutFeeBps: Record<string, number>;
    bankPayoutFlatFeeAmount: number;
  };
  result: {
    grossAmount: number;
    platformFeeAmount: number;
    processingFeeAmount: number;
    reserveAmount: number;
    reserveCapAmount: number;
    manualAdjustmentAmount: number;
    payoutFeeAmount: number;
    sellerReceivesAmount: number;
    netAmount: number;
  };
};

export function calculateEventPayoutFees(input: EventPayoutFeeInput): EventPayoutFeeBreakdown {
  if (!input.eventId.trim()) {
    throw new Error('eventId is required for event payout fee calculation');
  }

  const grossAmount = toFixedMoney(input.grossAmount);
  const processingFeeAmount = toFixedMoney(input.processingFeeAmount ?? 0);
  const manualAdjustmentAmount = toFixedMoney(input.manualAdjustmentAmount ?? 0);
  const reserveCapAmount = toFixedMoney((grossAmount * PAYOUT_POLICY.reserveCapBps) / 10_000);
  const requestedReserveAmount = toFixedMoney(input.reserveAmount ?? 0);
  const reserveAmount = Math.min(requestedReserveAmount, reserveCapAmount);
  const platformFeeAmount = toFixedMoney((grossAmount * PAYOUT_POLICY.platformFeeBps) / 10_000);
  const payoutFeeAmount = calculatePayoutFee(grossAmount, input.payoutMethod ?? null);
  const netAmount = Math.max(
    0,
    toFixedMoney(
      grossAmount -
        platformFeeAmount -
        processingFeeAmount -
        reserveAmount -
        manualAdjustmentAmount -
        payoutFeeAmount,
    ),
  );

  return {
    eventId: input.eventId,
    formulaVersion: EVENT_PAYOUT_FORMULA_VERSION,
    grossAmount,
    platformFeeAmount,
    processingFeeAmount,
    reserveAmount,
    reserveCapAmount,
    manualAdjustmentAmount,
    payoutFeeAmount,
    sellerReceivesAmount: netAmount,
    netAmount,
    currency: (input.currency ?? 'MWK').toUpperCase(),
  };
}

export function buildEventPayoutFormulaSnapshot(
  input: EventPayoutFeeInput,
  result: EventPayoutFeeBreakdown,
): EventPayoutFormulaSnapshot {
  const currency = (input.currency ?? 'MWK').toUpperCase();

  return {
    formulaVersion: EVENT_PAYOUT_FORMULA_VERSION,
    scope: 'event',
    eventId: input.eventId,
    currency,
    inputs: {
      grossAmount: result.grossAmount,
      processingFeeAmount: result.processingFeeAmount,
      reserveAmount: result.reserveAmount,
      manualAdjustmentAmount: result.manualAdjustmentAmount,
      payoutMethod: input.payoutMethod ?? null,
    },
    policy: {
      platformFeeBps: PAYOUT_POLICY.platformFeeBps,
      payoutFeeBps: { ...PAYOUT_POLICY.payoutFeeBps },
      bankPayoutFlatFeeAmount: PAYOUT_POLICY.bankPayoutFlatFeeAmount,
    },
    result: {
      grossAmount: result.grossAmount,
      platformFeeAmount: result.platformFeeAmount,
      processingFeeAmount: result.processingFeeAmount,
      reserveAmount: result.reserveAmount,
      reserveCapAmount: result.reserveCapAmount,
      manualAdjustmentAmount: result.manualAdjustmentAmount,
      payoutFeeAmount: result.payoutFeeAmount,
      sellerReceivesAmount: result.sellerReceivesAmount,
      netAmount: result.netAmount,
    },
  };
}

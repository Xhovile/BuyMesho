import {
  calculatePayoutFormula,
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

  const processingFeeAmount = toFixedMoney(input.processingFeeAmount ?? 0);
  const base = calculatePayoutFormula({
    grossAmount: input.grossAmount,
    processingFeeAmount,
    reserveAmount: input.reserveAmount,
    manualAdjustmentAmount: input.manualAdjustmentAmount,
    payoutMethod: input.payoutMethod ?? null,
    currency: input.currency ?? 'MWK',
  });

  const adjustedNetAmount = Math.max(
    0,
    toFixedMoney(
      base.grossAmount -
        base.platformFeeAmount -
        base.processingFeeAmount -
        base.reserveAmount -
        base.manualAdjustmentAmount -
        base.payoutFeeAmount,
    ),
  );

  return {
    ...base,
    eventId: input.eventId,
    formulaVersion: EVENT_PAYOUT_FORMULA_VERSION,
    sellerReceivesAmount: adjustedNetAmount,
    netAmount: adjustedNetAmount,
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

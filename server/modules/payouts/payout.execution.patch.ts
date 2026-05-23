import { getPaymentDb } from '../../sqlite.js';
import { payoutService, type ExecutePayoutInput } from './payout.service.js';

const originalExecutePayout = payoutService.executePayout.bind(payoutService);

type PatchRow = {
  id: string;
  seller_id: string;
  status: string;
  destination_type: 'bank' | 'mobile_money' | null;
  destination_provider_ref_id: string | null;
  destination_verification_status: string | null;
  destination_active: number;
};

function getPayoutRow(payoutId: string): PatchRow | undefined {
  return getPaymentDb().prepare(
    `SELECT
       p.id,
       p.seller_id,
       p.status,
       spa.destination_type AS destination_type,
       spa.provider_ref_id AS destination_provider_ref_id,
       spa.verification_status AS destination_verification_status,
       spa.is_active AS destination_active
     FROM payouts p
     LEFT JOIN seller_payout_accounts spa ON spa.id = p.destination_account_id
     WHERE p.id = ?
     LIMIT 1`,
  ).get(payoutId) as PatchRow | undefined;
}

function buildHeldResult(reasonCode: string, reason: string) {
  return {
    payout: undefined,
    attempt: null,
    execution: null,
    reasonCode,
    reason,
    nextAction: 'manual_review' as const,
  };
}

function hasRoutingId(row: PatchRow): boolean {
  return Boolean(row.destination_provider_ref_id?.trim());
}

async function patchedExecutePayout(input: ExecutePayoutInput) {
  const row = getPayoutRow(input.payoutId);

  if (!row) {
    return {
      payout: undefined,
      attempt: null,
      execution: null,
      reasonCode: 'payout_not_found',
      reason: 'Payout not found',
      nextAction: 'none' as const,
    };
  }

  if (String(row.status ?? '').toLowerCase() === 'paid') {
    return {
      payout: undefined,
      attempt: null,
      execution: null,
      reasonCode: 'manual_review_required',
      reason: 'Payout is already paid',
      nextAction: 'none' as const,
    };
  }

  if (Number(row.destination_active ?? 0) !== 1) {
    return buildHeldResult('destination_disabled', 'Destination is disabled');
  }

  if (String(row.destination_verification_status ?? '').toLowerCase() !== 'verified') {
    return buildHeldResult('destination_not_verified', 'Destination is pending verification');
  }

  if (!hasRoutingId(row)) {
    return buildHeldResult('destination_incomplete', 'Provider routing ID is missing for this destination');
  }

  return originalExecutePayout(input);
}

(payoutService as typeof payoutService & { executePayout: typeof patchedExecutePayout }).executePayout = patchedExecutePayout;

export const PAYOUT_EXECUTION_PATCH_VERSION = 'routing-id-guard-v1';

import { query } from '../../postgres.js';
import {
  executePayChanguPayout,
  getPayChanguPayoutBalance,
  type PayChanguPayoutExecutionResult,
} from './paychangu.payout.js';
import { PAYOUT_POLICY, isRetryableFailureCode } from './payout.policy.js';
import {
  classifyProviderFailureFromError,
  decryptSensitiveValue,
  exactProviderErrorMessage,
  providerFailureReason,
  isProviderHoldFailure,
  type ExecutePayoutInput,
  type PayoutAttemptRecord,
  type PayoutNextAction,
  type PayoutRecord,
} from './payout.shared.js';
import {
  addPayoutEvent,
  gatePayoutForSubmission,
  getPayout,
  recordAttempt,
  reserveRetryAttempt,
  updateDestinationAccount,
  updatePayoutStatus,
} from './payout.execution-repository.js';

type ExecutionDestination = {
  destinationType: string | null;
  providerRefId: string | null;
  providerName: string | null;
  accountName: string | null;
  verificationStatus: string;
  isActive: boolean;
  accountNumberEncrypted: string | null;
  mobileEncrypted: string | null;
};

export type PayoutExecutionGate = {
  allowed: boolean;
  reasonCode?: string;
  reason?: string;
  sellerId?: string;
  amount?: number;
  currency?: string;
  provider?: string;
  destinationType?: 'bank' | 'mobile_money';
  destinationValue?: string | null;
  destinationProviderRefId?: string | null;
  destinationProviderName?: string | null;
  destinationAccountName?: string | null;
  currentFailureReason?: string | null;
  currentProviderChargeId?: string | null;
};

function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function hydrateDestination(row: Record<string, unknown>): ExecutionDestination {
  return {
    destinationType: normalizeText(row.destination_type ?? row.destinationType),
    providerRefId: normalizeText(row.provider_ref_id ?? row.destination_provider_ref_id ?? row.destinationProviderRefId),
    providerName: normalizeText(row.provider_name ?? row.destination_provider_name ?? row.destinationProviderName),
    accountName: normalizeText(row.account_name ?? row.destination_account_name ?? row.destinationAccountName),
    verificationStatus: normalizeText(row.verification_status ?? row.destination_verification_status) ?? 'missing',
    isActive: Number(row.is_active ?? row.destination_active ?? 0) === 1,
    accountNumberEncrypted: normalizeText(row.account_number_encrypted ?? row.destination_account_number_encrypted),
    mobileEncrypted: normalizeText(row.mobile_encrypted ?? row.destination_mobile_encrypted),
  };
}

export async function gateForSubmissionAsync(payoutId: string): Promise<PayoutExecutionGate> {
  const { row, fallbackDestination } = await gatePayoutForSubmission(payoutId);
  if (!row) return { allowed: false, reasonCode: 'payout_not_found', reason: 'Payout not found' };

  const payoutStatus = String(row.status ?? '').toLowerCase();
  if (payoutStatus === 'cancelled') return { allowed: false, reasonCode: 'payout_cancelled', reason: 'Payout is cancelled' };
  if (payoutStatus === 'paid') return { allowed: false, reasonCode: 'manual_review_required', reason: 'Payout is already paid' };
  if (!['eligible', 'ready_for_payout', 'queued', 'failed', 'pending', 'pending_settlement', 'held'].includes(payoutStatus)) {
    return { allowed: false, reasonCode: 'manual_review_required', reason: `Payout in ${payoutStatus} cannot be submitted` };
  }

  const attempts = Number(row.attempt_count ?? 0);
  if (attempts >= PAYOUT_POLICY.maxRetryCount) {
    return { allowed: false, reasonCode: 'manual_review_required', reason: `Retry limit reached (${PAYOUT_POLICY.maxRetryCount})` };
  }
  if (payoutStatus === 'failed' && !isRetryableFailureCode((row.failure_reason as string | null | undefined) ?? null)) {
    return { allowed: false, reasonCode: 'manual_review_required', reason: 'Failed payout is not retryable' };
  }

  const amount = Number(row.amount ?? 0);
  if (!Number.isFinite(amount) || amount < PAYOUT_POLICY.minimumPayoutAmount) {
    return { allowed: false, reasonCode: 'manual_review_required', reason: `Payout amount must be at least ${PAYOUT_POLICY.minimumPayoutAmount}` };
  }

  const orderStatus = String(row.order_status ?? '').toLowerCase();
  if (orderStatus === 'disputed') return { allowed: false, reasonCode: 'order_disputed', reason: 'Order is disputed' };
  if (!['paid', 'in_escrow', 'fulfilled'].includes(orderStatus)) {
    return { allowed: false, reasonCode: 'order_not_releasable', reason: 'Order is not in a releasable state' };
  }

  const escrowState = String(row.escrow_state ?? '').toLowerCase();
  if (escrowState && escrowState !== 'released') {
    return { allowed: false, reasonCode: 'order_not_releasable', reason: 'Escrow must be released before payout submission' };
  }
  if (Number(row.seller_suspended ?? 0) === 1) {
    return { allowed: false, reasonCode: 'seller_suspended', reason: 'Seller is suspended' };
  }

  let destination: ExecutionDestination | null = null;
  const current = hydrateDestination(row);
  if (current.destinationType && current.verificationStatus === 'verified' && current.isActive) {
    destination = current;
  } else if (fallbackDestination) {
    destination = hydrateDestination(fallbackDestination);
    const existingDestinationId = normalizeText(row.destination_account_id);
    if (fallbackDestination.id && fallbackDestination.id !== existingDestinationId) {
      await updateDestinationAccount(payoutId, String(fallbackDestination.id));
    }
  }

  if (!destination?.destinationType) {
    return { allowed: false, reasonCode: 'destination_not_verified', reason: 'No payout destination selected' };
  }
  if (!destination.isActive) {
    return { allowed: false, reasonCode: 'destination_disabled', reason: 'Destination is disabled' };
  }

  const verificationStatus = destination.verificationStatus.toLowerCase();
  if (verificationStatus === 'failed') return { allowed: false, reasonCode: 'destination_failed', reason: 'Destination verification failed' };
  if (verificationStatus === 'disabled') return { allowed: false, reasonCode: 'destination_disabled', reason: 'Destination is disabled' };
  if (verificationStatus !== 'verified') return { allowed: false, reasonCode: 'destination_not_verified', reason: 'Destination is pending verification' };

  const destinationValue = (
    destination.destinationType === 'bank'
      ? decryptSensitiveValue(destination.accountNumberEncrypted)
      : decryptSensitiveValue(destination.mobileEncrypted)
  ) ?? null;
  if (!destinationValue) return { allowed: false, reasonCode: 'destination_incomplete', reason: 'Destination details are incomplete' };

  const destinationProviderRefId = (destination.providerRefId ?? '').trim();
  if (!destinationProviderRefId) return { allowed: false, reasonCode: 'destination_incomplete', reason: 'Destination routing details are incomplete' };

  return {
    allowed: true,
    sellerId: String(row.seller_id ?? ''),
    amount,
    currency: String(row.currency ?? 'MWK'),
    provider: String(row.provider ?? 'paychangu'),
    destinationType: destination.destinationType as 'bank' | 'mobile_money',
    destinationValue,
    destinationProviderRefId,
    destinationProviderName: destination.providerName,
    destinationAccountName: destination.accountName,
    currentFailureReason: (row.failure_reason as string | null) ?? null,
    currentProviderChargeId: (row.provider_charge_id as string | null) ?? null,
  };
}

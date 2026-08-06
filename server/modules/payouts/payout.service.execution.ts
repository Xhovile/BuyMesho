import './payout.schema.js';
import { getPaymentDb } from '../../postgresCompat.js';
import {
  executePayChanguPayout,
  getPayChanguPayoutBalance,
  type PayChanguPayoutExecutionResult,
} from './paychangu.payout.js';
import { PAYOUT_POLICY, isRetryableFailureCode } from './payout.policy.js';
import { payoutRepository, type PayoutRepository } from './payout.repository.js';
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

export function gateForSubmission(payoutId: string): PayoutExecutionGate {
  const row = getPaymentDb()
    .prepare(
      `SELECT
         p.id,
         p.seller_id,
         p.amount,
         p.currency,
         p.status,
         p.provider,
         p.failure_reason,
         o.status AS order_status,
         e.state AS escrow_state,
         s.is_suspended AS seller_suspended,
         spa.destination_type AS destination_type,
         spa.provider_ref_id AS destination_provider_ref_id,
         spa.provider_name AS destination_provider_name,
         spa.account_name AS destination_account_name,
         spa.masked_account AS destination_masked_account,
         spa.account_number_encrypted AS destination_account_number_encrypted,
         spa.mobile_encrypted AS destination_mobile_encrypted,
         spa.verification_status AS destination_verification_status,
         spa.is_active AS destination_active,
         (
           SELECT COALESCE(MAX(attempt_no), 0)
           FROM payout_attempts pa
           WHERE pa.payout_id = p.id
         ) AS attempt_count
       FROM payouts p
       LEFT JOIN orders o ON o.id = p.order_id
       LEFT JOIN escrows e ON e.id = p.escrow_id
       LEFT JOIN sellers s ON s.uid = p.seller_id
       LEFT JOIN seller_payout_accounts spa ON spa.id = p.destination_account_id
       WHERE p.id = ?
       LIMIT 1`,
    )
    .get(payoutId) as Record<string, unknown> | undefined;

  if (!row) return { allowed: false, reasonCode: 'payout_not_found', reason: 'Payout not found' };

  const payoutStatus = String(row.status ?? '').toLowerCase();
  if (payoutStatus === 'cancelled') return { allowed: false, reasonCode: 'payout_cancelled', reason: 'Payout is cancelled' };
  if (payoutStatus === 'paid') return { allowed: false, reasonCode: 'manual_review_required', reason: 'Payout is already paid' };
  if (!['eligible', 'ready_for_payout', 'queued', 'failed', 'pending', 'held'].includes(payoutStatus)) {
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

  if (Number(row.seller_suspended ?? 0) === 1) return { allowed: false, reasonCode: 'seller_suspended', reason: 'Seller is suspended' };
  if (!row.destination_type) return { allowed: false, reasonCode: 'destination_not_verified', reason: 'No payout destination selected' };
  if (Number(row.destination_active ?? 0) !== 1) return { allowed: false, reasonCode: 'destination_disabled', reason: 'Destination is disabled' };

  const destinationVerificationStatus = String(row.destination_verification_status ?? '').toLowerCase();
  if (destinationVerificationStatus === 'failed') return { allowed: false, reasonCode: 'destination_failed', reason: 'Destination verification failed' };
  if (destinationVerificationStatus === 'disabled') return { allowed: false, reasonCode: 'destination_disabled', reason: 'Destination is disabled' };
  if (destinationVerificationStatus !== 'verified') return { allowed: false, reasonCode: 'destination_not_verified', reason: 'Destination is pending verification' };

  const destinationValue = (
    row.destination_type === 'bank'
      ? decryptSensitiveValue((row.destination_account_number_encrypted as string | null) ?? null)
      : decryptSensitiveValue((row.destination_mobile_encrypted as string | null) ?? null)
  ) ?? null;
  if (!destinationValue) return { allowed: false, reasonCode: 'destination_incomplete', reason: 'Destination details are incomplete' };

  const destinationProviderRefId = ((row.destination_provider_ref_id as string | null) ?? '').trim();
  if (!destinationProviderRefId) return { allowed: false, reasonCode: 'destination_incomplete', reason: 'Destination routing details are incomplete' };

  return {
    allowed: true,
    sellerId: row.seller_id as string,
    amount,
    currency: (row.currency as string) ?? 'MWK',
    provider: (row.provider as string | null) ?? 'paychangu',
    destinationType: row.destination_type as 'bank' | 'mobile_money',
    destinationValue,
    destinationProviderRefId,
    destinationProviderName: (row.destination_provider_name as string | null) ?? null,
    destinationAccountName: (row.destination_account_name as string | null) ?? null,
    currentFailureReason: (row.failure_reason as string | null) ?? null,
    currentProviderChargeId: (row.provider_charge_id as string | null) ?? null,
  };
}

export function holdPayoutForReview(
  repository: PayoutRepository,
  input: {
    payoutId: string;
    sellerId: string;
    reasonCode: string;
    reason: string;
    payload?: Record<string, unknown> | null;
    statusExtras?: Record<string, unknown>;
  },
  actor: { actorType: 'admin' | 'system'; actorId?: string | null },
): PayoutRecord | undefined {
  const payout = repository.updateStatus(input.payoutId, 'held', {
    provider: 'paychangu',
    providerStatus: 'held',
    failureReason: input.reasonCode,
    manualReviewReason: input.reason,
    ...(input.statusExtras ?? {}),
  });
  repository.addEvent({
    payoutId: input.payoutId,
    sellerId: input.sellerId,
    eventType: 'payout_held',
    actorType: actor.actorType,
    actorId: actor.actorId ?? null,
    note: input.reason,
    payload: { reasonCode: input.reasonCode, ...(input.payload ?? {}) },
  });
  return payout;
}

export async function executePayoutFlow(
  repository: PayoutRepository,
  input: ExecutePayoutInput,
): Promise<{
  payout: PayoutRecord | undefined;
  attempt: PayoutAttemptRecord | null;
  execution: PayChanguPayoutExecutionResult | null;
  reasonCode: string | null;
  reason: string;
  nextAction: PayoutNextAction;
}> {
  const actor = { actorType: input.actorType ?? 'system', actorId: input.actorId ?? null };
  const gate = gateForSubmission(input.payoutId);

  if (!gate.allowed || !gate.sellerId || !gate.amount || !gate.currency || !gate.provider) {
    const payout = gate.sellerId
      ? holdPayoutForReview(
          repository,
          {
            payoutId: input.payoutId,
            sellerId: gate.sellerId,
            reasonCode: gate.reasonCode ?? 'manual_review_required',
            reason: gate.reason ?? 'Payout failed eligibility gate',
          },
          actor,
        )
      : undefined;
    return {
      payout,
      attempt: null,
      execution: null,
      reasonCode: gate.reasonCode ?? 'manual_review_required',
      reason: gate.reason ?? 'Payout failed eligibility gate',
      nextAction: (payout ? 'manual_review' : 'none') as PayoutNextAction,
    };
  }

  repository.updateStatus(input.payoutId, 'queued', {
    provider: gate.provider,
    providerStatus: 'queued',
    approvedBy: actor.actorType === 'admin' ? actor.actorId ?? null : null,
  });
  repository.addEvent({
    payoutId: input.payoutId,
    sellerId: gate.sellerId,
    eventType: 'payout_queued',
    actorType: actor.actorType,
    actorId: actor.actorId ?? null,
    note: 'Payout queued for provider submission',
  });

  try {
    await getPayChanguPayoutBalance(gate.currency);
  } catch (error) {
    const failureReason = classifyProviderFailureFromError(error) ?? 'provider_unavailable';
    const reason = providerFailureReason(failureReason);
    const payout = holdPayoutForReview(
      repository,
      {
        payoutId: input.payoutId,
        sellerId: gate.sellerId,
        reasonCode: failureReason,
        reason,
        payload: {
          stage: 'balance_check',
          error: error instanceof Error ? error.message : String(error),
          reasonCode: failureReason,
        },
      },
      actor,
    );
    return { payout, attempt: null, execution: null, reasonCode: failureReason, reason, nextAction: 'manual_review' as PayoutNextAction };
  }

  const reservedAttempt = repository.reserveRetryAttempt({
    payoutId: input.payoutId,
    provider: gate.provider,
    actorType: actor.actorType,
    actorId: actor.actorId ?? null,
  });
  const attemptNo = reservedAttempt.attemptNo;

  if (attemptNo > 1 || gate.currentFailureReason) {
    repository.addEvent({
      payoutId: input.payoutId,
      sellerId: gate.sellerId,
      eventType: 'payout_retried',
      actorType: actor.actorType,
      actorId: actor.actorId ?? null,
      note: `Retry accepted for attempt ${attemptNo}`,
      payload: {
        payoutId: input.payoutId,
        sellerId: gate.sellerId,
        actorType: actor.actorType,
        actorId: actor.actorId ?? null,
        attemptNo,
        previousFailureReason: gate.currentFailureReason ?? null,
        retryReason: actor.actorType === 'admin' ? 'admin_requested_retry' : 'system_requested_retry',
        providerChargeId: reservedAttempt.providerChargeId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  const execution = await executePayChanguPayout({
    payoutId: input.payoutId,
    sellerId: gate.sellerId,
    amount: gate.amount,
    currency: gate.currency,
    providerName: gate.provider,
    destinationReference: gate.destinationValue ?? input.destinationReference ?? input.payoutId,
    attemptNo,
    destinationType: gate.destinationType,
    mobile: gate.destinationType === 'mobile_money' ? gate.destinationValue ?? undefined : undefined,
    bankAccountNumber: gate.destinationType === 'bank' ? gate.destinationValue ?? undefined : undefined,
    mobileMoneyOperatorRefId: gate.destinationProviderRefId ?? undefined,
    bankUuid: gate.destinationProviderRefId ?? undefined,
    bankAccountName: gate.destinationAccountName ?? undefined,
  });

  repository.recordAttempt(reservedAttempt.id, input.payoutId, execution);
  const attempt: PayoutAttemptRecord = {
    id: reservedAttempt.id,
    payoutId: input.payoutId,
    provider: execution.provider,
    providerChargeId: execution.providerChargeId,
    providerReference: execution.providerReference ?? reservedAttempt.providerChargeId,
    providerTransactionId: execution.providerTransactionId,
    status: execution.status,
    attemptNo: execution.attemptNo,
    rawResponse: execution.rawResponse,
    createdAt: reservedAttempt.createdAt,
  };

  if (execution.status === 'failed' && isProviderHoldFailure(execution.failureClass)) {
    const exactMessage = exactProviderErrorMessage(execution.rawResponse);
    const reason = providerFailureReason(execution.failureClass, execution.failureClass === 'provider_unavailable' ? null : exactMessage);
    const payout = holdPayoutForReview(
      repository,
      {
        payoutId: input.payoutId,
        sellerId: gate.sellerId,
        reasonCode: execution.failureClass,
        reason,
        payload: {
          attemptNo,
          providerChargeId: execution.providerChargeId,
          providerStatus: execution.status,
        },
        statusExtras: {
          provider: execution.provider,
          providerChargeId: execution.providerChargeId,
          providerReference: execution.providerReference,
          providerTransactionId: execution.providerTransactionId,
          lastAttemptId: attempt.id,
          rawResponse: execution.rawResponse,
          sentAt: execution.processedAt,
          failedAt: execution.processedAt,
        },
      },
      actor,
    );

    repository.addEvent({
      payoutId: input.payoutId,
      sellerId: gate.sellerId,
      eventType: 'payout_retry_blocked',
      actorType: actor.actorType,
      actorId: actor.actorId ?? null,
      note: reason,
      payload: {
        attemptNo,
        providerChargeId: execution.providerChargeId,
        reasonCode: execution.failureClass,
      },
    });

    return {
      payout,
      attempt,
      execution,
      reasonCode: execution.failureClass,
      reason,
      nextAction: 'retry_blocked' as PayoutNextAction,
    };
  }

  const payout = repository.updateExecutionState(input.payoutId, execution);
  repository.updateStatus(input.payoutId, execution.status, {
    lastAttemptId: attempt.id,
    rawResponse: execution.rawResponse,
    failureReason: execution.status === 'failed' ? execution.failureClass ?? 'provider_execution_failed' : null,
    providerTransactionId: execution.providerTransactionId,
    approvedBy: actor.actorType === 'admin' ? actor.actorId ?? null : null,
    sentAt: execution.processedAt,
  });

  repository.addEvent({
    payoutId: input.payoutId,
    sellerId: gate.sellerId,
    eventType: execution.status === 'failed' ? 'payout_failed' : execution.status === 'paid' ? 'payout_paid' : 'payout_sent',
    actorType: actor.actorType,
    actorId: actor.actorId ?? null,
    note:
      execution.status === 'failed'
        ? `Provider attempt ${attemptNo} failed`
        : execution.status === 'paid'
          ? `Provider attempt ${attemptNo} paid`
          : `Provider attempt ${attemptNo} sent`,
    payload: execution.rawResponse,
  });

  return {
    payout,
    attempt,
    execution,
    reasonCode: execution.status === 'failed' ? execution.failureClass ?? 'provider_execution_failed' : null,
    reason: execution.status === 'failed'
      ? execution.failureClass
        ? providerFailureReason(execution.failureClass)
        : 'Provider reported payout failure.'
      : execution.status === 'paid'
        ? 'Payout paid successfully.'
        : 'Payout submitted to provider.',
    nextAction: execution.status === 'paid' ? 'none' : execution.status === 'failed' ? 'manual_review' : 'awaiting_provider',
  };
}

export async function getProviderBalance(currency = 'MWK') {
  return getPayChanguPayoutBalance(currency);
}

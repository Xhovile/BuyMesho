import { createDecipheriv, scryptSync } from 'crypto';
import { getPaymentDb } from '../../sqlite.js';
import {
  payoutRepository,
  payoutService,
  type ExecutePayoutInput,
  type PayoutStatus,
} from './payout.service.js';
import {
  executePayChanguPayout,
  getPayChanguPayoutBalance,
  type PayChanguPayoutFailureClass,
} from './paychangu.payout.js';
import { PAYOUT_POLICY, isRetryableFailureCode } from './payout.policy.js';

const PAYOUT_ENCRYPTION_SECRET = process.env.SELLER_PAYOUT_ENCRYPTION_KEY ?? '';

type PayoutGateRow = {
  id: string;
  seller_id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  failure_reason: string | null;
  order_status: string | null;
  escrow_state: string | null;
  seller_suspended: number;
  destination_type: 'bank' | 'mobile_money' | null;
  destination_provider_ref_id: string | null;
  destination_provider_name: string | null;
  destination_account_name: string | null;
  destination_account_number_encrypted: string | null;
  destination_mobile_encrypted: string | null;
  destination_verification_status: string | null;
  destination_active: number;
  attempt_count: number;
};

function requirePayoutEncryptionSecret(): string {
  if (!PAYOUT_ENCRYPTION_SECRET) {
    throw new Error('SELLER_PAYOUT_ENCRYPTION_KEY is not configured');
  }
  return PAYOUT_ENCRYPTION_SECRET;
}

function getDerivedEncryptionKey(): Buffer {
  return scryptSync(requirePayoutEncryptionSecret(), 'BuyMesho seller payout', 32);
}

function decryptSensitiveValue(value: string | null): string | null {
  if (!value) return null;
  const parts = value.split(':');
  if (parts.length !== 3) return value;

  try {
    const key = getDerivedEncryptionKey();
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return `${decipher.update(encrypted, undefined, 'utf8')}${decipher.final('utf8')}`;
  } catch {
    return null;
  }
}

function classifyProviderFailureFromError(error: unknown): PayChanguPayoutFailureClass {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
      return 'provider_rate_limited';
    }
    if (message.includes('timeout') || message.includes('timed out') || message.includes('etimedout')) {
      return 'provider_timeout';
    }
  }
  return 'provider_unavailable';
}

function providerFailureReason(reasonCode: PayChanguPayoutFailureClass): string {
  switch (reasonCode) {
    case 'provider_timeout':
      return 'Provider timeout; payout held for manual review.';
    case 'provider_rate_limited':
      return 'Provider rate-limited payout submission; retry is blocked pending manual review.';
    default:
      return 'Provider outage detected; payout held for manual review.';
  }
}

function getGateRow(payoutId: string): PayoutGateRow | undefined {
  const row = getPaymentDb().prepare(
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
  ).get(payoutId) as PayoutGateRow | undefined;
  return row;
}

function holdForReview(input: {
  payoutId: string;
  sellerId: string;
  reasonCode: string;
  reason: string;
  statusExtras?: Record<string, unknown>;
}): void {
  payoutRepository.updateStatus(input.payoutId, 'held', {
    provider: 'paychangu',
    providerStatus: 'held',
    failureReason: input.reasonCode,
    manualReviewReason: input.reason,
    ...(input.statusExtras ?? {}),
  });
  payoutRepository.addEvent({
    payoutId: input.payoutId,
    sellerId: input.sellerId,
    eventType: 'payout_held',
    actorType: 'system',
    actorId: null,
    note: input.reason,
    payload: { reasonCode: input.reasonCode },
  });
}

function hasProviderRoutingId(row: PayoutGateRow): boolean {
  return Boolean(row.destination_provider_ref_id?.trim());
}

async function patchedExecutePayout(input: ExecutePayoutInput) {
  const gate = getGateRow(input.payoutId);
  if (!gate) {
    return {
      payout: undefined,
      attempt: null,
      execution: null,
      reasonCode: 'payout_not_found',
      reason: 'Payout not found',
      nextAction: 'none' as const,
    };
  }

  const payoutStatus = gate.status.toLowerCase();
  if (payoutStatus === 'paid') {
    return {
      payout: payoutRepository.findById(input.payoutId),
      attempt: null,
      execution: null,
      reasonCode: 'manual_review_required',
      reason: 'Payout is already paid',
      nextAction: 'none' as const,
    };
  }

  if (Number(gate.destination_active ?? 0) !== 1) {
    holdForReview({
      payoutId: gate.id,
      sellerId: gate.seller_id,
      reasonCode: 'destination_disabled',
      reason: 'Destination is disabled',
    });
    return {
      payout: payoutRepository.findById(input.payoutId),
      attempt: null,
      execution: null,
      reasonCode: 'destination_disabled',
      reason: 'Destination is disabled',
      nextAction: 'manual_review' as const,
    };
  }

  const destinationVerificationStatus = String(gate.destination_verification_status ?? '').toLowerCase();
  if (destinationVerificationStatus !== 'verified') {
    holdForReview({
      payoutId: gate.id,
      sellerId: gate.seller_id,
      reasonCode: 'destination_not_verified',
      reason: 'Destination is pending verification',
    });
    return {
      payout: payoutRepository.findById(input.payoutId),
      attempt: null,
      execution: null,
      reasonCode: 'destination_not_verified',
      reason: 'Destination is pending verification',
      nextAction: 'manual_review' as const,
    };
  }

  if (!hasProviderRoutingId(gate)) {
    holdForReview({
      payoutId: gate.id,
      sellerId: gate.seller_id,
      reasonCode: 'destination_incomplete',
      reason: 'Provider routing ID is missing for this destination',
    });
    return {
      payout: payoutRepository.findById(input.payoutId),
      attempt: null,
      execution: null,
      reasonCode: 'destination_incomplete',
      reason: 'Provider routing ID is missing for this destination',
      nextAction: 'manual_review' as const,
    };
  }

  const destinationValue = (
    gate.destination_type === 'bank'
      ? decryptSensitiveValue(gate.destination_account_number_encrypted)
      : decryptSensitiveValue(gate.destination_mobile_encrypted)
  ) ?? null;
  if (!destinationValue) {
    holdForReview({
      payoutId: gate.id,
      sellerId: gate.seller_id,
      reasonCode: 'destination_incomplete',
      reason: 'Destination details are incomplete',
    });
    return {
      payout: payoutRepository.findById(input.payoutId),
      attempt: null,
      execution: null,
      reasonCode: 'destination_incomplete',
      reason: 'Destination details are incomplete',
      nextAction: 'manual_review' as const,
    };
  }

  const attempts = Number(gate.attempt_count ?? 0);
  if (attempts >= PAYOUT_POLICY.maxRetryCount) {
    holdForReview({
      payoutId: gate.id,
      sellerId: gate.seller_id,
      reasonCode: 'manual_review_required',
      reason: `Retry limit reached (${PAYOUT_POLICY.maxRetryCount})`,
    });
    return {
      payout: payoutRepository.findById(input.payoutId),
      attempt: null,
      execution: null,
      reasonCode: 'manual_review_required',
      reason: `Retry limit reached (${PAYOUT_POLICY.maxRetryCount})`,
      nextAction: 'manual_review' as const,
    };
  }

  if (
    payoutStatus === 'failed' &&
    !isRetryableFailureCode((gate.failure_reason as string | null | undefined) ?? null)
  ) {
    holdForReview({
      payoutId: gate.id,
      sellerId: gate.seller_id,
      reasonCode: 'manual_review_required',
      reason: 'Failed payout is not retryable',
    });
    return {
      payout: payoutRepository.findById(input.payoutId),
      attempt: null,
      execution: null,
      reasonCode: 'manual_review_required',
      reason: 'Failed payout is not retryable',
      nextAction: 'manual_review' as const,
    };
  }

  if (!['paid', 'in_escrow', 'fulfilled'].includes(String(gate.order_status ?? '').toLowerCase())) {
    holdForReview({
      payoutId: gate.id,
      sellerId: gate.seller_id,
      reasonCode: 'order_not_releasable',
      reason: 'Order is not in a releasable state',
    });
    return {
      payout: payoutRepository.findById(input.payoutId),
      attempt: null,
      execution: null,
      reasonCode: 'order_not_releasable',
      reason: 'Order is not in a releasable state',
      nextAction: 'manual_review' as const,
    };
  }

  if (String(gate.escrow_state ?? '').toLowerCase() && String(gate.escrow_state ?? '').toLowerCase() !== 'released') {
    holdForReview({
      payoutId: gate.id,
      sellerId: gate.seller_id,
      reasonCode: 'order_not_releasable',
      reason: 'Escrow must be released before payout submission',
    });
    return {
      payout: payoutRepository.findById(input.payoutId),
      attempt: null,
      execution: null,
      reasonCode: 'order_not_releasable',
      reason: 'Escrow must be released before payout submission',
      nextAction: 'manual_review' as const,
    };
  }

  if (Number(gate.seller_suspended ?? 0) === 1) {
    holdForReview({
      payoutId: gate.id,
      sellerId: gate.seller_id,
      reasonCode: 'seller_suspended',
      reason: 'Seller is suspended',
    });
    return {
      payout: payoutRepository.findById(input.payoutId),
      attempt: null,
      execution: null,
      reasonCode: 'seller_suspended',
      reason: 'Seller is suspended',
      nextAction: 'manual_review' as const,
    };
  }

  const provider = gate.provider ?? 'paychangu';
  payoutRepository.updateStatus(input.payoutId, 'queued', {
    provider,
    providerStatus: 'queued',
    approvedBy: input.actorType === 'admin' ? input.actorId ?? null : null,
  });

  let balance;
  try {
    balance = await getPayChanguPayoutBalance(String(gate.currency ?? 'MWK'));
  } catch (error) {
    const failureReason = classifyProviderFailureFromError(error);
    const reason = providerFailureReason(failureReason);
    holdForReview({
      payoutId: gate.id,
      sellerId: gate.seller_id,
      reasonCode: failureReason ?? 'provider_unavailable',
      reason,
    });
    return {
      payout: payoutRepository.findById(input.payoutId),
      attempt: null,
      execution: null,
      reasonCode: failureReason ?? 'provider_unavailable',
      reason,
      nextAction: 'manual_review' as const,
    };
  }

  if (balance.availableBalance < Number(gate.amount ?? 0)) {
    holdForReview({
      payoutId: gate.id,
      sellerId: gate.seller_id,
      reasonCode: 'balance_insufficient',
      reason: 'Insufficient provider payout balance',
    });
    return {
      payout: payoutRepository.findById(input.payoutId),
      attempt: null,
      execution: null,
      reasonCode: 'balance_insufficient',
      reason: 'Insufficient provider payout balance',
      nextAction: 'manual_review' as const,
    };
  }

  const reservedAttempt = payoutRepository.reserveRetryAttempt({
    payoutId: input.payoutId,
    provider,
    actorType: input.actorType === 'admin' ? 'admin' : 'system',
    actorId: input.actorId ?? null,
  });

  const providerChargeId = reservedAttempt.providerChargeId;
  const execution = await executePayChanguPayout({
    payoutId: input.payoutId,
    sellerId: gate.seller_id,
    amount: Number(gate.amount ?? 0),
    currency: String(gate.currency ?? 'MWK'),
    providerName: gate.destination_provider_name ?? provider,
    destinationReference: destinationValue,
    attemptNo: reservedAttempt.attemptNo,
    destinationType: gate.destination_type ?? 'bank',
    mobile: gate.destination_type === 'mobile_money' ? destinationValue : undefined,
    mobileMoneyOperatorRefId: gate.destination_type === 'mobile_money' ? gate.destination_provider_ref_id ?? undefined : undefined,
    bankUuid: gate.destination_type === 'bank' ? gate.destination_provider_ref_id ?? undefined : undefined,
    bankAccountName: gate.destination_type === 'bank' ? gate.destination_account_name ?? undefined : undefined,
    bankAccountNumber: gate.destination_type === 'bank' ? destinationValue : undefined,
  });

  payoutRepository.recordAttempt(reservedAttempt.id, input.payoutId, execution);
  if (execution.status === 'failed' && execution.failureClass && ['provider_unavailable', 'provider_timeout', 'provider_rate_limited'].includes(execution.failureClass)) {
    holdForReview({
      payoutId: gate.id,
      sellerId: gate.seller_id,
      reasonCode: execution.failureClass,
      reason: providerFailureReason(execution.failureClass),
      statusExtras: {
        provider,
        providerChargeId,
        providerReference: execution.providerReference,
        providerTransactionId: execution.providerTransactionId,
        lastAttemptId: reservedAttempt.id,
        rawResponse: execution.rawResponse,
        sentAt: execution.processedAt,
        failedAt: execution.processedAt,
      },
    });
    payoutRepository.addEvent({
      payoutId: input.payoutId,
      sellerId: gate.seller_id,
      eventType: 'payout_retry_blocked',
      actorType: input.actorType === 'admin' ? 'admin' : 'system',
      actorId: input.actorId ?? null,
      note: providerFailureReason(execution.failureClass),
      payload: {
        attemptNo: reservedAttempt.attemptNo,
        providerChargeId,
        reasonCode: execution.failureClass,
      },
    });
    return {
      payout: payoutRepository.findById(input.payoutId),
      attempt: reservedAttempt,
      execution,
      reasonCode: execution.failureClass,
      reason: providerFailureReason(execution.failureClass),
      nextAction: 'retry_blocked' as const,
    };
  }

  const payout = payoutRepository.updateExecutionState(input.payoutId, execution);
  payoutRepository.updateStatus(input.payoutId, execution.status as PayoutStatus, {
    lastAttemptId: reservedAttempt.id,
    rawResponse: execution.rawResponse,
    failureReason: execution.status === 'failed' ? execution.failureClass ?? 'provider_execution_failed' : null,
    providerTransactionId: execution.providerTransactionId,
    approvedBy: input.actorType === 'admin' ? input.actorId ?? null : null,
    sentAt: execution.processedAt,
  });
  payoutRepository.addEvent({
    payoutId: input.payoutId,
    sellerId: gate.seller_id,
    eventType: execution.status === 'paid' ? 'payout_paid' : execution.status === 'failed' ? 'payout_failed' : 'payout_sent',
    actorType: input.actorType ?? 'system',
    actorId: input.actorId ?? null,
    note: execution.status === 'paid' ? 'Provider attempt paid' : execution.status === 'failed' ? 'Provider attempt failed' : 'Provider attempt sent',
    payload: execution.rawResponse,
  });

  return {
    payout,
    attempt: reservedAttempt,
    execution,
    reasonCode: execution.status === 'failed' ? execution.failureClass ?? 'provider_execution_failed' : null,
    reason: execution.status === 'paid' ? 'Payout paid successfully.' : execution.status === 'failed' ? (execution.failureClass ? providerFailureReason(execution.failureClass) : 'Provider reported payout failure.') : 'Payout submitted to provider.',
    nextAction: execution.status === 'paid' ? 'none' : execution.status === 'failed' ? 'manual_review' : 'awaiting_provider',
  };
}

(payoutService as { executePayout: typeof patchedExecutePayout }).executePayout = patchedExecutePayout;

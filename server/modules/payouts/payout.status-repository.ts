import { getPaymentDb } from '../../postgresCompat.js';
import type { PayoutRecord, PayoutStatus } from './payout.shared.js';

const PAYOUT_ALLOWED_TRANSITIONS: Readonly<Record<PayoutStatus, readonly PayoutStatus[]>> = {
  pending_settlement: ['pending_settlement', 'eligible', 'ready_for_payout', 'held', 'cancelled'],
  eligible: ['eligible', 'ready_for_payout', 'queued', 'held', 'cancelled'],
  ready_for_payout: ['ready_for_payout', 'queued', 'held', 'cancelled'],
  queued: ['queued', 'processing', 'pending', 'paid', 'failed', 'held', 'cancelled'],
  processing: ['processing', 'pending', 'paid', 'failed', 'held', 'cancelled'],
  pending: ['pending', 'processing', 'paid', 'failed', 'held', 'cancelled'],
  held: ['held', 'eligible', 'ready_for_payout', 'queued', 'processing', 'pending', 'paid', 'failed', 'cancelled'],
  paid: ['paid'],
  failed: ['failed', 'eligible', 'ready_for_payout', 'queued', 'processing', 'pending', 'held', 'cancelled'],
  cancelled: ['cancelled'],
} as const;

function assertPayoutStatusTransition(from: PayoutStatus, to: PayoutStatus): void {
  if (PAYOUT_ALLOWED_TRANSITIONS[from].includes(to)) return;
  throw new Error(`Illegal payout state transition: ${from} -> ${to}`);
}

export class PayoutStatusRepository {
  constructor(
    private readonly findById: (id: string) => PayoutRecord | undefined,
  ) {}

  updateStatus(
    id: string,
    status: PayoutStatus,
    extra: Record<string, unknown> = {},
  ): PayoutRecord | undefined {
    const current = this.findById(id);
    if (!current) return undefined;
    assertPayoutStatusTransition(current.status, status);

    const now = new Date().toISOString();
    const db = getPaymentDb();

    db.prepare(
      `UPDATE payouts
        SET status = ?,
             provider = COALESCE(?, provider),
             provider_charge_id = COALESCE(?, provider_charge_id),
             provider_ref_id = COALESCE(?, provider_ref_id),
             provider_status = COALESCE(?, provider_status),
             provider_transaction_id = COALESCE(?, provider_transaction_id),
             failure_reason = COALESCE(?, failure_reason),
             manual_review_reason = COALESCE(?, manual_review_reason),
             processed_by = COALESCE(?, processed_by),
             approved_by = COALESCE(?, approved_by),
             last_attempt_id = COALESCE(?, last_attempt_id),
             raw_response = COALESCE(?, raw_response),
             sent_at = COALESCE(?, sent_at),
             paid_at = COALESCE(?, paid_at),
             failed_at = COALESCE(?, failed_at),
             updated_at = ?
        WHERE id = ?`,
    ).run(
      status,
      extra.provider ?? null,
      extra.providerChargeId ?? null,
      extra.providerReference ?? null,
      extra.providerStatus ?? null,
      extra.providerTransactionId ?? null,
      extra.failureReason ?? null,
      extra.manualReviewReason ?? null,
      extra.processedBy ?? null,
      extra.approvedBy ?? null,
      extra.lastAttemptId ?? null,
      extra.rawResponse ? JSON.stringify(extra.rawResponse) : null,
      extra.sentAt ?? null,
      extra.paidAt ?? null,
      extra.failedAt ?? null,
      now,
      id,
    );

    return this.findById(id);
  }
}

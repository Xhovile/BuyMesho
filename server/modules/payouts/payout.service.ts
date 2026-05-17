import './payout.schema.js';
import { randomUUID } from 'crypto';
import { getPaymentDb } from '../../sqlite.js';
import type { MoneyValue } from '../../../src/shared/types/common.js';
import {
  executePayChanguPayout,
  getPayChanguPayoutBalance,
  buildPayChanguPayoutChargeId,
  type PayChanguPayoutExecutionResult,
  type PayChanguPayoutFailureClass,
} from './paychangu.payout.js';
import {
  PAYOUT_POLICY,
  isRetryableFailureCode,
} from './payout.policy.js';

export type PayoutStatus =
  | 'eligible'
  | 'queued'
  | 'processing'
  | 'pending'
  | 'held'
  | 'paid'
  | 'failed'
  | 'cancelled';

export interface PayoutRecord {
  id: string;
  sellerId: string;
  orderId: string | null;
  escrowId: string | null;
  releaseEntryId: string | null;
  amount: number;
  currency: string;
  status: PayoutStatus;
  provider: string | null;
  providerChargeId: string | null;
  requestedBy: string | null;
  requestedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutAttemptRecord {
  id: string;
  payoutId: string;
  provider: string;
  providerChargeId: string;
  providerReference: string;
  status: PayoutStatus;
  attemptNo: number;
  rawResponse: Record<string, unknown>;
  createdAt: string;
}

export interface CreateEligiblePayoutInput {
  sellerId: string;
  orderId: string;
  escrowId: string;
  releaseEntryId: string;
  amount: number;
  currency: string;
  requestedBy: string;
  requestedAt?: string;
  destinationAccountId?: string | null;
  snapshot?: Record<string, unknown> | null;
}

export interface PayoutRequest {
  sellerId: string;
  amount: MoneyValue;
}

export interface ExecutePayoutInput {
  payoutId: string;
  sellerId?: string;
  amount?: number;
  currency?: string;
  providerName?: string;
  destinationReference?: string;
  actorType?: 'admin' | 'system';
  actorId?: string | null;
}

export type PayoutPermissionActor = {
  uid: string;
  is_admin?: boolean;
};

export type PayoutPermissionContext = {
  sellerId: string;
  actor: PayoutPermissionActor | null;
};

function isAdminActor(actor: PayoutPermissionActor | null): boolean {
  return actor?.is_admin === true;
}

function isSameSeller(actor: PayoutPermissionActor | null, sellerId: string): boolean {
  return !!actor?.uid && actor.uid === sellerId;
}

export function canViewPayoutSettings(context: PayoutPermissionContext): boolean {
  return isAdminActor(context.actor) || isSameSeller(context.actor, context.sellerId);
}

export function canEditPayoutSettings(context: PayoutPermissionContext): boolean {
  return isAdminActor(context.actor) || isSameSeller(context.actor, context.sellerId);
}

export function canRequestWithdrawal(context: PayoutPermissionContext): boolean {
  if (PAYOUT_POLICY.launchMode === 'admin_approved') {
    return isAdminActor(context.actor);
  }
  return isAdminActor(context.actor) || isSameSeller(context.actor, context.sellerId);
}

export function canViewPayoutHistory(context: PayoutPermissionContext): boolean {
  return isAdminActor(context.actor) || isSameSeller(context.actor, context.sellerId);
}

export function canRequestPayoutRetry(context: PayoutPermissionContext): boolean {
  if (PAYOUT_POLICY.launchMode === 'admin_approved') {
    return isAdminActor(context.actor);
  }
  return isAdminActor(context.actor) || isSameSeller(context.actor, context.sellerId);
}

export function canApprovePayoutOverride(context: PayoutPermissionContext): boolean {
  return isAdminActor(context.actor);
}

export function canManageSellerPayoutDestination(context: PayoutPermissionContext): boolean {
  return canEditPayoutSettings(context);
}

export function canAccessSellerPayoutData(context: PayoutPermissionContext): boolean {
  return canViewPayoutSettings(context);
}

export class PayoutRepository {
  private get db() {
    return getPaymentDb();
  }

  findByEscrowId(escrowId: string): PayoutRecord | undefined {
    const row = this.db
      .prepare(
        `SELECT * FROM payouts
         WHERE escrow_id = ? AND release_entry_id IS NOT NULL
         ORDER BY created_at ASC
         LIMIT 1`,
      )
      .get(escrowId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.rowToPayout(row);
  }

  findById(id: string): PayoutRecord | undefined {
    const row = this.db
      .prepare(`SELECT * FROM payouts WHERE id = ? LIMIT 1`)
      .get(id) as Record<string, unknown> | undefined;

    if (!row) return undefined;
    return this.rowToPayout(row);
  }

  createEligibleForRelease(input: CreateEligiblePayoutInput): PayoutRecord {
    const existing = this.findByEscrowId(input.escrowId);
    if (existing) return existing;

    const now = input.requestedAt ?? new Date().toISOString();
    const id = randomUUID();

    this.db.prepare(
       `INSERT OR IGNORE INTO payouts (
         id,
         seller_id,
         order_id,
         escrow_id,
         release_entry_id,
         destination_account_id,
         amount,
         currency,
         status,
         provider,
         provider_charge_id,
         requested_by,
         requested_at,
         raw_request,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'eligible', 'paychangu', NULL, ?, ?, ?, ?, ?)`,
     ).run(
       id,
       input.sellerId,
       input.orderId,
       input.escrowId,
       input.releaseEntryId,
       input.destinationAccountId ?? null,
       input.amount,
       input.currency,
       input.requestedBy,
       now,
       input.snapshot ? JSON.stringify(input.snapshot) : null,
       now,
       now,
     );

    const created = this.findByEscrowId(input.escrowId);
    if (!created) {
      throw new Error('Failed to create payout candidate');
    }
    return created;
  }

  updateStatus(id: string, status: PayoutStatus, extra: Record<string, unknown> = {}): PayoutRecord | undefined {
    const now = new Date().toISOString();

    this.db.prepare(
      `UPDATE payouts
       SET status = ?,
            provider = COALESCE(?, provider),
            provider_charge_id = COALESCE(?, provider_charge_id),
            provider_ref_id = COALESCE(?, provider_ref_id),
            provider_status = COALESCE(?, provider_status),
            failure_reason = COALESCE(?, failure_reason),
            manual_review_reason = COALESCE(?, manual_review_reason),
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
      extra.failureReason ?? null,
      extra.manualReviewReason ?? null,
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

  updateExecutionState(
    payoutId: string,
    execution: PayChanguPayoutExecutionResult,
  ): PayoutRecord | undefined {
    const statusExtras: Record<string, unknown> = {
      provider: execution.provider,
      providerChargeId: execution.providerChargeId,
      providerReference: execution.providerReference,
      providerStatus: execution.status,
    };

    if (execution.status === 'paid') {
      statusExtras.paidAt = new Date().toISOString();
    }

    if (execution.status === 'failed') {
      statusExtras.failedAt = new Date().toISOString();
      statusExtras.failureReason = 'Provider payout execution failed';
      statusExtras.manualReviewReason = 'Provider reported payout failure';
    }

    return this.updateStatus(payoutId, execution.status, statusExtras);
  }

  nextAttemptNo(payoutId: string): number {
    const row = this.db
      .prepare(
        `SELECT COALESCE(MAX(attempt_no), 0) AS max_attempt_no
         FROM payout_attempts
         WHERE payout_id = ?`,
      )
      .get(payoutId) as { max_attempt_no?: number } | undefined;

    return Number(row?.max_attempt_no ?? 0) + 1;
  }

  recordAttempt(
    payoutId: string,
    execution: PayChanguPayoutExecutionResult,
  ): PayoutAttemptRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const failedReason = execution.status === 'failed' ? 'provider_execution_failed' : null;

    this.db.prepare(
      `INSERT INTO payout_attempts (
        id,
        payout_id,
        attempt_no,
        provider,
        provider_charge_id,
        request_payload,
        response_payload,
        status,
        failure_reason,
        sent_at,
        completed_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      payoutId,
      execution.attemptNo,
      execution.provider,
      execution.providerChargeId,
      JSON.stringify({
        payoutId: execution.payoutId,
        providerReference: execution.providerReference,
        attemptNo: execution.attemptNo,
      }),
      JSON.stringify(execution.rawResponse ?? {}),
      execution.status,
      failedReason,
      createdAt,
      createdAt,
      createdAt,
    );

    return {
      id,
      payoutId,
      provider: execution.provider,
      providerChargeId: execution.providerChargeId,
      providerReference: execution.providerReference,
      status: execution.status,
      attemptNo: execution.attemptNo,
      rawResponse: execution.rawResponse,
      createdAt,
    };
  }

  addEvent(input: {
    payoutId: string;
    sellerId: string;
    eventType: string;
    actorType: string;
    actorId?: string | null;
    note?: string | null;
    payload?: Record<string, unknown> | null;
  }): void {
    this.db.prepare(
      `INSERT INTO payout_events (
        payout_id,
        seller_id,
        event_type,
        actor_type,
        actor_id,
        note,
        payload,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.payoutId,
      input.sellerId,
      input.eventType,
      input.actorType,
      input.actorId ?? null,
      input.note ?? null,
      input.payload ? JSON.stringify(input.payload) : null,
      new Date().toISOString(),
    );
  }

  private rowToPayout(row: Record<string, unknown>): PayoutRecord {
    return {
      id: row.id as string,
      sellerId: row.seller_id as string,
      orderId: (row.order_id as string | null) ?? null,
      escrowId: (row.escrow_id as string | null) ?? null,
      releaseEntryId: (row.release_entry_id as string | null) ?? null,
      amount: row.amount as number,
      currency: row.currency as string,
      status: row.status as PayoutStatus,
      provider: (row.provider as string | null) ?? null,
      providerChargeId: (row.provider_charge_id as string | null) ?? null,
      requestedBy: (row.requested_by as string | null) ?? null,
      requestedAt: (row.requested_at as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

export class PayoutService {
  constructor(private readonly repository = payoutRepository) {}

  createEligiblePayoutCandidate(input: CreateEligiblePayoutInput): PayoutRecord {
    return this.repository.createEligibleForRelease(input);
  }

  private gateForSubmission(payoutId: string): {
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
    destinationAccountName?: string | null;
    currentFailureReason?: string | null;
  } {
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
           spa.account_name AS destination_account_name,
           spa.masked_account AS destination_masked_account,
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

    if (!row) {
      return { allowed: false, reasonCode: 'payout_not_found', reason: 'Payout not found' };
    }

    const payoutStatus = String(row.status ?? '').toLowerCase();
    if (payoutStatus === 'cancelled') {
      return { allowed: false, reasonCode: 'payout_cancelled', reason: 'Payout is cancelled' };
    }
    if (payoutStatus === 'paid') {
      return { allowed: false, reasonCode: 'manual_review_required', reason: 'Payout is already paid' };
    }
    if (!['eligible', 'queued', 'failed', 'pending', 'held'].includes(payoutStatus)) {
      return {
        allowed: false,
        reasonCode: 'manual_review_required',
        reason: `Payout in ${payoutStatus} cannot be submitted`,
      };
    }

    const attempts = Number(row.attempt_count ?? 0);
    if (attempts >= PAYOUT_POLICY.maxRetryCount) {
      return {
        allowed: false,
        reasonCode: 'manual_review_required',
        reason: `Retry limit reached (${PAYOUT_POLICY.maxRetryCount})`,
      };
    }

    if (
      payoutStatus === 'failed' &&
      !isRetryableFailureCode((row.failure_reason as string | null | undefined) ?? null)
    ) {
      return {
        allowed: false,
        reasonCode: 'manual_review_required',
        reason: 'Failed payout is not retryable',
      };
    }

    const amount = Number(row.amount ?? 0);
    if (!Number.isFinite(amount) || amount < PAYOUT_POLICY.minimumPayoutAmount) {
      return {
        allowed: false,
        reasonCode: 'manual_review_required',
        reason: `Payout amount must be at least ${PAYOUT_POLICY.minimumPayoutAmount}`,
      };
    }

    const orderStatus = String(row.order_status ?? '').toLowerCase();
    if (orderStatus === 'disputed') {
      return { allowed: false, reasonCode: 'order_disputed', reason: 'Order is disputed' };
    }
    if (!['paid', 'in_escrow', 'fulfilled'].includes(orderStatus)) {
      return {
        allowed: false,
        reasonCode: 'order_not_releasable',
        reason: 'Order is not in a releasable state',
      };
    }

    const escrowState = String(row.escrow_state ?? '').toLowerCase();
    if (escrowState && escrowState !== 'released') {
      return {
        allowed: false,
        reasonCode: 'order_not_releasable',
        reason: 'Escrow must be released before payout submission',
      };
    }

    if (Number(row.seller_suspended ?? 0) === 1) {
      return { allowed: false, reasonCode: 'seller_suspended', reason: 'Seller is suspended' };
    }

    if (!row.destination_type) {
      return {
        allowed: false,
        reasonCode: 'destination_not_verified',
        reason: 'No payout destination selected',
      };
    }
    if (Number(row.destination_active ?? 0) !== 1) {
      return {
        allowed: false,
        reasonCode: 'destination_inactive',
        reason: 'Destination is inactive',
      };
    }
    if (String(row.destination_verification_status ?? '').toLowerCase() !== 'verified') {
      return {
        allowed: false,
        reasonCode: 'destination_not_verified',
        reason: 'Destination is not verified',
      };
    }

    return {
      allowed: true,
      sellerId: row.seller_id as string,
      amount,
      currency: (row.currency as string) ?? 'MWK',
      provider: (row.provider as string | null) ?? 'paychangu',
      destinationType: row.destination_type as 'bank' | 'mobile_money',
      destinationValue: (row.destination_masked_account as string | null) ?? null,
      destinationProviderRefId: (row.destination_provider_ref_id as string | null) ?? null,
      destinationAccountName: (row.destination_account_name as string | null) ?? null,
    };
  }

  private holdForReview(
    input: { payoutId: string; sellerId: string; reasonCode: string; reason: string },
    actor: { actorType: 'admin' | 'system'; actorId?: string | null },
  ): PayoutRecord | undefined {
    const payout = this.repository.updateStatus(input.payoutId, 'held', {
      provider: 'paychangu',
      providerStatus: 'held',
      failureReason: input.reasonCode,
      manualReviewReason: input.reason,
    });
    this.repository.addEvent({
      payoutId: input.payoutId,
      sellerId: input.sellerId,
      eventType: 'payout_held',
      actorType: actor.actorType,
      actorId: actor.actorId ?? null,
      note: input.reason,
      payload: {
        reasonCode: input.reasonCode,
      },
    });
    return payout;
  }

  async executePayout(input: ExecutePayoutInput) {
    const actor = { actorType: input.actorType ?? 'system', actorId: input.actorId ?? null };
    const gate = this.gateForSubmission(input.payoutId);

    if (!gate.allowed || !gate.sellerId || !gate.amount || !gate.currency || !gate.provider) {
      const payout = gate.sellerId
        ? this.holdForReview(
            {
              payoutId: input.payoutId,
              sellerId: gate.sellerId,
              reasonCode: gate.reasonCode ?? 'manual_review_required',
              reason: gate.reason ?? 'Payout failed eligibility gate',
            },
            actor,
          )
        : null;
      return {
        payout,
        attempt: null,
        execution: null,
      };
    }

    this.repository.updateStatus(input.payoutId, 'queued', {
      provider: gate.provider,
      providerStatus: 'queued',
    });
    this.repository.addEvent({
      payoutId: input.payoutId,
      sellerId: gate.sellerId,
      eventType: 'payout_queued',
      actorType: actor.actorType,
      actorId: actor.actorId ?? null,
      note: 'Payout queued for provider submission',
    });

    const balance = await this.getProviderBalance(gate.currency);

    if (balance.availableBalance < gate.amount) {
      const payout = this.holdForReview(
        {
          payoutId: input.payoutId,
          sellerId: gate.sellerId,
          reasonCode: 'balance_insufficient',
          reason: 'Insufficient provider payout balance',
        },
        actor,
      );

      this.repository.addEvent({
        payoutId: input.payoutId,
        sellerId: gate.sellerId,
        eventType: 'balance_check_failed',
        actorType: actor.actorType,
        actorId: actor.actorId ?? null,
        note: 'Insufficient provider payout balance',
        payload: {
          availableBalance: balance.availableBalance,
          requestedAmount: gate.amount,
          currency: gate.currency,
        },
      });

      return {
        payout,
        attempt: null,
        execution: null,
      };
    }

    const attemptNo = this.repository.nextAttemptNo(input.payoutId);
    this.repository.updateStatus(input.payoutId, 'processing', {
      provider: gate.provider,
      providerStatus: 'processing',
      sentAt: new Date().toISOString(),
    });

    const execution = await executePayChanguPayout({
      payoutId: input.payoutId,
      sellerId: gate.sellerId,
      amount: gate.amount,
      currency: gate.currency,
      providerName: gate.provider,
      destinationReference: gate.destinationValue ?? input.destinationReference ?? input.payoutId,
      attemptNo,
      destinationType: gate.destinationType,
      mobileMoneyOperatorRefId: gate.destinationProviderRefId ?? undefined,
      bankUuid: gate.destinationProviderRefId ?? undefined,
      bankAccountName: gate.destinationAccountName ?? undefined,
    });

    const attempt = this.repository.recordAttempt(input.payoutId, execution);
    const payout = this.repository.updateExecutionState(input.payoutId, execution);
    this.repository.updateStatus(input.payoutId, execution.status, {
      lastAttemptId: attempt.id,
      rawResponse: execution.rawResponse,
      failureReason: execution.status === 'failed' ? 'provider_unavailable' : null,
    });

    this.repository.addEvent({
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
    };
  }

  async getProviderBalance(currency = 'MWK') {
    return getPayChanguPayoutBalance(currency);
  }

  markPaid(payoutId: string, actorId: string, note?: string): PayoutRecord | undefined {
    const payout = this.repository.updateStatus(payoutId, 'paid', {
      paidAt: new Date().toISOString(),
      provider: 'paychangu',
      providerStatus: 'paid',
    });
    if (payout) {
      this.repository.addEvent({
        payoutId,
        sellerId: payout.sellerId,
        eventType: 'admin_mark_paid',
        actorType: 'admin',
        actorId,
        note: note ?? 'Admin marked payout as paid',
      });
    }
    return payout;
  }

  markFailed(payoutId: string, actorId: string, reason: string): PayoutRecord | undefined {
    const payout = this.repository.updateStatus(payoutId, 'failed', {
      failureReason: reason,
      failedAt: new Date().toISOString(),
      provider: 'paychangu',
      providerStatus: 'failed',
    });
    if (payout) {
      this.repository.addEvent({
        payoutId,
        sellerId: payout.sellerId,
        eventType: 'admin_mark_failed',
        actorType: 'admin',
        actorId,
        note: reason,
      });
    }
    return payout;
  }

  markHeld(payoutId: string, actorId: string, reason: string): PayoutRecord | undefined {
    const payout = this.repository.updateStatus(payoutId, 'held', {
      manualReviewReason: reason,
    });
    if (payout) {
      this.repository.addEvent({
        payoutId,
        sellerId: payout.sellerId,
        eventType: 'admin_hold',
        actorType: 'admin',
        actorId,
        note: reason,
      });
    }
    return payout;
  }

  processPayout(request: PayoutRequest) {
    return {
      status: 'processing',
      ...request,
    };
  }
}

export const payoutRepository = new PayoutRepository();
export const payoutService = new PayoutService();

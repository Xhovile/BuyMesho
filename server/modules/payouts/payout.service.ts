import './payout.schema.js';
import { createDecipheriv, randomUUID, scryptSync } from 'crypto';
import { getPaymentDb } from '../../sqlite.js';
import type { MoneyValue } from '../../../src/shared/types/common.js';
import {
  executePayChanguPayout,
  getPayChanguPayoutBalance,
  getPayChanguPayoutStatus,
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
  providerStatus?: string | null;
  lastAttemptId?: string | null;
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
  providerTransactionId: string | null;
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
  grossAmount: number;
  platformFeeAmount: number;
  processingFeeAmount: number;
  reserveAmount: number;
  reserveCapAmount: number;
  manualAdjustmentAmount: number;
  netAmount: number;
  formulaSnapshot: Record<string, unknown>;
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

export interface ReconcileProviderCallbackInput {
  payoutId: string;
  status: PayoutStatus;
  providerChargeId?: string | null;
  providerReference?: string | null;
  providerTransactionId?: string | null;
  rawPayload?: unknown;
  eventId?: string | number | null;
}

export type AdminOverrideAction = 'hold' | 'mark_paid' | 'mark_failed' | 'cancel';

export type PayoutPermissionActor = {
  uid: string;
  is_admin?: boolean;
};

export type PayoutPermissionContext = {
  sellerId: string;
  actor: PayoutPermissionActor | null;
};

const PAYOUT_ENCRYPTION_SECRET = process.env.SELLER_PAYOUT_ENCRYPTION_KEY ?? '';

type PayoutNextAction =
  | 'manual_review'
  | 'retry_blocked'
  | 'awaiting_provider'
  | 'none';

function classifyProviderFailureFromError(error: unknown): PayChanguPayoutFailureClass {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('rate-limit') ||
      message.includes('too many requests')
    ) {
      return 'provider_rate_limited';
    }
    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('etimedout')
    ) {
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
    case 'provider_unavailable':
    default:
      return 'Provider outage detected; payout held for manual review.';
  }
}

function isProviderHoldFailure(reasonCode: string | null | undefined): reasonCode is NonNullable<PayChanguPayoutFailureClass> {
  return (
    reasonCode === 'provider_unavailable' ||
    reasonCode === 'provider_timeout' ||
    reasonCode === 'provider_rate_limited'
  );
}

function isAdminActor(actor: PayoutPermissionActor | null): boolean {
  return actor?.is_admin === true;
}

function isSameSeller(actor: PayoutPermissionActor | null, sellerId: string): boolean {
  return !!actor?.uid && actor.uid === sellerId;
}

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
  if (parts.length !== 3) {
    return value;
  }

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

/**
 * System actor permission gate.
 * The system actor (e.g. scheduled reconciliation, automated release) may always
 * execute internal payout operations. System actions bypass human approval gates
 * but still emit audit events with actorType='system'.
 */
export function canExecuteSystemAction(_operation: string): boolean {
  return true;
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
         gross_amount,
         platform_fee_amount,
         processing_fee_amount,
         reserve_amount,
         reserve_cap_amount,
         manual_adjustment_amount,
         net_amount,
         formula_snapshot,
         currency,
         status,
         provider,
         provider_charge_id,
         requested_by,
         requested_at,
         raw_request,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'eligible', 'paychangu', NULL, ?, ?, ?, ?, ?)`,
     ).run(
       id,
       input.sellerId,
       input.orderId,
       input.escrowId,
       input.releaseEntryId,
       input.destinationAccountId ?? null,
       input.amount,
       input.grossAmount,
       input.platformFeeAmount,
       input.processingFeeAmount,
       input.reserveAmount,
       input.reserveCapAmount,
       input.manualAdjustmentAmount,
       input.netAmount,
       JSON.stringify(input.formulaSnapshot),
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

  updateExecutionState(
    payoutId: string,
    execution: PayChanguPayoutExecutionResult,
  ): PayoutRecord | undefined {
    const statusExtras: Record<string, unknown> = {
      provider: execution.provider,
      providerChargeId: execution.providerChargeId,
      providerReference: execution.providerReference,
      providerTransactionId: execution.providerTransactionId,
      providerStatus: execution.status,
    };

    if (execution.status === 'paid') {
      statusExtras.paidAt = new Date().toISOString();
    }

    if (execution.status === 'failed') {
      statusExtras.failedAt = new Date().toISOString();
      statusExtras.failureReason = execution.failureClass ?? 'provider_execution_failed';
      statusExtras.manualReviewReason = execution.failureClass
        ? providerFailureReason(execution.failureClass)
        : 'Provider reported payout failure';
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
    id: string,
    payoutId: string,
    execution: PayChanguPayoutExecutionResult,
  ): void {
    const createdAt = new Date().toISOString();
    const failedReason =
      execution.status === 'failed'
        ? execution.failureClass ?? 'provider_execution_failed'
        : null;

    this.db.prepare(
      `UPDATE payout_attempts
       SET provider = ?,
           provider_charge_id = ?,
           request_payload = ?,
           response_payload = ?,
           status = ?,
           failure_reason = ?,
           sent_at = ?,
           completed_at = ?,
           updated_at = ?
       WHERE id = ?`,
    ).run(
      execution.provider,
      execution.providerChargeId,
      JSON.stringify({
        payoutId: execution.payoutId,
        providerReference: execution.providerReference,
        providerTransactionId: execution.providerTransactionId,
        providerChargeId: execution.providerChargeId,
        attemptNo: execution.attemptNo,
        request: execution.rawResponse?.request ?? null,
      }),
      JSON.stringify(execution.rawResponse ?? {}),
      execution.status,
      failedReason,
      createdAt,
      createdAt,
      createdAt,
      id,
    );
  }

  reserveRetryAttempt(input: {
    payoutId: string;
    provider: string;
    actorType: 'admin' | 'system';
    actorId?: string | null;
  }): { id: string; attemptNo: number; providerChargeId: string; createdAt: string } {
    this.db.prepare('BEGIN IMMEDIATE TRANSACTION').run();
    try {
      const attemptNo = this.nextAttemptNo(input.payoutId);
      const providerChargeId = buildPayChanguPayoutChargeId(input.payoutId, attemptNo);
      const id = randomUUID();
      const now = new Date().toISOString();

      this.updateStatus(input.payoutId, 'processing', {
        provider: input.provider,
        providerChargeId,
        providerStatus: 'processing',
        approvedBy: input.actorType === 'admin' ? input.actorId ?? null : null,
        sentAt: now,
      });

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
          sent_at,
          completed_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        input.payoutId,
        attemptNo,
        input.provider,
        providerChargeId,
        JSON.stringify({ payoutId: input.payoutId, attemptNo }),
        null,
        'processing',
        now,
        null,
        now,
        now,
      );

      this.db.prepare('COMMIT').run();
      return { id, attemptNo, providerChargeId, createdAt: now };
    } catch (error) {
      this.db.prepare('ROLLBACK').run();
      throw error;
    }
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
      providerStatus: (row.provider_status as string | null) ?? null,
      requestedBy: (row.requested_by as string | null) ?? null,
      requestedAt: (row.requested_at as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

export class PayoutService {
  constructor(private readonly repository = payoutRepository) {}

  findById(id: string): PayoutRecord | undefined {
    return this.repository.findById(id);
  }

  createEligiblePayoutCandidate(input: CreateEligiblePayoutInput): PayoutRecord {
    return this.repository.createEligibleForRelease(input);
  }

  addEvent(input: Parameters<PayoutRepository['addEvent']>[0]): void {
    this.repository.addEvent(input);
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
      destinationProviderName?: string | null;
      destinationAccountName?: string | null;
      currentFailureReason?: string | null;
      currentProviderChargeId?: string | null;
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
        reasonCode: 'destination_disabled',
        reason: 'Destination is disabled',
      };
    }
    const destinationVerificationStatus = String(row.destination_verification_status ?? '').toLowerCase();
    if (destinationVerificationStatus === 'failed') {
      return {
        allowed: false,
        reasonCode: 'destination_failed',
        reason: 'Destination verification failed',
      };
    }
    if (destinationVerificationStatus === 'disabled') {
      return {
        allowed: false,
        reasonCode: 'destination_disabled',
        reason: 'Destination is disabled',
      };
    }
    if (destinationVerificationStatus !== 'verified') {
      return {
        allowed: false,
        reasonCode: 'destination_not_verified',
        reason: 'Destination is pending verification',
      };
    }

    const destinationValue = (
      row.destination_type === 'bank'
        ? decryptSensitiveValue((row.destination_account_number_encrypted as string | null) ?? null)
        : decryptSensitiveValue((row.destination_mobile_encrypted as string | null) ?? null)
    ) ?? null;

    if (!destinationValue) {
      return {
        allowed: false,
        reasonCode: 'destination_incomplete',
        reason: 'Destination details are incomplete',
      };
    }

    const destinationProviderRefId = ((row.destination_provider_ref_id as string | null) ?? '').trim();
    if (!destinationProviderRefId) {
      return {
        allowed: false,
        reasonCode: 'destination_incomplete',
        reason: 'Destination routing details are incomplete',
      };
    }

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

  private holdForReview(
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
    const payout = this.repository.updateStatus(input.payoutId, 'held', {
      provider: 'paychangu',
      providerStatus: 'held',
      failureReason: input.reasonCode,
      manualReviewReason: input.reason,
      ...(input.statusExtras ?? {}),
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
        ...(input.payload ?? {}),
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
        reasonCode: gate.reasonCode ?? 'manual_review_required',
        reason: gate.reason ?? 'Payout failed eligibility gate',
        nextAction: (payout ? 'manual_review' : 'none') as PayoutNextAction,
      };
    }

    this.repository.updateStatus(input.payoutId, 'queued', {
      provider: gate.provider,
      providerStatus: 'queued',
      approvedBy: actor.actorType === 'admin' ? actor.actorId ?? null : null,
    });
    this.repository.addEvent({
      payoutId: input.payoutId,
      sellerId: gate.sellerId,
      eventType: 'payout_queued',
      actorType: actor.actorType,
      actorId: actor.actorId ?? null,
      note: 'Payout queued for provider submission',
    });

    let balance: Awaited<ReturnType<typeof getPayChanguPayoutBalance>>;
    try {
      balance = await this.getProviderBalance(gate.currency);
    } catch (error) {
      const failureReason = classifyProviderFailureFromError(error) ?? 'provider_unavailable';
      const reason = providerFailureReason(failureReason);
      const payout = this.holdForReview(
        {
          payoutId: input.payoutId,
          sellerId: gate.sellerId,
          reasonCode: failureReason,
          reason,
          payload: {
            stage: 'balance_check',
            error: error instanceof Error ? error.message : String(error),
          },
        },
        actor,
      );

      this.repository.addEvent({
        payoutId: input.payoutId,
        sellerId: gate.sellerId,
        eventType: 'balance_check_failed',
        actorType: actor.actorType,
        actorId: actor.actorId ?? null,
        note: reason,
        payload: {
          reasonCode: failureReason,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      return {
        payout,
        attempt: null,
        execution: null,
        reasonCode: failureReason,
        reason,
        nextAction: 'manual_review' as PayoutNextAction,
      };
    }

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
        reasonCode: 'balance_insufficient',
        reason: 'Insufficient provider payout balance',
        nextAction: 'manual_review' as PayoutNextAction,
      };
    }

    const reservedAttempt = this.repository.reserveRetryAttempt({
      payoutId: input.payoutId,
      provider: gate.provider,
      actorType: actor.actorType,
      actorId: actor.actorId ?? null,
    });
    const attemptNo = reservedAttempt.attemptNo;
    const providerChargeId = reservedAttempt.providerChargeId;

    if (attemptNo > 1 || gate.currentFailureReason) {
      this.repository.addEvent({
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
          providerChargeId,
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

    this.repository.recordAttempt(reservedAttempt.id, input.payoutId, execution);
    const attempt: PayoutAttemptRecord = {
      id: reservedAttempt.id,
      payoutId: input.payoutId,
      provider: execution.provider,
      providerChargeId: execution.providerChargeId,
      providerReference: execution.providerReference,
      providerTransactionId: execution.providerTransactionId,
      status: execution.status,
      attemptNo: execution.attemptNo,
      rawResponse: execution.rawResponse,
      createdAt: reservedAttempt.createdAt,
    };
    if (execution.status === 'failed' && isProviderHoldFailure(execution.failureClass)) {
      const reason = providerFailureReason(execution.failureClass);
      const payout = this.holdForReview(
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

      this.repository.addEvent({
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

    const payout = this.repository.updateExecutionState(input.payoutId, execution);
    this.repository.updateStatus(input.payoutId, execution.status, {
      lastAttemptId: attempt.id,
      rawResponse: execution.rawResponse,
      failureReason: execution.status === 'failed'
        ? execution.failureClass ?? 'provider_execution_failed'
        : null,
      providerTransactionId: execution.providerTransactionId,
      approvedBy: actor.actorType === 'admin' ? actor.actorId ?? null : null,
      sentAt: execution.processedAt,
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
      reasonCode: execution.status === 'failed' ? execution.failureClass ?? 'provider_execution_failed' : null,
      reason: execution.status === 'failed'
        ? execution.failureClass
          ? providerFailureReason(execution.failureClass)
          : 'Provider reported payout failure.'
        : execution.status === 'paid'
          ? 'Payout paid successfully.'
          : 'Payout submitted to provider.',
      nextAction: execution.status === 'paid'
        ? 'none'
        : execution.status === 'failed'
          ? 'manual_review'
          : 'awaiting_provider',
    };
  }

  async getProviderBalance(currency = 'MWK') {
    return getPayChanguPayoutBalance(currency);
  }

  async reconcilePayoutStatus(input: {
    payoutId: string;
    actorType?: 'admin' | 'system';
    actorId?: string | null;
  }) {
    const db = getPaymentDb();
    const row = db.prepare(
      `SELECT
         p.id,
         p.seller_id,
         p.provider_charge_id,
         p.last_attempt_id,
         (
           SELECT provider_charge_id
           FROM payout_attempts pa
           WHERE pa.payout_id = p.id
           ORDER BY pa.attempt_no DESC
           LIMIT 1
         ) AS latest_attempt_charge_id
       FROM payouts p
       WHERE p.id = ?
       LIMIT 1`,
    ).get(input.payoutId) as Record<string, unknown> | undefined;

    if (!row) {
      throw new Error('Payout not found');
    }

    const chargeId = (row.provider_charge_id as string | null) ?? (row.latest_attempt_charge_id as string | null) ?? null;
    if (!chargeId) {
      throw new Error('Payout has no provider attempt to reconcile');
    }

    const status = await getPayChanguPayoutStatus(chargeId);
    const now = new Date().toISOString();
    const nextStatus = status.status;

    this.repository.updateStatus(input.payoutId, nextStatus, {
      provider: 'paychangu',
      providerChargeId: chargeId,
      providerReference: status.reference,
      providerTransactionId: status.transactionId,
      providerStatus: status.status,
      rawResponse: status.rawResponse,
      paidAt: nextStatus === 'paid' ? now : null,
      failedAt: nextStatus === 'failed' ? now : null,
      failureReason: nextStatus === 'failed' ? 'provider_status_failed' : null,
      manualReviewReason: nextStatus === 'failed' ? 'Provider status sync reported payout failure' : null,
    });

    if (row.last_attempt_id) {
      db.prepare(
        `UPDATE payout_attempts
         SET status = ?,
             response_payload = ?,
             completed_at = ?,
             updated_at = ?
         WHERE id = ?`,
      ).run(
        nextStatus,
        JSON.stringify(status.rawResponse ?? {}),
        now,
        now,
        row.last_attempt_id as string,
      );
    }

    this.repository.addEvent({
      payoutId: input.payoutId,
      sellerId: row.seller_id as string,
      eventType: 'payout_status_synced',
      actorType: input.actorType ?? 'admin',
      actorId: input.actorId ?? null,
      note: `Provider status sync recorded ${nextStatus}`,
      payload: {
        chargeId,
        providerReference: status.reference,
        providerTransactionId: status.transactionId,
        status: status.status,
        checkedAt: status.checkedAt,
      },
    });

    return {
      payout: this.repository.findById(input.payoutId),
      status,
    };
  }

  reconcileProviderCallback(input: ReconcileProviderCallbackInput): PayoutRecord | undefined {
    const db = getPaymentDb();
    const now = new Date().toISOString();
    const status = input.status;
    const failureReason = status === 'failed' ? 'Provider callback reported payout failure' : null;
    const rawResponse = JSON.stringify(input.rawPayload ?? {});

    const row = db.prepare(
      `SELECT id, seller_id
       FROM payouts
       WHERE id = ?
       LIMIT 1`,
    ).get(input.payoutId) as { id: string; seller_id: string } | undefined;

    if (!row) {
      return undefined;
    }

    const transaction = db.transaction(() => {
      db.prepare(
        `UPDATE payouts
         SET status = ?,
             provider = COALESCE(provider, 'paychangu'),
             provider_charge_id = COALESCE(?, provider_charge_id),
             provider_status = COALESCE(?, provider_status),
             provider_ref_id = COALESCE(?, provider_ref_id),
             provider_transaction_id = COALESCE(?, provider_transaction_id),
             raw_response = ?,
             paid_at = CASE WHEN ? = 'paid' THEN ? ELSE paid_at END,
             failed_at = CASE WHEN ? = 'failed' THEN ? ELSE failed_at END,
             failure_reason = CASE WHEN ? = 'failed' THEN ? ELSE failure_reason END,
             updated_at = ?
         WHERE id = ?`,
      ).run(
        status,
        input.providerChargeId ?? null,
        status,
        input.providerReference ?? null,
        input.providerTransactionId ?? null,
        rawResponse,
        status,
        now,
        status,
        now,
        status,
        failureReason,
        now,
        input.payoutId,
      );

      const latestAttempt = db.prepare(
        `SELECT id
         FROM payout_attempts
         WHERE payout_id = ?
           AND (? IS NULL OR provider_charge_id = ?)
         ORDER BY attempt_no DESC, created_at DESC
         LIMIT 1`,
      ).get(
        input.payoutId,
        input.providerChargeId ?? null,
        input.providerChargeId ?? null,
      ) as { id: string } | undefined;

      if (latestAttempt) {
        db.prepare(
          `UPDATE payout_attempts
           SET status = ?,
               response_payload = ?,
               completed_at = ?,
               updated_at = ?
           WHERE id = ?`,
        ).run(
          status,
          rawResponse,
          now,
          now,
          latestAttempt.id,
        );
      }

      this.repository.addEvent({
        payoutId: input.payoutId,
        sellerId: row.seller_id,
        eventType: 'payout_reconciled',
        actorType: 'system',
        actorId: null,
        note: 'Reconciled from provider callback',
        payload: {
          chargeId: input.providerChargeId ?? null,
          providerReference: input.providerReference ?? null,
          providerTransactionId: input.providerTransactionId ?? null,
          providerEventId: input.eventId ?? null,
          status,
        },
      });
    });

    transaction();
    return this.repository.findById(input.payoutId);
  }

  async reconcilePendingPayoutStatuses(input: {
    actorType?: 'admin' | 'system';
    actorId?: string | null;
    limit?: number;
  } = {}) {
    const limit = Math.max(1, Math.min(50, Number(input.limit ?? 25) || 25));
    const rows = getPaymentDb().prepare(
      `SELECT id
       FROM payouts
       WHERE provider = 'paychangu'
         AND provider_charge_id IS NOT NULL
         AND status IN ('queued', 'processing', 'pending', 'held', 'failed')
       ORDER BY updated_at ASC
       LIMIT ?`,
    ).all(limit) as Array<{ id: string }>;

    const results = [];
    for (const row of rows) {
      results.push(await this.reconcilePayoutStatus({
        payoutId: row.id,
        actorType: input.actorType,
        actorId: input.actorId,
      }));
    }

    return results;
  }

  markPaid(payoutId: string, actorId: string, note?: string): PayoutRecord | undefined {
    return this.applyAdminOverride({
      payoutId,
      action: 'mark_paid',
      actorId,
      reason: note,
    });
  }

  markFailed(payoutId: string, actorId: string, reason: string): PayoutRecord | undefined {
    return this.applyAdminOverride({
      payoutId,
      action: 'mark_failed',
      actorId,
      reason,
    });
  }

  markHeld(payoutId: string, actorId: string, reason: string): PayoutRecord | undefined {
    return this.applyAdminOverride({
      payoutId,
      action: 'hold',
      actorId,
      reason,
    });
  }

  applyAdminOverride(input: {
    payoutId: string;
    action: AdminOverrideAction;
    actorId: string;
    reason?: string | null;
    sellerId?: string | null;
  }): PayoutRecord | undefined {
    const reason = String(input.reason ?? '').trim();
    if (!reason) {
      throw new Error('reason is required');
    }

    const existing = this.repository.findById(input.payoutId);
    if (!existing) {
      return undefined;
    }

    if (input.sellerId && existing.sellerId !== input.sellerId) {
      throw new Error('Payout does not belong to the provided seller');
    }

    const from = existing.status;
    const allowedTransitions: Record<AdminOverrideAction, ReadonlySet<PayoutStatus>> = {
      hold: new Set(['eligible', 'queued', 'processing', 'pending', 'failed']),
      mark_paid: new Set(['held']),
      mark_failed: new Set(['eligible', 'queued', 'processing', 'pending', 'held']),
      cancel: new Set(['eligible', 'queued', 'failed', 'held']),
    };
    if (!allowedTransitions[input.action].has(from)) {
      throw new Error(`Invalid admin override transition from ${from} via ${input.action}`);
    }

    // Admins are allowed to mark payouts as paid even when no provider attempt
    // exists (e.g., manual settlement after a blocked submission). Do not block
    // the transition based on provider attempt presence.

    let payout: PayoutRecord | undefined;
    if (input.action === 'mark_paid') {
      payout = this.repository.updateStatus(input.payoutId, 'paid', {
        paidAt: new Date().toISOString(),
        provider: 'paychangu',
        providerStatus: 'paid',
        processedBy: input.actorId,
        approvedBy: input.actorId,
        failureReason: null,
      });
    } else if (input.action === 'mark_failed') {
      payout = this.repository.updateStatus(input.payoutId, 'failed', {
        failureReason: reason,
        failedAt: new Date().toISOString(),
        provider: 'paychangu',
        providerStatus: 'failed',
        processedBy: input.actorId,
        approvedBy: input.actorId,
      });
    } else if (input.action === 'cancel') {
      payout = this.repository.updateStatus(input.payoutId, 'cancelled', {
        failureReason: 'payout_cancelled',
        failedAt: new Date().toISOString(),
        manualReviewReason: reason,
        processedBy: input.actorId,
        approvedBy: input.actorId,
      });
    } else {
      payout = this.repository.updateStatus(input.payoutId, 'held', {
        manualReviewReason: reason,
        providerStatus: 'held',
        processedBy: input.actorId,
        approvedBy: input.actorId,
      });
    }
    if (payout) {
      const eventType =
        input.action === 'mark_paid'
          ? 'admin_mark_paid'
          : input.action === 'mark_failed'
            ? 'admin_mark_failed'
            : input.action === 'cancel'
              ? 'admin_cancel'
              : 'admin_hold';
      this.repository.addEvent({
        payoutId: input.payoutId,
        sellerId: payout.sellerId,
        eventType,
        actorType: 'admin',
        actorId: input.actorId,
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

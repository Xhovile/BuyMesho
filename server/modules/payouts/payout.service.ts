import './payout.schema.js';
import { randomUUID } from 'crypto';
import { getPaymentDb } from '../../sqlite.js';
import type { MoneyValue } from '../../../src/shared/types/common.js';
import {
  executePayChanguPayout,
  getPayChanguPayoutBalance,
  type PayChanguPayoutExecutionResult,
} from './paychangu.payout.js';

export type PayoutStatus =
  | 'eligible'
  | 'queued'
  | 'processing'
  | 'pending'
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
}

export interface PayoutRequest {
  sellerId: string;
  amount: MoneyValue;
}

export interface ExecutePayoutInput {
  payoutId: string;
  sellerId: string;
  amount: number;
  currency: string;
  providerName: string;
  destinationReference: string;
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
  return isAdminActor(context.actor) || isSameSeller(context.actor, context.sellerId);
}

export function canViewPayoutHistory(context: PayoutPermissionContext): boolean {
  return isAdminActor(context.actor) || isSameSeller(context.actor, context.sellerId);
}

export function canRequestPayoutRetry(context: PayoutPermissionContext): boolean {
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
        amount,
        currency,
        status,
        provider,
        provider_charge_id,
        requested_by,
        requested_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'eligible', 'paychangu', NULL, ?, ?, ?, ?)`,
    ).run(
      id,
      input.sellerId,
      input.orderId,
      input.escrowId,
      input.releaseEntryId,
      input.amount,
      input.currency,
      input.requestedBy,
      now,
      now,
      now,
    );

    const created = this.findByEscrowId(input.escrowId);
    if (!created) {
      throw new Error('Failed to create payout candidate');
    }
    return created;
  }

  updateStatus(id: string, status: PayoutStatus, extra: Partial<PayoutRecord> = {}): PayoutRecord | undefined {
    const now = new Date().toISOString();
    this.db.prepare(
      `UPDATE payouts
       SET status = ?,
           provider = COALESCE(?, provider),
           provider_charge_id = COALESCE(?, provider_charge_id),
           updated_at = ?
       WHERE id = ?`,
    ).run(status, extra.provider ?? null, extra.providerChargeId ?? null, now, id);

    return this.findById(id);
  }

  updateExecutionState(
    payoutId: string,
    execution: PayChanguPayoutExecutionResult,
  ): PayoutRecord | undefined {
    const now = new Date().toISOString();

    this.db.prepare(
      `UPDATE payouts
       SET status = ?,
           provider = ?,
           provider_charge_id = ?,
           updated_at = ?
       WHERE id = ?`,
    ).run(
      execution.status,
      execution.provider,
      execution.providerChargeId,
      now,
      payoutId,
    );

    return this.findById(payoutId);
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

    this.db.prepare(
      `INSERT INTO payout_attempts (
        id,
        payout_id,
        provider,
        provider_charge_id,
        provider_reference,
        status,
        attempt_no,
        raw_response,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      payoutId,
      execution.provider,
      execution.providerChargeId,
      execution.providerReference,
      execution.status,
      execution.attemptNo,
      JSON.stringify(execution.rawResponse ?? {}),
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

  async executePayout(input: ExecutePayoutInput) {
    const attemptNo = this.repository.nextAttemptNo(input.payoutId);

    const execution = await executePayChanguPayout({
      payoutId: input.payoutId,
      sellerId: input.sellerId,
      amount: input.amount,
      currency: input.currency,
      providerName: input.providerName,
      destinationReference: input.destinationReference,
      attemptNo,
    });

    const payout = this.repository.updateExecutionState(input.payoutId, execution);
    const attempt = this.repository.recordAttempt(input.payoutId, execution);

    this.repository.addEvent({
      payoutId: input.payoutId,
      sellerId: input.sellerId,
      eventType: 'provider_attempt_created',
      actorType: 'system',
      note: `Provider attempt ${attemptNo} created`,
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
    const payout = this.repository.updateStatus(payoutId, 'pending', {
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
import { randomUUID } from 'crypto';
import { getPaymentDb } from '../../sqlite.js';
import type { MoneyValue } from '../../../src/shared/types/common.js';

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

  createEligibleForRelease(input: CreateEligiblePayoutInput): PayoutRecord {
    const existing = this.findByEscrowId(input.escrowId);
    if (existing) return existing;

    const now = input.requestedAt ?? new Date().toISOString();
    const id = randomUUID();
    const providerChargeId = `BM-PO-${id}`;

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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'eligible', 'paychangu', ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.sellerId,
      input.orderId,
      input.escrowId,
      input.releaseEntryId,
      input.amount,
      input.currency,
      providerChargeId,
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

  processPayout(request: PayoutRequest) {
    return {
      status: 'processing',
      ...request,
    };
  }
}

export const payoutRepository = new PayoutRepository();
export const payoutService = new PayoutService();

import { createRequire } from 'node:module';
import { payoutRepository, type PayoutTransitionRepository } from './payout.transition-repository.js';
import { applyAdminOverrideAtomic } from './payout.admin-override.atomic.js';
import { query } from '../../postgres.js';
import { notifyPayoutCompleted } from '../notifications/payout-completed.notification.js';
import { notifyPayoutFinalFailed } from '../notifications/payout-final-failed.notification.js';
import { notifyAdminsPayoutFinalFailed } from '../notifications/admin-payout-failed.notification.js';
import { buildPayoutOrderTitle } from '../email/order-title.js';
import { PAYOUT_POLICY } from './payout.policy.js';
import type { PoolClient } from 'pg';
import {
  type CreateConnectPayoutInput,
  type CreateEligiblePayoutInput,
  type ExecutePayoutInput,
  type PayoutRecord,
  type PayoutRequest,
  type ReconcileProviderCallbackInput,
} from './payout.shared.js';

const require = createRequire(import.meta.url);

function payoutDebug(stage: string, details?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== 'test') return;
  console.error(`[payout-debug] ${stage}`, details ?? {});
}

async function notifySellerOfPaidPayout(payout: PayoutRecord | undefined): Promise<void> {
  if (!payout || payout.status !== 'paid') return;

  try {
    const result = await query<{
      email?: string | null;
      business_name?: string | null;
      order_items?: unknown;
      masked_account?: string | null;
    }>(
      `SELECT s.email, s.business_name, o.items AS order_items, spa.masked_account
         FROM sellers s
         LEFT JOIN orders o ON o.id = $2
         LEFT JOIN seller_payout_accounts spa
           ON spa.id = $3
          AND spa.seller_uid = s.uid
        WHERE s.uid = $1
        LIMIT 1`,
      [payout.sellerId, payout.orderId ?? null, payout.destinationAccountId ?? null],
    );
    const email = result.rows[0]?.email?.trim();
    if (!email) return;

    await notifyPayoutCompleted({
      email,
      sellerName: result.rows[0]?.business_name?.trim() || 'there',
      amount: Number(payout.amount ?? 0),
      currency: payout.currency || 'MWK',
      payoutId: payout.id,
      orderReference: payout.orderId,
      orderTitle: buildPayoutOrderTitle(result.rows[0]?.order_items),
      destination: result.rows[0]?.masked_account?.trim() || null,
      completedAt: payout.updatedAt || new Date().toISOString(),
      status: payout.status,
    });
  } catch (error) {
    console.warn('[notification] payout_completed email delivery failed', error);
  }
}

async function notifySellerOfFinalPayoutFailure(
  payout: PayoutRecord | undefined,
  attemptNo: number | null | undefined,
): Promise<void> {
  if (!payout || payout.status !== 'failed' || Number(attemptNo ?? 0) < PAYOUT_POLICY.maxRetryCount) return;

  try {
    const result = await query<{
      email?: string | null;
      business_name?: string | null;
      order_items?: unknown;
      masked_account?: string | null;
    }>(
      `SELECT s.email, s.business_name, o.items AS order_items, spa.masked_account
         FROM sellers s
         LEFT JOIN orders o ON o.id = $2
         LEFT JOIN seller_payout_accounts spa
           ON spa.id = $3
          AND spa.seller_uid = s.uid
        WHERE s.uid = $1
        LIMIT 1`,
      [payout.sellerId, payout.orderId ?? null, payout.destinationAccountId ?? null],
    );
    const email = result.rows[0]?.email?.trim();
    if (!email) return;

    const sellerName = result.rows[0]?.business_name?.trim() || 'there';
    const orderTitle = buildPayoutOrderTitle(result.rows[0]?.order_items);
    const destination = result.rows[0]?.masked_account?.trim() || null;
    const attempt = Number(attemptNo);
    const failureReason = payout.failureReason ?? null;
    const failedAt = payout.updatedAt || new Date().toISOString();

    await notifyPayoutFinalFailed({
      email,
      sellerName,
      amount: Number(payout.amount ?? 0),
      currency: payout.currency || 'MWK',
      payoutId: payout.id,
      orderReference: payout.orderId,
      orderTitle,
      destination,
      attemptNo: attempt,
      failureReason,
      failedAt,
    });

    await notifyAdminsPayoutFinalFailed({
      sellerName,
      amount: Number(payout.amount ?? 0),
      currency: payout.currency || 'MWK',
      payoutId: payout.id,
      orderReference: payout.orderId,
      orderTitle,
      destination,
      attemptNo: attempt,
      failureReason,
      failedAt,
    });
  } catch (error) {
    console.warn('[notification] payout_final_failed email delivery failed', error);
  }
}

async function notifySellerIfPaid(payout: PayoutRecord | undefined): Promise<PayoutRecord | undefined> {
  if (payout?.status === 'paid') {
    await notifySellerOfPaidPayout(payout);
  }
  return payout;
}

export class PayoutService {
  constructor(private readonly repository: PayoutTransitionRepository = payoutRepository) {}

  findById(id: string): PayoutRecord | undefined {
    return this.repository.findById(id);
  }

  createEligiblePayoutCandidate(input: CreateEligiblePayoutInput): PayoutRecord {
    return this.repository.createEligibleForRelease(input);
  }

  async createEligiblePayoutCandidateAsync(input: CreateEligiblePayoutInput, client?: PoolClient): Promise<PayoutRecord> {
    payoutDebug('candidate:service:start', {
      hasClient: Boolean(client),
      repositoryType: this.repository?.constructor?.name,
      escrowId: input.escrowId,
      amount: input.amount,
    });
    const result = await this.repository.createEligibleForReleaseAsync(input, client);
    payoutDebug('candidate:service:end', { payoutId: result.id, status: result.status });
    return result;
  }

  createConnectPayoutCandidate(input: CreateConnectPayoutInput): { payout: PayoutRecord; created: boolean } {
    return this.repository.createConnectPayoutCandidate(input);
  }

  addEvent(input: Parameters<PayoutTransitionRepository['addEvent']>[0]): void {
    this.repository.addEvent(input);
  }

  async addEventAsync(input: Parameters<PayoutTransitionRepository['addEvent']>[0], client?: PoolClient): Promise<void> {
    return this.repository.addEventAsync(input, client);
  }

  async executePayout(input: ExecutePayoutInput) {
    const { executePayoutFlow } = await import('./payout.service.execution.js');
    const result = await executePayoutFlow(this.repository, input);
    await notifySellerIfPaid(result.payout);
    if (result.payout?.status === 'failed' && result.attempt?.attemptNo != null) {
      await notifySellerOfFinalPayoutFailure(result.payout, result.attempt.attemptNo);
    }
    return result;
  }

  async getProviderBalance(currency = 'MWK') {
    const { getProviderBalance } = await import('./payout.service.execution.js');
    return getProviderBalance(currency);
  }

  async reconcilePayoutStatus(input: {
    payoutId: string;
    actorType?: 'admin' | 'system';
    actorId?: string | null;
  }) {
    const { reconcilePayoutStatusFlow } = await import('./payout.service.reconciliation.js');
    const result = await reconcilePayoutStatusFlow(this.repository, input);
    await notifySellerIfPaid(result.payout);
    return result;
  }

  reconcileProviderCallback(input: ReconcileProviderCallbackInput): PayoutRecord | undefined {
    const { reconcileProviderCallbackFlow } = require('./payout.service.reconciliation.js') as typeof import('./payout.service.reconciliation.js');
    const payout = reconcileProviderCallbackFlow(this.repository, input);
    if (payout?.status === 'paid') {
      void notifySellerOfPaidPayout(payout);
    }
    return payout;
  }

  async reconcilePendingPayoutStatuses(input: {
    actorType?: 'admin' | 'system';
    actorId?: string | null;
    limit?: number;
  } = {}) {
    const { reconcilePendingPayoutStatusesFlow } = await import('./payout.service.reconciliation.js');
    const results = await reconcilePendingPayoutStatusesFlow(this.repository, input);
    for (const result of results) {
      if (result.ok && (result.payout as PayoutRecord | undefined)?.status === 'paid') {
        await notifySellerOfPaidPayout(result.payout as PayoutRecord);
      }
    }
    return results;
  }

  markPaid(payoutId: string, actorId: string, note?: string): PayoutRecord | undefined {
    const payout = applyAdminOverrideAtomic(this.repository, {
      payoutId,
      action: 'mark_paid',
      actorId,
      reason: note,
    });
    if (payout?.status === 'paid') {
      void notifySellerOfPaidPayout(payout);
    }
    return payout;
  }

  markFailed(payoutId: string, actorId: string, reason: string): PayoutRecord | undefined {
    return applyAdminOverrideAtomic(this.repository, {
      payoutId,
      action: 'mark_failed',
      actorId,
      reason,
    });
  }

  markHeld(payoutId: string, actorId: string, reason: string): PayoutRecord | undefined {
    return applyAdminOverrideAtomic(this.repository, {
      payoutId,
      action: 'hold',
      actorId,
      reason,
    });
  }

  applyAdminOverride(input: {
    payoutId: string;
    action: 'hold' | 'mark_paid' | 'mark_failed' | 'cancel';
    actorId: string;
    reason?: string | null;
    sellerId?: string | null;
  }): PayoutRecord | undefined {
    const payout = applyAdminOverrideAtomic(this.repository, input);
    if (input.action === 'mark_paid' && payout?.status === 'paid') {
      void notifySellerOfPaidPayout(payout);
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

export const payoutService = new PayoutService();

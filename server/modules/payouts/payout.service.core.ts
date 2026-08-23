import { payoutRepository, type PayoutTransitionRepository } from './payout.transition-repository.js';
import { applyAdminOverrideAtomic } from './payout.admin-override.atomic.js';
import type { PoolClient } from 'pg';
import {
  type CreateConnectPayoutInput,
  type CreateEligiblePayoutInput,
  type ExecutePayoutInput,
  type PayoutRecord,
  type PayoutRequest,
  type ReconcileProviderCallbackInput,
} from './payout.shared.js';

function payoutDebug(stage: string, details?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== 'test') return;
  console.error(`[payout-debug] ${stage}`, details ?? {});
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
    return executePayoutFlow(this.repository, input);
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
    return reconcilePayoutStatusFlow(this.repository, input);
  }

  reconcileProviderCallback(input: ReconcileProviderCallbackInput): PayoutRecord | undefined {
    // This flow remains synchronous by contract; defer the provider/reconciliation
    // module load until the operation is actually requested.
    throw new Error('reconcileProviderCallback is not available through the async payout service facade');
  }

  async reconcilePendingPayoutStatuses(input: {
    actorType?: 'admin' | 'system';
    actorId?: string | null;
    limit?: number;
  } = {}) {
    const { reconcilePendingPayoutStatusesFlow } = await import('./payout.service.reconciliation.js');
    return reconcilePendingPayoutStatusesFlow(this.repository, input);
  }

  markPaid(payoutId: string, actorId: string, note?: string): PayoutRecord | undefined {
    return applyAdminOverrideAtomic(this.repository, {
      payoutId,
      action: 'mark_paid',
      actorId,
      reason: note,
    });
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
    return applyAdminOverrideAtomic(this.repository, input);
  }

  processPayout(request: PayoutRequest) {
    return {
      status: 'processing',
      ...request,
    };
  }
}

export const payoutService = new PayoutService();

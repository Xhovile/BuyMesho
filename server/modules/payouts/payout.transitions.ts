import type { PayoutStatus } from './payout.shared.js';

/**
 * Legal payout lifecycle transitions.
 *
 * Persistence remains in PayoutRepository. This module only owns the
 * financial state-transition policy.
 */
const PAYOUT_TRANSITIONS: Record<PayoutStatus, readonly PayoutStatus[]> = {
  eligible: ['pending_settlement', 'held', 'cancelled'],
  pending_settlement: ['ready_for_payout', 'queued', 'processing', 'held', 'failed', 'cancelled'],
  ready_for_payout: ['queued', 'processing', 'held', 'failed', 'cancelled'],
  queued: ['processing', 'held', 'failed', 'cancelled'],
  processing: ['pending', 'paid', 'failed', 'held', 'cancelled'],
  pending: ['processing', 'failed', 'held', 'cancelled'],
  held: ['ready_for_payout', 'queued', 'processing', 'cancelled'],
  failed: ['pending', 'processing', 'held', 'cancelled'],
  paid: [],
  cancelled: [],
};

export function assertPayoutStatusTransition(
  from: PayoutStatus,
  to: PayoutStatus,
): void {
  if (from === to) {
    throw new Error(`Payout is already ${from}`);
  }

  if (PAYOUT_TRANSITIONS[from].includes(to)) return;

  throw new Error(`Illegal payout status transition: ${from} -> ${to}`);
}

export function getAllowedPayoutTransitions(
  status: PayoutStatus,
): readonly PayoutStatus[] {
  return PAYOUT_TRANSITIONS[status];
}

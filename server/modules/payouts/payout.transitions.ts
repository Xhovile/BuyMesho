import type { PayoutStatus } from './payout.shared.js';

/**
 * Legal payout lifecycle transitions.
 *
 * This is intentionally a small policy module rather than a generic state-machine
 * framework. The repository remains responsible for persistence; this module only
 * answers whether a requested status change is legal.
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

export function canTransitionPayoutStatus(
  from: PayoutStatus,
  to: PayoutStatus,
): boolean {
  if (from === to) return false;
  return PAYOUT_TRANSITIONS[from].includes(to);
}

export function assertPayoutStatusTransition(
  from: PayoutStatus,
  to: PayoutStatus,
): void {
  if (canTransitionPayoutStatus(from, to)) return;

  if (from === to) {
    throw new Error(`Payout is already ${from}`);
  }

  throw new Error(`Illegal payout status transition: ${from} -> ${to}`);
}

export function getAllowedPayoutTransitions(
  status: PayoutStatus,
): readonly PayoutStatus[] {
  return PAYOUT_TRANSITIONS[status];
}

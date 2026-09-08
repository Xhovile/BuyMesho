import assert from 'node:assert/strict';
import test from 'node:test';
import { isPendingDispute, isSettledDispute, orderStatusLabel, settlementLabel } from './utils.js';
import type { OrderBundle } from './types.js';

function makeBundle(outcome: string | null): OrderBundle {
  return {
    order: {
      id: 'order-test',
      status: 'fulfilled',
      deliveryStatus: 'delivered',
      currency: 'MWK',
      subtotal: { amount: 1000, currency: 'MWK' },
      total: { amount: 1000, currency: 'MWK' },
      items: [{ title: 'Test item', quantity: 1, unitPrice: { amount: 1000, currency: 'MWK' } }],
      createdAt: '2026-09-08T00:00:00.000Z',
      updatedAt: '2026-09-08T00:00:00.000Z',
    },
    payment: null,
    escrow: null,
    payoutStatus: 'paid',
    dispute: outcome
      ? { id: 'dispute-test', caseId: 'case-test', status: 'resolved', state: 'resolved', outcome }
      : { id: 'dispute-test', caseId: 'case-test', status: 'open', state: 'open', outcome: null },
    refundRequest: null,
  };
}

test('settled seller resolutions are never treated as pending disputes', () => {
  for (const outcome of [
    'seller_refund_confirmed',
    'seller_refund_accepted',
    'seller_replacement_confirmed',
    'seller_replacement_committed',
    'seller_rejected',
    'seller_dispute_rejected',
  ]) {
    const bundle = makeBundle(outcome);
    assert.equal(isSettledDispute(bundle), true);
    assert.equal(isPendingDispute(bundle), false);
  }
});

test('pending disputes remain actionable only before settlement', () => {
  assert.equal(isPendingDispute(makeBundle(null)), true);
});

test('settlement label follows the persisted seller outcome', () => {
  assert.equal(settlementLabel(makeBundle('seller_refund_confirmed')), 'Refunded');
  assert.equal(settlementLabel(makeBundle('seller_replacement_confirmed')), 'Replacement');
  assert.equal(settlementLabel(makeBundle('seller_rejected')), 'Rejected');
});

test('order status label exposes the final resolution', () => {
  assert.equal(orderStatusLabel(makeBundle('seller_refund_confirmed')), 'Dispute — Refunded');
  assert.equal(orderStatusLabel(makeBundle('seller_replacement_committed')), 'Dispute — Replacement');
  assert.equal(orderStatusLabel(makeBundle('seller_dispute_rejected')), 'Dispute — Rejected');
});

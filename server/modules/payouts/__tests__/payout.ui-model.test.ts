import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sellerOperationalSignals } from '../../../../src/SellerPayoutsPage.js';
import { getVisibleAdminActions } from '../../../../src/AdminPayoutQueue.js';

test('seller operational signals include hold and verification blockers', () => {
  const messages = sellerOperationalSignals({
    id: 'payout-ui-seller-1',
    sellerId: 'seller-1',
    orderId: 'order-1',
    escrowId: 'escrow-1',
    releaseEntryId: 'release-1',
    amount: 1500,
    currency: 'MWK',
    status: 'held',
    provider: 'paychangu',
    providerChargeId: null,
    destinationStatus: 'pending',
    holdReason: 'manual review required',
    lastFailureReason: 'provider_timeout',
    retryAllowed: false,
    manualReviewPending: true,
    verificationBlockers: ['Update destination to continue'],
    requestedBy: 'system',
    requestedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  assert.ok(messages.includes('Destination pending verification'));
  assert.ok(messages.includes('Payout held'));
  assert.ok(messages.includes('Awaiting admin review'));
  assert.ok(messages.includes('Update destination to continue'));
});

test('seller operational signals include provider failure and retry unavailable', () => {
  const messages = sellerOperationalSignals({
    id: 'payout-ui-seller-2',
    sellerId: 'seller-1',
    orderId: 'order-2',
    escrowId: 'escrow-2',
    releaseEntryId: 'release-2',
    amount: 1500,
    currency: 'MWK',
    status: 'failed',
    provider: 'paychangu',
    providerChargeId: null,
    retryAllowed: false,
    requestedBy: 'system',
    requestedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  assert.ok(messages.includes('Failed due to provider issue'));
  assert.ok(messages.includes('Retry unavailable'));
});

test('admin action visibility is restricted to admins', () => {
  assert.deepEqual(getVisibleAdminActions(false), []);
  assert.deepEqual(getVisibleAdminActions(true), ['retry', 'mark_paid', 'hold', 'mark_failed']);
});

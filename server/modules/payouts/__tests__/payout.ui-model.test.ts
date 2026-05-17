import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sellerOperationalSignals, getVisibleAdminActions } from '../../../../src/modules/payouts/uiModel.js';

test('seller operational signals include hold and verification blockers', () => {
  const messages = sellerOperationalSignals({
    status: 'held',
    destinationStatus: 'pending',
    retryAllowed: false,
    manualReviewPending: true,
    verificationBlockers: ['Update destination to continue'],
  });

  assert.ok(messages.includes('Destination pending verification'));
  assert.ok(messages.includes('Payout held'));
  assert.ok(messages.includes('Awaiting admin review'));
  assert.ok(messages.includes('Update destination to continue'));
});

test('seller operational signals include provider failure and retry unavailable', () => {
  const messages = sellerOperationalSignals({
    status: 'failed',
    retryAllowed: false,
  });

  assert.ok(messages.includes('Failed due to provider issue'));
  assert.ok(messages.includes('Retry unavailable'));
});

test('admin action visibility is restricted to admins', () => {
  assert.deepEqual(getVisibleAdminActions(false), []);
  assert.deepEqual(getVisibleAdminActions(true), ['retry', 'mark_paid', 'hold', 'mark_failed']);
});

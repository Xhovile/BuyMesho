import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isSettledSellerOutcome,
  sellerResolutionFromOutcome,
} from '../seller-resolution.js';

test('seller resolution outcomes map to the exact seller choice', () => {
  assert.equal(sellerResolutionFromOutcome('seller_refund_confirmed'), 'refund');
  assert.equal(sellerResolutionFromOutcome('seller_refund_accepted'), 'refund');
  assert.equal(sellerResolutionFromOutcome('seller_replacement_confirmed'), 'replacement');
  assert.equal(sellerResolutionFromOutcome('seller_replacement_committed'), 'replacement');
  assert.equal(sellerResolutionFromOutcome('seller_rejected'), 'rejected');
  assert.equal(sellerResolutionFromOutcome('seller_dispute_rejected'), 'rejected');
});

test('seller resolution outcome mapping is normalized', () => {
  assert.equal(sellerResolutionFromOutcome(' SELLER_REFUND_CONFIRMED '), 'refund');
  assert.equal(sellerResolutionFromOutcome('Seller_Replacement_Committed'), 'replacement');
  assert.equal(sellerResolutionFromOutcome(null), null);
  assert.equal(sellerResolutionFromOutcome('buyer_wins'), null);
});

test('only terminal seller outcomes are considered settled', () => {
  for (const outcome of [
    'seller_refund_confirmed',
    'seller_refund_accepted',
    'seller_replacement_confirmed',
    'seller_replacement_committed',
    'seller_rejected',
    'seller_dispute_rejected',
  ]) {
    assert.equal(isSettledSellerOutcome(outcome), true);
  }

  for (const outcome of [
    'open',
    'under_review',
    'awaiting_response',
    'buyer_wins',
    'seller_wins',
    'approved',
    '',
  ]) {
    assert.equal(isSettledSellerOutcome(outcome), false);
  }
});

test('a settled seller resolution is immutable', () => {
  const submittedOutcome = 'seller_dispute_rejected';
  const submittedResolution = sellerResolutionFromOutcome(submittedOutcome);

  assert.equal(submittedResolution, 'rejected');
  assert.equal(sellerResolutionFromOutcome(submittedOutcome), submittedResolution);
  assert.notEqual(submittedResolution, 'replacement');
  assert.notEqual(submittedResolution, 'refund');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertDisputeAttemptTransition,
  assertDisputeCaseTransition,
  assertEscrowTransition,
  assertRefundTransition,
  transitionMovesMoney,
  REFUND_TRANSITION_TABLE,
} from '../state-machine.js';

test('refund workflow separates approval from money movement', () => {
  assert.doesNotThrow(() => assertRefundTransition('under_review', 'approved', 'admin'));
  assert.doesNotThrow(() => assertRefundTransition('approved', 'processing', 'financial_workflow'));
  assert.doesNotThrow(() => assertRefundTransition('processing', 'refunded', 'financial_workflow'));
  assert.equal(transitionMovesMoney(REFUND_TRANSITION_TABLE, 'under_review', 'approved'), false);
  assert.equal(transitionMovesMoney(REFUND_TRANSITION_TABLE, 'approved', 'processing'), true);
});

test('refund workflow prevents terminal-state mutation', () => {
  assert.throws(() => assertRefundTransition('refunded', 'processing', 'financial_workflow'), /Illegal state transition/);
  assert.throws(() => assertRefundTransition('rejected', 'approved', 'admin'), /Illegal state transition/);
  assert.throws(() => assertRefundTransition('unavailable', 'approved', 'admin'), /Illegal state transition/);
});

test('only authorized actors can approve and execute refunds', () => {
  assert.throws(() => assertRefundTransition('under_review', 'approved', 'seller'), /cannot perform/);
  assert.throws(() => assertRefundTransition('approved', 'processing', 'admin'), /cannot perform/);
  assert.doesNotThrow(() => assertRefundTransition('approved', 'processing', 'system'));
});

test('dispute case requires formal review before a final outcome', () => {
  assert.doesNotThrow(() => assertDisputeCaseTransition('open', 'under_review', 'admin'));
  assert.doesNotThrow(() => assertDisputeCaseTransition('under_review', 'resolved', 'admin'));
  assert.doesNotThrow(() => assertDisputeCaseTransition('under_review', 'rejected', 'admin'));
  assert.throws(() => assertDisputeCaseTransition('open', 'resolved', 'admin'), /Illegal state transition/);
  assert.throws(() => assertDisputeCaseTransition('resolved', 'open', 'admin'), /Illegal state transition/);
});

test('dispute attempts have the same independent review lifecycle', () => {
  assert.doesNotThrow(() => assertDisputeAttemptTransition('open', 'under_review', 'system'));
  assert.doesNotThrow(() => assertDisputeAttemptTransition('under_review', 'rejected', 'admin'));
  assert.throws(() => assertDisputeAttemptTransition('rejected', 'under_review', 'admin'), /Illegal state transition/);
});

test('escrow dispute review does not itself move money', () => {
  assert.doesNotThrow(() => assertEscrowTransition('held', 'disputed', 'system'));
  assert.doesNotThrow(() => assertEscrowTransition('disputed', 'held', 'admin'));
  assert.equal(transitionMovesMoney(
    new Map([
      ['held->disputed', { from: 'held', to: 'disputed', actors: ['system'], movesMoney: false, description: '' }],
    ]),
    'held',
    'disputed',
  ), false);
});

test('escrow financial exits are explicit', () => {
  assert.doesNotThrow(() => assertEscrowTransition('held', 'released', 'financial_workflow'));
  assert.doesNotThrow(() => assertEscrowTransition('held', 'refunded', 'financial_workflow'));
  assert.doesNotThrow(() => assertEscrowTransition('disputed', 'released', 'system'));
  assert.doesNotThrow(() => assertEscrowTransition('disputed', 'refunded', 'system'));
  assert.throws(() => assertEscrowTransition('released', 'refunded', 'financial_workflow'), /Illegal state transition/);
});

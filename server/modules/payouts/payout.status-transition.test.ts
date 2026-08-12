import test from 'node:test';
import assert from 'node:assert/strict';
import { getAllowedPayoutTransitions } from './payout.transitions.js';
import { assertPayoutStatusTransition } from './payout.transitions.js';

test('payout transition policy allows the normal lifecycle', () => {
  assert.doesNotThrow(() => assertPayoutStatusTransition('eligible', 'pending_settlement'));
  assert.doesNotThrow(() => assertPayoutStatusTransition('pending_settlement', 'ready_for_payout'));
  assert.doesNotThrow(() => assertPayoutStatusTransition('ready_for_payout', 'queued'));
  assert.doesNotThrow(() => assertPayoutStatusTransition('queued', 'processing'));
  assert.doesNotThrow(() => assertPayoutStatusTransition('processing', 'paid'));
});

test('payout transition policy allows retry recovery', () => {
  assert.doesNotThrow(() => assertPayoutStatusTransition('processing', 'failed'));
  assert.doesNotThrow(() => assertPayoutStatusTransition('failed', 'processing'));
});

test('payout transition policy blocks terminal-state resurrection', () => {
  assert.throws(() => assertPayoutStatusTransition('paid', 'processing'), /Illegal payout status transition/i);
  assert.throws(() => assertPayoutStatusTransition('cancelled', 'pending'), /Illegal payout status transition/i);
});

test('payout transition policy blocks repeated processing', () => {
  assert.throws(() => assertPayoutStatusTransition('processing', 'processing'), /already processing/i);
});

test('terminal payout states expose no outgoing transitions', () => {
  assert.deepEqual(getAllowedPayoutTransitions('paid'), []);
  assert.deepEqual(getAllowedPayoutTransitions('cancelled'), []);
});

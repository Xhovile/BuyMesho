import assert from 'node:assert/strict';
import test from 'node:test';
import { assertTicketStatusTransition } from '../validator.projection.routes.js';

test('ticket state: normal entry and re-entry transitions are allowed', () => {
  assert.doesNotThrow(() => assertTicketStatusTransition('Waiting Entry', 'Inside'));
  assert.doesNotThrow(() => assertTicketStatusTransition('Inside', 'Outside'));
  assert.doesNotThrow(() => assertTicketStatusTransition('Outside', 'Inside'));
  assert.doesNotThrow(() => assertTicketStatusTransition('Waiting Entry', 'Cancelled'));
  assert.doesNotThrow(() => assertTicketStatusTransition('Inside', 'Refunded'));
});

test('ticket state: terminal states cannot be resurrected', () => {
  assert.throws(() => assertTicketStatusTransition('Cancelled', 'Inside'), /Illegal ticket state transition/);
  assert.throws(() => assertTicketStatusTransition('Refunded', 'Waiting Entry'), /Illegal ticket state transition/);
  assert.throws(() => assertTicketStatusTransition('Blocked', 'Outside'), /Illegal ticket state transition/);
  assert.throws(() => assertTicketStatusTransition('Duplicate Scan Attempt', 'Inside'), /Illegal ticket state transition/);
});

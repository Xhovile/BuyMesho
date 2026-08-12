import assert from 'node:assert/strict';
import test from 'node:test';
import { getPaymentDb } from '../../../postgresCompat.js';
import { escrowRepository } from '../escrow.repository.js';

function cleanup(orderId: string): void {
  getPaymentDb().prepare('DELETE FROM escrows WHERE order_id = ?').run(orderId);
}

test('escrow state machine allows funded -> released', () => {
  const orderId = 'escrow-state-released-1';
  cleanup(orderId);
  try {
    escrowRepository.create(orderId, 'MWK', 1000);
    assert.equal(escrowRepository.updateState(orderId, 'held')?.state, 'held');
    assert.equal(escrowRepository.updateState(orderId, 'released')?.state, 'released');
  } finally {
    cleanup(orderId);
  }
});

test('escrow state machine allows funded -> refunded', () => {
  const orderId = 'escrow-state-refunded-1';
  cleanup(orderId);
  try {
    escrowRepository.create(orderId, 'MWK', 1000);
    assert.equal(escrowRepository.updateState(orderId, 'refunded')?.state, 'refunded');
  } finally {
    cleanup(orderId);
  }
});

test('escrow state machine blocks refunded -> funded', () => {
  const orderId = 'escrow-state-terminal-1';
  cleanup(orderId);
  try {
    escrowRepository.create(orderId, 'MWK', 1000);
    escrowRepository.updateState(orderId, 'refunded');
    assert.throws(
      () => escrowRepository.updateState(orderId, 'funded'),
      /Illegal escrow state transition: refunded -> funded/,
    );
    assert.equal(escrowRepository.findByOrderId(orderId)?.state, 'refunded');
  } finally {
    cleanup(orderId);
  }
});

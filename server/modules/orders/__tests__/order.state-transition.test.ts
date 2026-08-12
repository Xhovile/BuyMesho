import assert from 'node:assert/strict';
import test from 'node:test';
import { getPaymentDb } from '../../../postgresCompat.js';
import { serverOrderService } from '../order.service.js';
import { orderRepository } from '../order.repository.js';

function seedOrder(id: string): void {
  const now = new Date().toISOString();
  orderRepository.save({
    id,
    buyerId: 'state-test-buyer',
    sellerId: 'state-test-seller',
    source: 'listing',
    status: 'pending_payment',
    currency: 'MWK',
    subtotal: { amount: 1000, currency: 'MWK' },
    total: { amount: 1000, currency: 'MWK' },
    items: [],
    createdAt: now,
    updatedAt: now,
    paymentReference: `${id}-ref`,
  });
}

function cleanup(id: string): void {
  getPaymentDb().prepare('DELETE FROM orders WHERE id = ?').run(id);
}

test('order state machine allows the normal payment-to-escrow path', () => {
  const id = 'state-transition-normal-1';
  cleanup(id);
  seedOrder(id);
  try {
    assert.equal(serverOrderService.setStatus(id, 'paid')?.status, 'paid');
    assert.equal(serverOrderService.setStatus(id, 'in_escrow')?.status, 'in_escrow');
    assert.equal(serverOrderService.setStatus(id, 'fulfilled')?.status, 'fulfilled');
  } finally {
    cleanup(id);
  }
});

test('order state machine blocks backward transitions', () => {
  const id = 'state-transition-backward-1';
  cleanup(id);
  seedOrder(id);
  try {
    serverOrderService.setStatus(id, 'paid');
    serverOrderService.setStatus(id, 'in_escrow');
    assert.throws(
      () => serverOrderService.setStatus(id, 'pending_payment'),
      /Illegal order state transition: in_escrow -> pending_payment/,
    );
    assert.equal(orderRepository.findById(id)?.status, 'in_escrow');
  } finally {
    cleanup(id);
  }
});

test('order state machine blocks transitions out of refunded', () => {
  const id = 'state-transition-refunded-1';
  cleanup(id);
  seedOrder(id);
  try {
    serverOrderService.setStatus(id, 'paid');
    serverOrderService.setStatus(id, 'refunded');
    assert.throws(
      () => serverOrderService.setStatus(id, 'paid'),
      /Illegal order state transition: refunded -> paid/,
    );
    assert.equal(orderRepository.findById(id)?.status, 'refunded');
  } finally {
    cleanup(id);
  }
});

test('order state machine blocks transitions out of closed', () => {
  const id = 'state-transition-closed-1';
  cleanup(id);
  seedOrder(id);
  try {
    serverOrderService.setStatus(id, 'paid');
    serverOrderService.setStatus(id, 'fulfilled');
    serverOrderService.setStatus(id, 'closed');
    assert.throws(
      () => serverOrderService.setStatus(id, 'refunded'),
      /Illegal order state transition: closed -> refunded/,
    );
    assert.equal(orderRepository.findById(id)?.status, 'closed');
  } finally {
    cleanup(id);
  }
});

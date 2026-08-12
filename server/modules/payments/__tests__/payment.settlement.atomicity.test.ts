import assert from 'node:assert/strict';
import test from 'node:test';
import { applyVerifiedPayChanguPayment } from '../paychangu.flow.js';
import { paymentRepository } from '../payment.repository.js';
import { serverOrderService } from '../../orders/order.service.js';
import { orderRepository } from '../../orders/order.repository.js';
import { escrowRepository } from '../../escrow/escrow.repository.js';
import { getPaymentDb } from '../../../postgresCompat.js';

const orderId = 'atomic-settlement-order-1';
const paymentReference = 'atomic-settlement-ref-1';

function seedState(): void {
  const db = getPaymentDb();
  db.prepare('DELETE FROM payouts WHERE order_id = ?').run(orderId);
  db.prepare('DELETE FROM escrows WHERE order_id = ?').run(orderId);
  db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
  db.prepare('DELETE FROM payments WHERE reference = ?').run(paymentReference);

  const now = new Date().toISOString();
  serverOrderService.create({
    id: orderId,
    buyerId: 'atomic-buyer-1',
    sellerId: 'atomic-seller-1',
    source: 'listing',
    status: 'pending_payment',
    currency: 'MWK',
    subtotal: { amount: 1000, currency: 'MWK' },
    total: { amount: 1000, currency: 'MWK' },
    items: [
      {
        listingId: 'atomic-listing-1',
        title: 'Atomic Test Item',
        quantity: 1,
        unitPrice: { amount: 1000, currency: 'MWK' },
      },
    ],
    createdAt: now,
    updatedAt: now,
    paymentProvider: 'paychangu',
    paymentReference,
    settlementRoute: 'escrow',
  });

  paymentRepository.save({
    id: 'atomic-payment-1',
    orderId,
    provider: 'paychangu',
    method: 'mobile_money',
    status: 'pending',
    amount: { amount: 1000, currency: 'MWK' },
    reference: paymentReference,
    providerReference: null,
    checkoutUrl: null,
    paidAt: null,
    rawResponse: {},
    verified: false,
    createdAt: now,
    updatedAt: now,
  });
}

function verification() {
  return {
    verified: true,
    status: 'success',
    reference: paymentReference,
    txRef: paymentReference,
    amount: { amount: 1000, currency: 'MWK' },
    currency: 'MWK',
  } as const;
}

test('verified payment settlement rolls back payment/order/escrow changes together', () => {
  seedState();

  const originalCreate = escrowRepository.create;
  (escrowRepository as unknown as { create: typeof escrowRepository.create }).create = (() => {
    throw new Error('simulated escrow failure');
  }) as typeof escrowRepository.create;

  try {
    assert.throws(
      () => applyVerifiedPayChanguPayment(verification()),
      /simulated escrow failure/,
    );

    assert.equal(paymentRepository.findByReference(paymentReference)?.status, 'pending');
    assert.equal(paymentRepository.findByReference(paymentReference)?.verified, false);
    assert.equal(orderRepository.findById(orderId)?.status, 'pending_payment');
    assert.equal(escrowRepository.findByOrderId(orderId), undefined);
  } finally {
    (escrowRepository as unknown as { create: typeof escrowRepository.create }).create = originalCreate;
    const db = getPaymentDb();
    db.prepare('DELETE FROM escrows WHERE order_id = ?').run(orderId);
    db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
    db.prepare('DELETE FROM payments WHERE reference = ?').run(paymentReference);
  }
});

test('missing order does not mark payment captured and remains recoverable', () => {
  const db = getPaymentDb();
  db.prepare('DELETE FROM payments WHERE reference = ?').run(paymentReference);

  const now = new Date().toISOString();
  paymentRepository.save({
    id: 'atomic-payment-missing-order-1',
    orderId: 'order-that-is-not-yet-visible',
    provider: 'paychangu',
    method: 'mobile_money',
    status: 'pending',
    amount: { amount: 1000, currency: 'MWK' },
    reference: paymentReference,
    providerReference: null,
    checkoutUrl: null,
    paidAt: null,
    rawResponse: {},
    verified: false,
    createdAt: now,
    updatedAt: now,
  });

  try {
    const result = applyVerifiedPayChanguPayment(verification());
    assert.equal(result.order, undefined);
    assert.equal(result.payment?.status, 'pending');
    assert.equal(result.payment?.verified, false);
  } finally {
    db.prepare('DELETE FROM payments WHERE reference = ?').run(paymentReference);
  }
});

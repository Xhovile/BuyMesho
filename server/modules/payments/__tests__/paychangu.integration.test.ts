import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createHmac } from 'crypto';
import { mountPayChanguRoutes } from '../payment.routes.js';
import { serverOrderService } from '../../orders/order.service.js';
import { orderRepository } from '../../orders/order.repository.js';
import { paymentRepository } from '../payment.repository.js';
import { getPaymentDb } from '../../../sqlite.js';

const requireAuth: express.RequestHandler = (req, _res, next) => {
  (req as express.Request & { user?: unknown }).user = { uid: 'buyer_1', email: 'buyer@example.com' };
  next();
};

function mockFetch(originalFetch: typeof fetch): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const target = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (/^https:\/\/[^/]*paychangu\.com\/payment/.test(target)) {
      return new Response(JSON.stringify({
        data: {
          checkout_url: 'https://checkout.paychangu.test/session',
          tx_ref: 'txref-integration-1',
          id: 'pch_001',
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (/^https:\/\/[^/]*paychangu\.com\/verify-payment\//.test(target)) {
      return new Response(JSON.stringify({
        data: {
          tx_ref: 'txref-integration-1',
          status: 'successful',
          amount: 1000,
          currency: 'MWK',
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return originalFetch(input, init);
  }) as typeof fetch;
}

test('integration: atomic checkout → paychangu payment → webhook persists state', async () => {
  orderRepository.clear();
  paymentRepository.clear();

  // Seed a test listing so the /checkout endpoint can find it
  const db = getPaymentDb();
  db.prepare('DELETE FROM listings WHERE id = 999').run();
  db.prepare(
    `INSERT OR IGNORE INTO listings (id, seller_uid, name, price, status, quantity, sold_quantity)
     VALUES (999, 'seller_1', 'Test Item', 1000, 'available', 5, 0)`,
  ).run();

  const app = express();
  app.use('/api/payments/paychangu/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  mountPayChanguRoutes(app, requireAuth);

  const originalFetch = global.fetch;
  global.fetch = mockFetch(originalFetch);
  process.env.PAYCHANGU_WEBHOOK_SECRET = 'integration-secret';

  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    // Step 1: Atomic checkout — listing + quantity + buyer context → order + payment in one shot
    const checkoutRes = await fetch(`${base}/api/payments/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({
        listingId: 999,
        quantity: 1,
        method: 'mobile_money',
        returnUrl: 'https://example.com/return',
        cancelUrl: 'https://example.com/cancel',
        buyerName: 'Buyer One',
      }),
    });

    assert.equal(checkoutRes.status, 201, 'checkout should return 201');
    const checkoutResult = await checkoutRes.json() as {
      orderId?: string;
      reference?: string;
      checkoutUrl?: string;
    };
    assert.ok(checkoutResult.orderId, 'checkout should return orderId');
    assert.ok(checkoutResult.reference, 'checkout should return a payment reference');
    assert.ok(checkoutResult.checkoutUrl, 'checkout should return checkoutUrl');

    // Step 2: Verify payment (as the return page would)
    const verifyRes = await fetch(
      `${base}/api/payments/paychangu/verify/${encodeURIComponent('txref-integration-1')}`,
      { headers: { authorization: 'Bearer test' } },
    );
    assert.equal(verifyRes.status, 200, 'verify should return 200');
    const verifyResult = await verifyRes.json() as { verified?: boolean };
    assert.ok(verifyResult.verified, 'verify should return verified=true');

    // Step 3: Webhook marks order as paid
    const rawWebhook = JSON.stringify({
      event_type: 'api.charge.payment', tx_ref: checkoutResult.reference,
      data: { tx_ref: checkoutResult.reference, status: 'paid', amount: 1000, currency: 'MWK' },
    });
    const signature = createHmac('sha256', 'integration-secret').update(rawWebhook).digest('hex');

    const webhookRes = await fetch(`${base}/api/payments/paychangu/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-paychangu-signature': signature },
      body: rawWebhook,
    });
    assert.equal(webhookRes.status, 200, 'webhook should return 200');

    const duplicateWebhookRes = await fetch(`${base}/api/payments/paychangu/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-paychangu-signature': signature },
      body: rawWebhook,
    });
    assert.equal(duplicateWebhookRes.status, 200, 'duplicate webhook should also return 200');

    // Step 4: Assert final state
    const savedOrder = orderRepository.findById(checkoutResult.orderId!);
    const savedPayment = paymentRepository.findByReference(checkoutResult.reference!);

    assert.equal(savedOrder?.status, 'in_escrow', 'order should be in escrow after successful payment');
    assert.equal(savedPayment?.verified, true, 'payment should be verified');
    assert.equal(savedPayment?.status, 'captured', 'payment status should be captured');
  } finally {
    global.fetch = originalFetch;
    server.close();
    orderRepository.clear();
    paymentRepository.clear();
    db.prepare('DELETE FROM listings WHERE id = 999').run();
  }
});

test('integration: order -> paychangu payment -> verified webhook persists state', async () => {
  orderRepository.clear();
  paymentRepository.clear();

  const app = express();
  app.use('/api/payments/paychangu/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  mountPayChanguRoutes(app, requireAuth);

  const originalFetch = global.fetch;
  global.fetch = mockFetch(originalFetch);
  process.env.PAYCHANGU_WEBHOOK_SECRET = 'integration-secret';

  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    const now = new Date().toISOString();
    serverOrderService.create({
      id: 'order_it_1', buyerId: 'buyer_1', sellerId: 'seller_1', source: 'listing', status: 'draft',
      currency: 'MWK', subtotal: { amount: 1000, currency: 'MWK' }, total: { amount: 1000, currency: 'MWK' },
      items: [{ listingId: 'listing_1', title: 'Item', quantity: 1, unitPrice: { amount: 1000, currency: 'MWK' } }],
      createdAt: now, updatedAt: now, paymentReference: 'txref-integration-1', escrowId: 'escrow_1',
    });

    // Step 1: Initialize payment
    const createPaymentRes = await fetch(`${base}/api/payments/paychangu/initialize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer fake' },
      body: JSON.stringify({
        orderId: 'order_it_1', provider: 'paychangu', method: 'mobile_money',
        amount: { amount: 1000, currency: 'MWK' },
        customer: { id: 'buyer_1', name: 'Buyer One', email: 'buyer@example.com', phoneNumber: '+265999111000' },
        returnUrl: 'https://example.com/return', cancelUrl: 'https://example.com/cancel',
      }),
    });

    assert.equal(createPaymentRes.status, 201, 'initialize should return 201');
    const paymentResult = await createPaymentRes.json() as { reference?: string };
    assert.ok(paymentResult.reference, 'initialize should return a reference');

    // Step 2: Verify payment
    const verifyRes = await fetch(
      `${base}/api/payments/paychangu/verify/${encodeURIComponent('txref-integration-1')}`,
      { headers: { authorization: 'Bearer fake' } },
    );
    assert.equal(verifyRes.status, 200, 'verify should return 200');
    const verifyResult = await verifyRes.json() as { verified?: boolean };
    assert.ok(verifyResult.verified, 'verify should return verified=true');

    // Step 3: Webhook marks order as paid
    const rawWebhook = JSON.stringify({
      event_type: 'charge.success', tx_ref: 'txref-integration-1',
      data: { tx_ref: 'txref-integration-1', status: 'successful', amount: 1000, currency: 'MWK' },
    });
    const signature = createHmac('sha256', 'integration-secret').update(rawWebhook).digest('hex');

    const webhookRes = await fetch(`${base}/api/payments/paychangu/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-paychangu-signature': signature },
      body: rawWebhook,
    });

    assert.equal(webhookRes.status, 200, 'webhook should return 200');

    // Step 4: Verify final state
    const savedOrder = orderRepository.findById('order_it_1');
    const savedPayment = paymentRepository.findByReference('txref-integration-1');

    assert.equal(savedOrder?.status, 'in_escrow', 'order should be in escrow after successful payment');
    assert.equal(savedPayment?.verified, true, 'payment should be verified');
    assert.equal(savedPayment?.status, 'captured', 'payment status should be captured');
  } finally {
    global.fetch = originalFetch;
    server.close();
    orderRepository.clear();
    paymentRepository.clear();
  }
});


test('integration: pending webhook updates payment only and does not create escrow transition', async () => {
  orderRepository.clear();
  paymentRepository.clear();
  const app = express();
  app.use('/api/payments/paychangu/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  mountPayChanguRoutes(app, requireAuth);
  const originalFetch = global.fetch;
  global.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const target = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (/^https:\/\/[^/]*paychangu\.com\/payment/.test(target)) {
      return new Response(JSON.stringify({
        data: {
          checkout_url: 'https://checkout.paychangu.test/session',
          tx_ref: 'txref-pending-1',
          id: 'pch_001',
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (/^https:\/\/[^/]*paychangu\.com\/verify-payment\/txref-pending-1/.test(target)) {
      return new Response(JSON.stringify({
        data: {
          tx_ref: 'txref-pending-1',
          status: 'processing',
          amount: 1000,
          currency: 'MWK',
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return mockFetch(originalFetch)(input, init);
  }) as typeof fetch;
  process.env.PAYCHANGU_WEBHOOK_SECRET = 'integration-secret';
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;
  try {
    const now = new Date().toISOString();
    serverOrderService.create({ id: 'order_pending_1', buyerId: 'buyer_1', sellerId: 'seller_1', source: 'listing', status: 'pending_payment', currency: 'MWK', subtotal: { amount: 1000, currency: 'MWK' }, total: { amount: 1000, currency: 'MWK' }, items: [{ listingId: 'listing_1', title: 'Item', quantity: 1, unitPrice: { amount: 1000, currency: 'MWK' } }], createdAt: now, updatedAt: now, paymentReference: 'txref-pending-1', escrowId: 'escrow_1' });
    await fetch(`${base}/api/payments/paychangu/initialize`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer fake' }, body: JSON.stringify({ orderId: 'order_pending_1', provider: 'paychangu', method: 'mobile_money', amount: { amount: 1000, currency: 'MWK' }, customer: { id: 'buyer_1', name: 'Buyer One', email: 'buyer@example.com' }, returnUrl: 'https://example.com/return', cancelUrl: 'https://example.com/cancel' }) });
    const rawWebhook = JSON.stringify({ event_type: 'api.charge.payment', tx_ref: 'txref-pending-1', data: { tx_ref: 'txref-pending-1', status: 'processing', amount: 1000, currency: 'MWK' } });
    const signature = createHmac('sha256', 'integration-secret').update(rawWebhook).digest('hex');
    const webhookRes = await fetch(`${base}/api/payments/paychangu/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-paychangu-signature': signature }, body: rawWebhook });
    assert.equal(webhookRes.status, 200);
    assert.equal(orderRepository.findById('order_pending_1')?.status, 'pending_payment');
    assert.equal(paymentRepository.findByReference('txref-pending-1')?.status, 'pending');
  } finally { global.fetch = originalFetch; server.close(); orderRepository.clear(); paymentRepository.clear(); }
});

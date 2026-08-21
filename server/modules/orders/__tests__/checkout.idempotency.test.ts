import test from 'node:test';
import assert from 'node:assert/strict';
import express, { type RequestHandler } from 'express';
import { createPaymentRouter } from '../../payments/payment.routes.js';
import { getPaymentDb } from '../../../postgresCompat.js';
import { orderRepository } from '../order.repository.js';
import { paymentRepository } from '../../payments/payment.repository.js';

const originalFetch = global.fetch;

const requireAuth: RequestHandler = (req, _res, next) => {
  (req as express.Request & { user?: unknown }).user = {
    uid: 'buyer_idempotency_1',
    email: 'buyer@example.com',
  };
  next();
};

function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/payments', createPaymentRouter(requireAuth));
  return app;
}

function clearState() {
  const db = getPaymentDb();
  db.prepare('DELETE FROM payment_webhook_events').run();
  db.prepare('DELETE FROM payments').run();
  db.prepare('DELETE FROM orders').run();
  db.prepare('DELETE FROM listings').run();
}

function seedListing(): number {
  const result = getPaymentDb().prepare(`
    INSERT INTO listings (seller_uid, name, price, status, quantity, sold_quantity, is_hidden)
    VALUES (?, ?, ?, 'available', 5, 0, 0)
  `).run('seller_idempotency_1', 'Idempotency Test Item', 1000);
  return Number(result.lastInsertRowid);
}

function mockPayChangu() {
  global.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const target = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (/^https:\/\/api\.paychangu\.com\/payment$/.test(target)) {
      const payload = JSON.parse(String(init?.body ?? '{}')) as { tx_ref?: string };
      return new Response(JSON.stringify({
        status: 'success',
        message: 'Hosted payment session generated successfully.',
        data: {
          checkout_url: 'https://checkout.paychangu.test/session',
          data: {
            tx_ref: payload.tx_ref,
            status: 'pending',
          },
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    return originalFetch(input, init);
  }) as typeof fetch;
}

async function postCheckout(base: string, key: string, payload: Record<string, unknown>): Promise<Response> {
  return fetch(`${base}/api/payments/checkout`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': key,
    },
    body: JSON.stringify(payload),
  });
}

test('checkout idempotency: replay returns the same order and payment instead of creating another checkout', async () => {
  clearState();
  const listingId = seedListing();
  mockPayChangu();

  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;
  const payload = {
    listingId,
    quantity: 1,
    method: 'mobile_money',
    settlementRoute: 'escrow',
    returnUrl: 'https://example.com/payment/return',
    cancelUrl: 'https://example.com/payment/return?cancelled=1',
  };

  try {
    const first = await postCheckout(base, 'checkout-idem-001', payload);
    assert.equal(first.status, 201);
    const firstBody = await first.json() as { orderId: string; paymentId?: string; reference?: string };

    const replay = await postCheckout(base, 'checkout-idem-001', payload);
    assert.equal(replay.status, 200);
    const replayBody = await replay.json() as { idempotentReplay?: boolean; orderId: string; paymentId?: string; reference?: string };

    assert.equal(replayBody.idempotentReplay, true);
    assert.equal(replayBody.orderId, firstBody.orderId);
    assert.equal(replayBody.paymentId, firstBody.paymentId);
    assert.equal(replayBody.reference, firstBody.reference);

    const orderCount = (getPaymentDb().prepare('SELECT COUNT(*) AS count FROM orders').get() as { count: number }).count;
    const paymentCount = (getPaymentDb().prepare('SELECT COUNT(*) AS count FROM payments').get() as { count: number }).count;
    assert.equal(orderCount, 1);
    assert.equal(paymentCount, 1);
    assert.equal(orderRepository.findById(firstBody.orderId)?.checkoutIdempotencyKey, 'checkout-idem-001');
    assert.ok(paymentRepository.findByReference(firstBody.reference ?? ''));
  } finally {
    server.close();
    clearState();
    global.fetch = originalFetch;
  }
});

test('checkout idempotency: reusing a key for different checkout parameters is rejected', async () => {
  clearState();
  const listingId = seedListing();
  mockPayChangu();

  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    const first = await postCheckout(base, 'checkout-idem-002', {
      listingId,
      quantity: 1,
      method: 'mobile_money',
      settlementRoute: 'escrow',
      returnUrl: 'https://example.com/payment/return',
      cancelUrl: 'https://example.com/payment/return?cancelled=1',
    });
    assert.equal(first.status, 201);

    const conflicting = await postCheckout(base, 'checkout-idem-002', {
      listingId,
      quantity: 2,
      method: 'mobile_money',
      settlementRoute: 'escrow',
      returnUrl: 'https://example.com/payment/return',
      cancelUrl: 'https://example.com/payment/return?cancelled=1',
    });
    assert.equal(conflicting.status, 409);
    const body = await conflicting.json() as { code?: string };
    assert.equal(body.code, 'IDEMPOTENCY_KEY_REUSED');

    const orderCount = (getPaymentDb().prepare('SELECT COUNT(*) AS count FROM orders').get() as { count: number }).count;
    const paymentCount = (getPaymentDb().prepare('SELECT COUNT(*) AS count FROM payments').get() as { count: number }).count;
    assert.equal(orderCount, 1);
    assert.equal(paymentCount, 1);
  } finally {
    server.close();
    clearState();
    global.fetch = originalFetch;
  }
});

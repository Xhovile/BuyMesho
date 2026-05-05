import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createHmac } from 'crypto';
import { mountPayChanguRoutes } from '../payment.routes';
import { serverOrderService } from '../../orders/order.service';
import { orderRepository } from '../../orders/order.repository';
import { paymentRepository } from '../payment.repository';

const requireAuth: express.RequestHandler = (req, _res, next) => {
  req.user = { uid: 'buyer_1', email: 'buyer@example.com' };
  next();
};

test('integration: order -> paychangu payment -> verified webhook persists state', async () => {
  orderRepository.clear();
  paymentRepository.clear();

  const app = express();
  app.use(express.json());
  mountPayChanguRoutes(app, requireAuth);

  const originalFetch = global.fetch;
  global.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const target = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (target.startsWith('https://api.paychangu.com/payment')) {
      return new Response(JSON.stringify({
        data: {
          checkout_url: 'https://checkout.paychangu.test/session',
          tx_ref: 'txref-integration-1',
          id: 'pch_001',
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return originalFetch(input as RequestInfo, init);
  }) as typeof fetch;

  process.env.PAYCHANGU_WEBHOOK_SECRET = 'integration-secret';

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    const now = new Date().toISOString();
    serverOrderService.create({
      id: 'order_it_1', buyerId: 'buyer_1', sellerId: 'seller_1', source: 'listing', status: 'draft',
      currency: 'MWK', subtotal: { amount: 1000, currency: 'MWK' }, total: { amount: 1000, currency: 'MWK' },
      items: [{ listingId: 'listing_1', title: 'Item', quantity: 1, unitPrice: { amount: 1000, currency: 'MWK' } }],
      createdAt: now, updatedAt: now, paymentReference: 'txref-integration-1', escrowId: 'escrow_1',
    });

    const createPaymentRes = await fetch(`${base}/api/payments/paychangu`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer fake' },
      body: JSON.stringify({
        orderId: 'order_it_1', provider: 'paychangu', method: 'mobile_money',
        amount: { amount: 1000, currency: 'MWK' },
        customer: { id: 'buyer_1', name: 'Buyer One', email: 'buyer@example.com', phoneNumber: '+265999111000' },
        returnUrl: 'https://example.com/return', cancelUrl: 'https://example.com/cancel',
      }),
    });

    assert.equal(createPaymentRes.status, 201);

    const rawWebhook = JSON.stringify({
      event_type: 'charge.success', tx_ref: 'txref-integration-1',
    });
    const signature = createHmac('sha256', 'integration-secret').update(rawWebhook).digest('hex');

    const webhookRes = await fetch(`${base}/api/payments/paychangu/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-paychangu-signature': signature },
      body: rawWebhook,
    });

    assert.equal(webhookRes.status, 200);

    const savedOrder = orderRepository.findById('order_it_1');
    const savedPayment = paymentRepository.findByReference('txref-integration-1');

    assert.equal(savedOrder?.status, 'paid');
    assert.equal(savedPayment?.verified, true);
    assert.equal(savedPayment?.status, 'captured');
  } finally {
    global.fetch = originalFetch;
    server.close();
    orderRepository.clear();
    paymentRepository.clear();
  }
});

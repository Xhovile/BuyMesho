import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createHash, createHmac } from 'crypto';
import { mountPayChanguRoutes } from '../payment.routes.js';
import { serverOrderService } from '../../orders/order.service.js';
import { orderRepository } from '../../orders/order.repository.js';
import { paymentRepository } from '../payment.repository.js';
import { escrowRepository } from '../../escrow/escrow.repository.js';
import { getPaymentDb } from '../../../sqlite.js';

const WEBHOOK_SECRET = 'integration-secret';

type WebhookAuditRow = {
  provider: string;
  provider_event_id: string | null;
  tx_ref: string | null;
  payload_hash: string | null;
  processing_status: string;
  processed_at: string | null;
  error: string | null;
};

const requireAuth: express.RequestHandler = (req, _res, next) => {
  (req as express.Request & { user?: unknown }).user = { uid: 'buyer_1', email: 'buyer@example.com' };
  next();
};

function mockFetch(originalFetch: typeof fetch): typeof fetch {
  return mockPayChanguFetch(originalFetch, 'txref-integration-1', 'successful');
}

function mockPayChanguFetch(
  originalFetch: typeof fetch,
  reference: string,
  status: string,
  amount = 1000,
): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const target = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (/^https:\/\/[^/]*paychangu\.com\/payment/.test(target)) {
      return new Response(JSON.stringify({
        data: {
          checkout_url: 'https://checkout.paychangu.test/session',
          tx_ref: reference,
          id: `pch_${reference}`,
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (new RegExp(`^https:\\/\\/[^/]*paychangu\\.com\\/verify-payment\\/${reference}`).test(target)) {
      return new Response(JSON.stringify({
        data: {
          tx_ref: reference,
          status,
          amount,
          currency: 'MWK',
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return originalFetch(input, init);
  }) as typeof fetch;
}

function createApp(): express.Express {
  const app = express();
  app.use('/api/payments/paychangu/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  mountPayChanguRoutes(app, requireAuth);
  return app;
}

function signWebhook(rawWebhook: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(rawWebhook).digest('hex');
}

function hashPayload(rawWebhook: string): string {
  return createHash('sha256').update(rawWebhook).digest('hex');
}

function clearPaymentState(): void {
  const db = getPaymentDb();
  db.prepare('DELETE FROM escrows').run();
  db.prepare('DELETE FROM payment_webhook_events').run();
  orderRepository.clear();
  paymentRepository.clear();
}

function seedOrder(orderId: string, reference: string, status: 'pending_payment' | 'paid' | 'in_escrow' = 'pending_payment'): void {
  const now = new Date().toISOString();
  serverOrderService.create({
    id: orderId,
    buyerId: 'buyer_1',
    sellerId: 'seller_1',
    source: 'listing',
    status,
    currency: 'MWK',
    subtotal: { amount: 1000, currency: 'MWK' },
    total: { amount: 1000, currency: 'MWK' },
    items: [{ listingId: 'listing_1', title: 'Item', quantity: 1, unitPrice: { amount: 1000, currency: 'MWK' } }],
    createdAt: now,
    updatedAt: now,
    paymentProvider: 'paychangu',
    paymentReference: reference,
  });
}

async function initializePayment(base: string, orderId: string): Promise<Response> {
  return fetch(`${base}/api/payments/paychangu/initialize`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer fake' },
    body: JSON.stringify({
      orderId,
      provider: 'paychangu',
      method: 'mobile_money',
      amount: { amount: 1000, currency: 'MWK' },
      customer: { id: 'buyer_1', name: 'Buyer One', email: 'buyer@example.com', phoneNumber: '+265999111000' },
      returnUrl: 'https://example.com/return',
      cancelUrl: 'https://example.com/cancel',
    }),
  });
}

async function postPayChanguWebhook(base: string, rawWebhook: string, signature = signWebhook(rawWebhook)): Promise<Response> {
  return fetch(`${base}/api/payments/paychangu/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-paychangu-signature': signature },
    body: rawWebhook,
  });
}

function fetchWebhookAuditRows(txRef: string): WebhookAuditRow[] {
  return getPaymentDb()
    .prepare(
      `SELECT provider, provider_event_id, tx_ref, payload_hash, processing_status, processed_at, error
       FROM payment_webhook_events
       WHERE reference = ? OR tx_ref = ?
       ORDER BY id ASC`,
    )
    .all(txRef, txRef) as WebhookAuditRow[];
}

function fetchWebhookAuditRowsByPayloadHash(payloadHash: string): WebhookAuditRow[] {
  return getPaymentDb()
    .prepare(
      `SELECT provider, provider_event_id, tx_ref, payload_hash, processing_status, processed_at, error
       FROM payment_webhook_events
       WHERE payload_hash = ?
       ORDER BY id ASC`,
    )
    .all(payloadHash) as WebhookAuditRow[];
}

function countEscrowsForOrder(orderId: string): number {
  const row = getPaymentDb()
    .prepare('SELECT COUNT(*) AS count FROM escrows WHERE order_id = ?')
    .get(orderId) as { count: number };
  return row.count;
}

test('integration: atomic checkout → paychangu payment → webhook persists state and classifies duplicate delivery', async () => {
  clearPaymentState();

  // Seed a test listing so the /checkout endpoint can find it
  const db = getPaymentDb();
  db.prepare('DELETE FROM sellers WHERE uid = ?').run('seller_1');
  db.prepare('DELETE FROM listings WHERE id = 999').run();
  db.prepare(
    `INSERT OR REPLACE INTO sellers (uid, email)
     VALUES ('seller_1', 'seller@example.com')`,
  ).run();
  db.prepare(
    `INSERT OR REPLACE INTO listings (
       id, seller_uid, name, price, category, university, whatsapp_number,
       status, condition, views_count, whatsapp_clicks, is_hidden,
       quantity, sold_quantity
     ) VALUES (
       999, 'seller_1', 'Test Item', 1000, 'test', 'Test University', '+265999111000',
       'available', 'used', 0, 0, 0,
       5, 0
     )`,
  ).run();

  const app = createApp();
  const originalFetch = global.fetch;
  const originalConsoleLog = console.log;
  const notificationLogs: unknown[][] = [];
  global.fetch = mockPayChanguFetch(originalFetch, 'txref-integration-1', 'successful', 1000);
  console.log = (...args: unknown[]) => {
    if (args[0] === '[notification] order_paid') notificationLogs.push(args);
    originalConsoleLog(...args);
  };
  process.env.PAYCHANGU_WEBHOOK_SECRET = WEBHOOK_SECRET;

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
      items?: Array<{ reference?: string }>;
    };
    assert.ok(checkoutResult.orderId, 'checkout should return orderId');
    assert.ok(checkoutResult.reference, 'checkout should return a payment reference');
    assert.ok(checkoutResult.checkoutUrl, 'checkout should return checkoutUrl');
    assert.equal(checkoutResult.items?.[0]?.reference, `${checkoutResult.orderId}-ITEM-01`, 'checkout should return a per-item reference');

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
      event_type: 'api.charge.payment',
      event_id: 'evt_success_1',
      tx_ref: checkoutResult.reference,
      data: { tx_ref: checkoutResult.reference, status: 'paid', amount: 1000, currency: 'MWK' },
    });
    const signature = signWebhook(rawWebhook);

    const webhookRes = await postPayChanguWebhook(base, rawWebhook, signature);
    assert.equal(webhookRes.status, 200, 'webhook should return 200');

    const duplicateWebhookRes = await postPayChanguWebhook(base, rawWebhook, signature);
    assert.equal(duplicateWebhookRes.status, 200, 'duplicate webhook should also return 200');

    // Step 4: Assert final state and idempotency side effects
    const savedOrder = orderRepository.findById(checkoutResult.orderId!);
    const savedPayment = paymentRepository.findByReference(checkoutResult.reference!);
    const auditRows = fetchWebhookAuditRows(checkoutResult.reference!);
    const processedAuditRows = auditRows.filter((row) => row.processing_status === 'processed');
    const duplicateAuditRows = auditRows.filter((row) => row.processing_status === 'duplicate');

    assert.equal(savedOrder?.status, 'in_escrow', 'order should be in escrow after successful payment');
    assert.equal(savedOrder?.items[0]?.reference, `${checkoutResult.orderId}-ITEM-01`, 'order item reference should persist for disputes');
    assert.equal(savedPayment?.verified, true, 'payment should be verified');
    assert.equal(savedPayment?.status, 'captured', 'payment status should be captured');
    assert.equal(countEscrowsForOrder(checkoutResult.orderId!), 1, 'only one escrow should be created for the order');
    assert.equal(processedAuditRows.length, 1, 'only one successful webhook state transition should be processed');
    assert.equal(duplicateAuditRows.length, 1, 'second delivery should be recorded as duplicate');
    assert.equal(notificationLogs.length, 1, 'duplicate success delivery should not emit duplicate notifications');

    const processedAudit = processedAuditRows[0];
    const duplicateAudit = duplicateAuditRows[0];
    assert.equal(processedAudit.provider, 'paychangu', 'buyer payment webhooks should use the payment webhook handler');
    assert.equal(processedAudit.provider_event_id, 'evt_success_1', 'provider_event_id should be stored when present');
    assert.equal(processedAudit.tx_ref, checkoutResult.reference, 'tx_ref should be stored');
    assert.equal(processedAudit.payload_hash, hashPayload(rawWebhook), 'payload_hash should be stored');
    assert.equal(processedAudit.processing_status, 'processed', 'valid success webhook should be processed');
    assert.ok(processedAudit.processed_at, 'processed_at should be non-null');
    assert.equal(processedAudit.error, null, 'processed success webhook should not have an error');
    assert.equal(duplicateAudit.provider, 'paychangu', 'duplicate buyer payment webhooks should stay in the payment webhook stream');
    assert.equal(duplicateAudit.provider_event_id, 'evt_success_1', 'duplicate webhook should preserve provider_event_id');
    assert.equal(duplicateAudit.tx_ref, checkoutResult.reference, 'duplicate webhook should preserve tx_ref');
    assert.equal(duplicateAudit.payload_hash, hashPayload(rawWebhook), 'duplicate webhook should preserve payload_hash');
    assert.equal(duplicateAudit.processing_status, 'duplicate', 'duplicate webhook should be marked duplicate');
    assert.ok(duplicateAudit.processed_at, 'duplicate webhook should set processed_at');
    assert.match(duplicateAudit.error ?? '', /^Duplicate PayChangu webhook event/, 'duplicate webhook should store duplicate error');
  } finally {
    global.fetch = originalFetch;
    console.log = originalConsoleLog;
    server.close();
    clearPaymentState();
    db.prepare('DELETE FROM listings WHERE id = 999').run();
    db.prepare('DELETE FROM sellers WHERE uid = ?').run('seller_1');
  }
});

test('integration: order -> paychangu payment -> verified webhook persists state', async () => {
  clearPaymentState();

  const app = createApp();
  const originalFetch = global.fetch;
  global.fetch = mockFetch(originalFetch);
  process.env.PAYCHANGU_WEBHOOK_SECRET = WEBHOOK_SECRET;

  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    seedOrder('order_it_1', 'txref-integration-1');

    const createPaymentRes = await initializePayment(base, 'order_it_1');
    assert.equal(createPaymentRes.status, 201, 'initialize should return 201');
    const paymentResult = await createPaymentRes.json() as { reference?: string };
    assert.ok(paymentResult.reference, 'initialize should return a reference');

    const rawWebhook = JSON.stringify({
      event_type: 'charge.success', tx_ref: 'txref-integration-1',
      data: { tx_ref: 'txref-integration-1', status: 'successful', amount: 1000, currency: 'MWK' },
    });
    const webhookRes = await postPayChanguWebhook(base, rawWebhook);

    assert.equal(webhookRes.status, 200, 'webhook should return 200');

    const savedOrder = orderRepository.findById('order_it_1');
    const savedPayment = paymentRepository.findByReference('txref-integration-1');

    assert.equal(savedOrder?.status, 'in_escrow', 'order should be in escrow after successful payment');
    assert.equal(savedPayment?.verified, true, 'payment should be verified');
    assert.equal(savedPayment?.status, 'captured', 'payment status should be captured');
    assert.equal(countEscrowsForOrder('order_it_1'), 1, 'successful webhook should call the escrow path');
  } finally {
    global.fetch = originalFetch;
    server.close();
    clearPaymentState();
  }
});

test('integration: PayChangu-prefixed references activate escrow after verification', async () => {
  clearPaymentState();

  const prefixedReference = 'PAYCHANGU-ord_prefixed_1-1778797822347';
  const app = createApp();
  const originalFetch = global.fetch;
  global.fetch = mockPayChanguFetch(originalFetch, prefixedReference, 'successful');
  process.env.PAYCHANGU_WEBHOOK_SECRET = WEBHOOK_SECRET;

  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    seedOrder('order_prefixed_1', prefixedReference);

    const createPaymentRes = await initializePayment(base, 'order_prefixed_1');
    assert.equal(createPaymentRes.status, 201, 'initialize should return 201');
    const paymentResult = await createPaymentRes.json() as { reference?: string };
    assert.equal(paymentResult.reference, prefixedReference, 'initialize should keep the full PayChangu tx_ref');

    const verifyRes = await fetch(
      `${base}/api/payments/paychangu/verify/${encodeURIComponent(prefixedReference)}`,
      { headers: { authorization: 'Bearer test' } },
    );

    assert.equal(verifyRes.status, 200, 'verify should return 200');
    const verifyResult = await verifyRes.json() as { verified?: boolean };
    assert.equal(verifyResult.verified, true, 'verify should return verified=true');

    const savedOrder = orderRepository.findById('order_prefixed_1');
    const savedPayment = paymentRepository.findByReference(prefixedReference);

    assert.equal(savedOrder?.status, 'in_escrow', 'prefixed PayChangu reference should move the order into escrow');
    assert.equal(savedPayment?.verified, true, 'prefixed PayChangu reference should mark payment verified');
    assert.equal(savedPayment?.status, 'captured', 'prefixed PayChangu reference should mark payment captured');
    assert.equal(countEscrowsForOrder('order_prefixed_1'), 1, 'prefixed PayChangu reference should create escrow');
  } finally {
    global.fetch = originalFetch;
    server.close();
    clearPaymentState();
  }
});

test('integration: invalid paychangu webhook signature is audited as rejected', async () => {
  clearPaymentState();

  const app = createApp();
  process.env.PAYCHANGU_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    const rawWebhook = JSON.stringify({
      event_type: 'api.charge.payment',
      event_id: 'evt_bad_sig_1',
      tx_ref: 'txref-invalid-signature-1',
      data: { tx_ref: 'txref-invalid-signature-1', status: 'paid', amount: 1000, currency: 'MWK' },
    });

    const webhookRes = await postPayChanguWebhook(base, rawWebhook, 'not-a-valid-signature');
    assert.equal(webhookRes.status, 400, 'invalid signature webhook should be rejected by the route');

    const auditRows = fetchWebhookAuditRows('txref-invalid-signature-1');
    assert.equal(auditRows.length, 1, 'invalid signature should still create an audit row');
    assert.equal(auditRows[0].processing_status, 'rejected', 'webhook audit should end rejected');
    assert.match(auditRows[0].error ?? '', /Invalid PayChangu webhook signature/, 'audit error should contain concise signature failure message');
  } finally {
    server.close();
    clearPaymentState();
  }
});

test('integration: malformed paychangu webhook JSON is audited as failed', async () => {
  clearPaymentState();

  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    // Incomplete JSON: missing closing brace.
    const rawWebhook = '{"event_type":"api.charge.payment","tx_ref":"txref-malformed-1",';
    const webhookRes = await postPayChanguWebhook(base, rawWebhook);

    assert.equal(webhookRes.status, 400, 'malformed webhook should be rejected by the route');

    const auditRows = fetchWebhookAuditRowsByPayloadHash(hashPayload(rawWebhook));
    assert.equal(auditRows.length, 1, 'malformed webhook should still create one audit row');
    assert.equal(auditRows[0].provider_event_id, null, 'malformed webhook audit should not include provider_event_id');
    assert.equal(auditRows[0].tx_ref, null, 'malformed webhook audit should not include tx_ref');
    assert.equal(auditRows[0].payload_hash, hashPayload(rawWebhook), 'malformed webhook audit should store payload hash');
    assert.equal(auditRows[0].processing_status, 'failed', 'malformed webhook audit should end failed');
    assert.ok(auditRows[0].processed_at, 'malformed webhook audit should set processed_at');
    assert.equal(auditRows[0].error, 'Malformed webhook payload: invalid JSON', 'malformed webhook audit should store parse error');
  } finally {
    server.close();
    clearPaymentState();
  }
});

test('integration: pending webhook keeps payment and order pending without escrow', async () => {
  clearPaymentState();

  const app = createApp();
  const originalFetch = global.fetch;
  global.fetch = mockPayChanguFetch(originalFetch, 'txref-pending-1', 'queued');
  process.env.PAYCHANGU_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    seedOrder('order_pending_1', 'txref-pending-1');
    const createPaymentRes = await initializePayment(base, 'order_pending_1');
    assert.equal(createPaymentRes.status, 201, 'initialize should return 201');

    const rawWebhook = JSON.stringify({
      event_type: 'api.charge.payment',
      tx_ref: 'txref-pending-1',
      data: { tx_ref: 'txref-pending-1', status: 'queued', amount: 1000, currency: 'MWK' },
    });
    const webhookRes = await postPayChanguWebhook(base, rawWebhook);

    assert.equal(webhookRes.status, 200, 'pending webhook should return 200');
    assert.equal(paymentRepository.findByReference('txref-pending-1')?.status, 'pending', 'payment should remain pending');
    assert.equal(orderRepository.findById('order_pending_1')?.status, 'pending_payment', 'order should remain pending_payment');
    assert.equal(countEscrowsForOrder('order_pending_1'), 0, 'pending webhook should not create escrow');
  } finally {
    global.fetch = originalFetch;
    server.close();
    clearPaymentState();
  }
});

test('integration: failed webhook fails payment without paying order or creating escrow', async () => {
  clearPaymentState();

  const app = createApp();
  const originalFetch = global.fetch;
  global.fetch = mockPayChanguFetch(originalFetch, 'txref-failed-1', 'failed');
  process.env.PAYCHANGU_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    seedOrder('order_failed_1', 'txref-failed-1');
    const createPaymentRes = await initializePayment(base, 'order_failed_1');
    assert.equal(createPaymentRes.status, 201, 'initialize should return 201');

    const rawWebhook = JSON.stringify({
      event_type: 'api.charge.payment',
      tx_ref: 'txref-failed-1',
      data: { tx_ref: 'txref-failed-1', status: 'failed', amount: 1000, currency: 'MWK' },
    });
    const webhookRes = await postPayChanguWebhook(base, rawWebhook);

    assert.equal(webhookRes.status, 200, 'failed webhook should return 200');
    assert.equal(paymentRepository.findByReference('txref-failed-1')?.status, 'failed', 'payment status should become failed');
    assert.equal(orderRepository.findById('order_failed_1')?.status, 'pending_payment', 'failed payment should leave order unpaid');
    assert.equal(countEscrowsForOrder('order_failed_1'), 0, 'failed webhook should not create escrow');
  } finally {
    global.fetch = originalFetch;
    server.close();
    clearPaymentState();
  }
});

test('integration: reversed webhook refunds captured escrow according to domain policy', async () => {
  clearPaymentState();

  const app = createApp();
  const originalFetch = global.fetch;
  global.fetch = mockPayChanguFetch(originalFetch, 'txref-reversed-1', 'reversed');
  process.env.PAYCHANGU_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    seedOrder('order_reversed_1', 'txref-reversed-1', 'in_escrow');
    const createPaymentRes = await initializePayment(base, 'order_reversed_1');
    assert.equal(createPaymentRes.status, 201, 'initialize should return 201');
    escrowRepository.create('order_reversed_1', 'MWK', 1000);

    const rawWebhook = JSON.stringify({
      event_type: 'api.charge.payment',
      tx_ref: 'txref-reversed-1',
      data: { tx_ref: 'txref-reversed-1', status: 'reversed', amount: 1000, currency: 'MWK' },
    });
    const webhookRes = await postPayChanguWebhook(base, rawWebhook);

    assert.equal(webhookRes.status, 200, 'reversed webhook should return 200');
    assert.equal(paymentRepository.findByReference('txref-reversed-1')?.status, 'refunded', 'payment status should reflect reversal/refund');
    assert.equal(orderRepository.findById('order_reversed_1')?.status, 'refunded', 'reversed captured payment should refund the order');
    assert.equal(escrowRepository.findByOrderId('order_reversed_1')?.state, 'refunded', 'reversed captured payment should refund escrow');
    assert.equal(countEscrowsForOrder('order_reversed_1'), 1, 'reversal should update existing escrow, not create another escrow');
  } finally {
    global.fetch = originalFetch;
    server.close();
    clearPaymentState();
  }
});

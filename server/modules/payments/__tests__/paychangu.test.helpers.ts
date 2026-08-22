import assert from 'node:assert/strict';
import { createHash, createHmac } from 'crypto';
import express from 'express';
import { mountPayChanguRoutes } from '../payment.routes.js';
import { serverPaymentService } from '../payment.service.js';
import { paymentWebhookHandler } from '../payment.webhooks.js';
import { payoutWebhookHandler } from '../../payouts/payout.webhooks.js';
import { serverOrderService } from '../../orders/order.service.js';
import { orderRepository } from '../../orders/order.repository.js';
import { paymentRepository } from '../payment.repository.js';
import { escrowRepository } from '../../escrow/escrow.repository.js';
import { getPaymentDb } from '../../../postgresCompat.js';

export const WEBHOOK_SECRET = 'integration-secret';

export type ConnectPayoutRow = {
  id: string;
  seller_id: string;
  order_id: string;
  escrow_id: string | null;
  destination_account_id: string | null;
  amount: number;
  gross_amount: number;
  platform_fee_amount: number;
  processing_fee_amount: number;
  reserve_amount: number;
  payout_fee_amount: number;
  seller_receives_amount: number;
  net_amount: number;
  formula_snapshot: string | null;
  status: string;
};

export type WebhookAuditRow = {
  provider: string;
  provider_event_id: string | null;
  tx_ref: string | null;
  payload_hash: string | null;
  processing_status: string;
  processed_at: string | null;
  error: string | null;
};

export const requireAuth: express.RequestHandler = (req, _res, next) => {
  (req as express.Request & { user?: unknown }).user = { uid: 'buyer_1', email: 'buyer@example.com' };
  next();
};

export function mockFetch(originalFetch: typeof fetch): typeof fetch {
  return mockPayChanguFetch(originalFetch, 'txref-integration-1', 'successful');
}

export function mockPayChanguFetch(
  originalFetch: typeof fetch,
  reference: string,
  status: string,
  amount = 1000,
  currency = 'MWK',
  verifiedReference = reference,
): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const target = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const headers = new Headers(init?.headers);
    if (/^https:\/\/[^/]*paychangu\.com\/payment/.test(target)) {
      assert.equal(headers.get('content-type'), 'application/json');
      assert.equal(headers.get('authorization'), 'Bearer integration-secret-key');
      const payload = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      assert.equal(typeof payload.amount, 'string');
      assert.match(String(payload.amount), /^\d+(?:\.\d{2})$/);
      assert.equal(payload.currency, 'MWK');
      assert.equal(typeof payload.callback_url, 'string');
      assert.ok(String(payload.callback_url).length > 0, 'initiation should include callback_url');
      assert.equal(typeof payload.return_url, 'string');
      assert.ok(String(payload.return_url).length > 0, 'initiation should include return_url');
      assert.equal(typeof payload.tx_ref, 'string');
      assert.ok(String(payload.tx_ref).length > 0, 'initiation should include a tx_ref');
      assert.equal((payload.customization as { title?: string } | undefined)?.title, 'BuyMesho Checkout');
      assert.ok(typeof payload.meta === 'string' || Array.isArray(payload.meta));
      return new Response(JSON.stringify({
        message: 'Hosted payment session generated successfully.',
        status: 'success',
        data: {
          event: 'checkout.session:created',
          checkout_url: 'https://checkout.paychangu.test/session',
          data: { tx_ref: reference, currency: 'MWK', amount, mode: 'sandbox', status: 'pending' },
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (new RegExp(`^https:\\/\\/[^/]*paychangu\\.com\\/verify-payment\\/${reference}`).test(target)) {
      assert.equal(headers.get('content-type'), 'application/json');
      assert.equal(headers.get('authorization'), 'Bearer integration-secret-key');
      return new Response(JSON.stringify({
        status: 'success',
        message: 'Payment details retrieved successfully.',
        data: {
          event_type: 'checkout.payment',
          tx_ref: verifiedReference,
          status,
          amount,
          currency,
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return originalFetch(input, init);
  }) as typeof fetch;
}

export function createApp(): express.Express {
  const app = express();
  app.use('/api/payments/paychangu/webhook', express.raw({ type: 'application/json' }));
  app.use('/api/payments/paychangu-payout/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  mountPayChanguRoutes(app, requireAuth);

  app.post('/api/payments/paychangu/initialize', requireAuth, async (req, res) => {
    try {
      const result = await serverPaymentService.createPayment(req.body as any);
      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to initialize PayChangu payment' });
    }
  });
  app.get('/api/payments/paychangu/verify/:txRef', async (req, res) => {
    try {
      return res.status(200).json(await serverPaymentService.verifyPaychanguPayment(req.params.txRef));
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'PayChangu verification failed' });
    }
  });
  app.post('/api/payments/paychangu/webhook', async (req, res) => paymentWebhookHandler(req, res));
  app.post('/api/payments/paychangu-payout/webhook', async (req, res) => payoutWebhookHandler(req, res));

  return app;
}

export function signWebhook(rawWebhook: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(rawWebhook).digest('hex');
}

export function hashPayload(rawWebhook: string): string {
  return createHash('sha256').update(rawWebhook).digest('hex');
}

export function clearPaymentState(): void {
  const db = getPaymentDb();
  db.prepare('DELETE FROM payout_events').run();
  db.prepare('DELETE FROM payout_attempts').run();
  db.prepare('DELETE FROM payouts').run();
  db.prepare('DELETE FROM escrows').run();
  db.prepare('DELETE FROM seller_payout_account_events').run();
  db.prepare('DELETE FROM seller_payout_accounts WHERE seller_uid = ?').run('seller_1');
  db.prepare('DELETE FROM seller_connect_accounts WHERE seller_uid = ?').run('seller_1');
  db.prepare('DELETE FROM payment_webhook_events').run();
  orderRepository.clear();
  paymentRepository.clear();
}

export function seedOrder(
  orderId: string,
  reference: string,
  status: 'pending_payment' | 'paid' | 'in_escrow' | 'refunded' = 'pending_payment',
  settlementRoute: 'escrow' | 'connect' = 'escrow',
): void {
  const now = new Date().toISOString();
  serverOrderService.create({
    id: orderId,
    buyerId: 'buyer_1',
    sellerId: 'seller_1',
    source: 'listing',
    status: 'pending_payment',
    currency: 'MWK',
    subtotal: { amount: 1000, currency: 'MWK' },
    total: { amount: 1000, currency: 'MWK' },
    items: [{ listingId: 'listing_1', title: 'Item', quantity: 1, unitPrice: { amount: 1000, currency: 'MWK' } }],
    createdAt: now,
    updatedAt: now,
    paymentProvider: 'paychangu',
    paymentReference: reference,
    settlementRoute,
  });

  if (status === 'paid') {
    serverOrderService.setStatus(orderId, 'paid');
  } else if (status === 'in_escrow') {
    serverOrderService.setStatus(orderId, 'paid');
    const escrow = escrowRepository.create(orderId, 'MWK', 1000);
    serverOrderService.markInEscrow(orderId, escrow.id);
  } else if (status === 'refunded') {
    serverOrderService.setStatus(orderId, 'paid');
    const escrow = escrowRepository.create(orderId, 'MWK', 1000);
    serverOrderService.markInEscrow(orderId, escrow.id);
    serverOrderService.setStatus(orderId, 'refunded');
  }
}

export function seedVerifiedSellerPayoutDestination(destinationId = 'dest_seller_1_connect'): void {
  const db = getPaymentDb();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO sellers (uid, email) VALUES ('seller_1', 'seller@example.com') ON CONFLICT (uid) DO UPDATE SET email = EXCLUDED.email`).run();
  db.prepare(
    `INSERT INTO seller_payout_accounts (
      id, seller_uid, destination_type, provider_name, provider_ref_id, currency,
      account_name, account_number_encrypted, mobile_encrypted, masked_account,
      destination_fingerprint, is_default, verification_status, verification_attempts,
      last_error, verified_at, replaced_from_id, replaced_by_id, is_active, created_at, updated_at
    ) VALUES (?, 'seller_1', 'mobile_money', 'paychangu', 'provider-dest-1', 'MWK',
      'Seller One', NULL, 'encrypted-mobile', '***1111',
      'seller-1-destination-fingerprint', 1, 'verified', 1,
      NULL, ?, NULL, NULL, 1, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      seller_uid = EXCLUDED.seller_uid,
      verification_status = EXCLUDED.verification_status,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at`,
  ).run(destinationId, now, now, now);
}

export function seedConnectedSellerAccount(connectAccountId = 'connect_seller_1'): void {
  const db = getPaymentDb();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO sellers (uid, email) VALUES ('seller_1', 'seller@example.com') ON CONFLICT (uid) DO UPDATE SET email = EXCLUDED.email`).run();
  db.prepare(
    `INSERT INTO seller_connect_accounts (
      id, seller_uid, provider_name, status, mode, scope,
      authorization_url, connect_user_id, connect_user_email, connect_user_name,
      access_token_encrypted, refresh_token_encrypted, webhook_url,
      webhook_secret_encrypted, connected_at, revoked_at, last_error,
      raw_profile, created_at, updated_at
    ) VALUES (?, 'seller_1', 'paychangu', 'connected', 'test', 'payments',
      'https://connect.paychangu.test/authorize', 'connect-user-1',
      'seller@example.com', 'Seller One', 'encrypted-access-token',
      NULL, 'https://example.com/paychangu/connect-webhook', NULL, ?, NULL,
      NULL, '{"id":"connect-user-1","email":"seller@example.com"}', ?, ?)
    ON CONFLICT (seller_uid) DO UPDATE SET
      status = EXCLUDED.status,
      mode = EXCLUDED.mode,
      scope = EXCLUDED.scope,
      connect_user_id = EXCLUDED.connect_user_id,
      connect_user_email = EXCLUDED.connect_user_email,
      connect_user_name = EXCLUDED.connect_user_name,
      connected_at = EXCLUDED.connected_at,
      revoked_at = NULL,
      last_error = NULL,
      raw_profile = EXCLUDED.raw_profile,
      updated_at = EXCLUDED.updated_at`,
  ).run(connectAccountId, now, now, now);
}

export function seedStoredPayment(orderId: string, reference: string, amount = 1000, currency = 'MWK'): void {
  const now = new Date().toISOString();
  paymentRepository.save({
    id: `pay_${reference}`,
    orderId,
    provider: 'paychangu',
    method: 'mobile_money',
    status: 'pending',
    amount: { amount, currency },
    reference,
    providerReference: null,
    checkoutUrl: null,
    paidAt: null,
    rawResponse: {},
    verified: false,
    createdAt: now,
    updatedAt: now,
  });
}

export async function initializePayment(base: string, orderId: string): Promise<Response> {
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

export async function postPayChanguWebhook(base: string, rawWebhook: string, signature = signWebhook(rawWebhook)): Promise<Response> {
  return fetch(`${base}/api/payments/paychangu/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-paychangu-signature': signature },
    body: rawWebhook,
  });
}

export async function postPayChanguPayoutWebhook(base: string, rawWebhook: string, signature = signWebhook(rawWebhook)): Promise<Response> {
  return fetch(`${base}/api/payments/paychangu-payout/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-paychangu-signature': signature },
    body: rawWebhook,
  });
}

export function fetchWebhookAuditRows(txRef: string): WebhookAuditRow[] {
  return getPaymentDb()
    .prepare(
      `SELECT provider, provider_event_id, tx_ref, payload_hash, processing_status, processed_at, error
       FROM payment_webhook_events
       WHERE reference = ? OR tx_ref = ?
       ORDER BY id ASC`,
    )
    .all(txRef, txRef) as WebhookAuditRow[];
}

export function fetchWebhookAuditRowsByPayloadHash(payloadHash: string): WebhookAuditRow[] {
  return getPaymentDb()
    .prepare(
      `SELECT provider, provider_event_id, tx_ref, payload_hash, processing_status, processed_at, error
       FROM payment_webhook_events
       WHERE payload_hash = ?
       ORDER BY id ASC`,
    )
    .all(payloadHash) as WebhookAuditRow[];
}

export function fetchConnectPayoutsForOrder(orderId: string): ConnectPayoutRow[] {
  return getPaymentDb()
    .prepare(
      `SELECT id, seller_id, order_id, escrow_id, destination_account_id, amount,
              gross_amount, platform_fee_amount, processing_fee_amount, reserve_amount,
              payout_fee_amount, seller_receives_amount, net_amount, formula_snapshot, status
       FROM payouts
       WHERE order_id = ?
       ORDER BY created_at ASC`,
    )
    .all(orderId) as ConnectPayoutRow[];
}

export function countPayoutEvents(payoutId: string, eventType: string): number {
  const row = getPaymentDb()
    .prepare('SELECT COUNT(*) AS count FROM payout_events WHERE payout_id = ? AND event_type = ?')
    .get(payoutId, eventType) as { count: number | string };
  return Number(row.count ?? 0);
}

export function countEscrowsForOrder(orderId: string): number {
  const row = getPaymentDb()
    .prepare('SELECT COUNT(*) AS count FROM escrows WHERE order_id = ?')
    .get(orderId) as { count: number | string };
  return Number(row.count ?? 0);
}

export { orderRepository, paymentRepository, escrowRepository };
export const refs = { orderRepository, paymentRepository, escrowRepository, serverOrderService, getPaymentDb };
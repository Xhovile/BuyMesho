import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createPayoutRouter } from '../payoutRoutes.js';
import { getPaymentDb } from '../../../postgresCompat.js';

const sellerId = 'seller-destination-independence-test';
const foreignSellerId = 'seller-destination-independence-foreign-test';

function createApp(uid: string, isAdmin = false): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/payouts', createPayoutRouter((req, _res, next) => {
    req.user = { uid, email: `${uid}@example.com`, is_admin: isAdmin };
    next();
  }));
  return app;
}

function resetState(): void {
  const db = getPaymentDb();
  db.prepare('DELETE FROM seller_payout_account_events WHERE seller_uid IN (?, ?)').run(sellerId, foreignSellerId);
  db.prepare('DELETE FROM seller_payout_accounts WHERE seller_uid IN (?, ?)').run(sellerId, foreignSellerId);
  db.prepare('DELETE FROM sellers WHERE uid IN (?, ?)').run(sellerId, foreignSellerId);
}

async function call(app: express.Express, path: string, init?: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, init);
    return { status: response.status, body: await response.json() as Record<string, unknown> };
  } finally {
    server.close();
  }
}

test('seller can create a payout destination without admin approval', async () => {
  resetState();
  getPaymentDb().prepare('INSERT INTO sellers (uid, email, is_verified) VALUES (?, ?, 1)').run(sellerId, `${sellerId}@example.com`);

  try {
    const result = await call(createApp(sellerId), '/api/payouts/destinations', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({
        destinationType: 'mobile_money',
        providerName: 'Airtel Money',
        providerRefId: 'airtel-money',
        currency: 'MWK',
        accountName: 'Test Seller',
        mobile: '0991234567',
        isDefault: true,
      }),
    });

    assert.equal(result.status, 201);
    const destination = result.body.destination as Record<string, unknown>;
    assert.equal(destination.verificationStatus, 'verified');
    assert.equal(destination.isActive, true);
    assert.equal(destination.isDefault, true);
    assert.match(String(destination.maskedAccount), /\*\*\*\*\d{4}$/);

    const db = getPaymentDb();
    const event = db.prepare(
      `SELECT event_type, actor_type, actor_id FROM seller_payout_account_events WHERE account_id = ? ORDER BY id DESC LIMIT 1`,
    ).get(destination.id) as { event_type: string; actor_type: string; actor_id: string };
    assert.deepEqual(event, {
      event_type: 'destination_added',
      actor_type: 'seller',
      actor_id: sellerId,
    });
  } finally {
    resetState();
  }
});

test('seller cannot edit a payout destination owned by another seller', async () => {
  resetState();
  const db = getPaymentDb();
  db.prepare('INSERT INTO sellers (uid, email, is_verified) VALUES (?, ?, 1), (?, ?, 1)').run(
    sellerId, `${sellerId}@example.com`,
    foreignSellerId, `${foreignSellerId}@example.com`,
  );
  const destinationId = 'foreign-destination-independence-test';
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO seller_payout_accounts (
      id, seller_uid, destination_type, provider_name, provider_ref_id, currency, account_name,
      mobile_encrypted, masked_account, destination_fingerprint, is_default, verification_status,
      verification_attempts, is_active, created_at, updated_at
    ) VALUES (?, ?, 'mobile_money', 'Airtel Money', 'airtel-money', 'MWK', 'Foreign Seller',
      '265991111111', '****1111', 'foreign-fingerprint', 1, 'verified', 0, 1, ?, ?)
  `).run(destinationId, foreignSellerId, now, now);

  try {
    const result = await call(createApp(sellerId), `/api/payouts/destinations/${destinationId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({ accountName: 'Hijacked Seller Name', isDefault: true }),
    });

    assert.equal(result.status, 403);
    assert.match(String(result.body.error), /not allowed to edit this payout setting/i);

    const destination = db.prepare('SELECT account_name, seller_uid FROM seller_payout_accounts WHERE id = ?').get(destinationId) as { account_name: string; seller_uid: string };
    assert.equal(destination.account_name, 'Foreign Seller');
    assert.equal(destination.seller_uid, foreignSellerId);
  } finally {
    resetState();
  }
});

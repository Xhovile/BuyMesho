import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac, randomUUID } from 'crypto';
import { getPaymentDb } from '../../../sqlite.js';
import { payoutWebhookHandler } from '../payout.webhooks.js';

function signPayload(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function seedWebhookPayout(prefix: string) {
  const db = getPaymentDb();
  const payoutId = `${prefix}-payout`;
  const sellerId = `${prefix}-seller`;
  const chargeId = `BM-PO-${payoutId}-A01`;
  const now = new Date().toISOString();

  db.prepare(`DELETE FROM payout_events WHERE payout_id = ?`).run(payoutId);
  db.prepare(`DELETE FROM payout_attempts WHERE payout_id = ?`).run(payoutId);
  db.prepare(`DELETE FROM payouts WHERE id = ?`).run(payoutId);
  db.prepare(`DELETE FROM sellers WHERE uid = ?`).run(sellerId);
  db.prepare(`DELETE FROM payment_webhook_events WHERE provider = 'paychangu_payout' AND reference = ?`).run(chargeId);

  db.prepare(`INSERT OR REPLACE INTO sellers (uid, email, is_verified, is_suspended) VALUES (?, ?, 1, 0)`).run(
    sellerId,
    `${prefix}@example.com`,
  );

  db.prepare(`INSERT INTO payouts (
    id, seller_id, amount, currency, status, provider, provider_charge_id, requested_by, requested_at, created_at, updated_at
  ) VALUES (?, ?, 1470, 'MWK', 'processing', 'paychangu', ?, 'system', ?, ?, ?)`).run(
    payoutId,
    sellerId,
    chargeId,
    now,
    now,
    now,
  );

  return { payoutId, chargeId };
}

test('duplicate payout webhooks are acknowledged once and logged as duplicates', async () => {
  const secret = `secret-${randomUUID()}`;
  process.env.PAYCHANGU_PAYOUT_WEBHOOK_SECRET = secret;

  const { payoutId, chargeId } = seedWebhookPayout('payout-webhook');
  const payload = JSON.stringify({
    event_type: 'charge.success',
    event_id: 'evt-payout-1',
    data: {
      transaction: {
        status: 'successful',
        charge_id: chargeId,
        payout_reference: payoutId,
      },
    },
  });
  const signature = signPayload(secret, payload);

  await payoutWebhookHandler.handlePaychanguWebhook(signature, payload);
  await payoutWebhookHandler.handlePaychanguWebhook(signature, payload);

  const db = getPaymentDb();
  const payout = db.prepare(`SELECT status FROM payouts WHERE id = ?`).get(payoutId) as { status: string };
  assert.equal(payout.status, 'paid');

  const reconciled = db.prepare(`SELECT COUNT(*) AS count FROM payout_events WHERE payout_id = ? AND event_type = 'payout_reconciled'`).get(payoutId) as { count: number };
  const duplicates = db.prepare(`SELECT COUNT(*) AS count FROM payout_events WHERE payout_id = ? AND event_type = 'payout_webhook_duplicate'`).get(payoutId) as { count: number };
  assert.equal(reconciled.count, 1);
  assert.equal(duplicates.count, 1);
});

test('same charge reference twice is deduplicated even with a different provider event id', async () => {
  const secret = `secret-${randomUUID()}`;
  process.env.PAYCHANGU_PAYOUT_WEBHOOK_SECRET = secret;

  const { payoutId, chargeId } = seedWebhookPayout('payout-webhook-ref');
  const firstPayload = JSON.stringify({
    event_type: 'charge.success',
    event_id: 'evt-payout-ref-1',
    data: { transaction: { status: 'successful', charge_id: chargeId, payout_reference: payoutId } },
  });
  const secondPayload = JSON.stringify({
    event_type: 'charge.success',
    event_id: 'evt-payout-ref-2',
    data: { transaction: { status: 'successful', charge_id: chargeId, payout_reference: payoutId } },
  });

  await payoutWebhookHandler.handlePaychanguWebhook(signPayload(secret, firstPayload), firstPayload);
  await payoutWebhookHandler.handlePaychanguWebhook(signPayload(secret, secondPayload), secondPayload);

  const db = getPaymentDb();
  const duplicates = db.prepare(`SELECT COUNT(*) AS count FROM payout_events WHERE payout_id = ? AND event_type = 'payout_webhook_duplicate'`).get(payoutId) as { count: number };
  assert.equal(duplicates.count, 1);
});

test('invalid payout webhook signature is rejected and audited on the payout timeline', async () => {
  const secret = `secret-${randomUUID()}`;
  process.env.PAYCHANGU_PAYOUT_WEBHOOK_SECRET = secret;

  const { payoutId, chargeId } = seedWebhookPayout('payout-webhook-invalid');
  const payload = JSON.stringify({
    event_type: 'charge.success',
    event_id: 'evt-payout-invalid-1',
    data: {
      transaction: {
        status: 'successful',
        charge_id: chargeId,
        payout_reference: payoutId,
      },
    },
  });

  await assert.rejects(
    payoutWebhookHandler.handlePaychanguWebhook('bad-signature', payload),
    /Invalid PayChangu payout webhook signature/,
  );

  const db = getPaymentDb();
  const rejected = db.prepare(
    `SELECT COUNT(*) AS count
     FROM payout_events
     WHERE payout_id = ?
       AND event_type = 'payout_webhook_rejected'`,
  ).get(payoutId) as { count: number };
  assert.equal(rejected.count, 1);
});

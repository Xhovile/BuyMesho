import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'crypto';
import { query, withTransaction } from '../../../postgres.js';
import { payoutService } from '../payout.service.js';

async function seedPayout(prefix: string, status: 'eligible' | 'failed' = 'eligible') {
  const payoutId = `${prefix}-payout`;
  const orderId = `${prefix}-order`;
  const sellerId = `${prefix}-seller`;
  const destinationId = `${prefix}-destination`;
  const escrowId = `${prefix}-escrow`;
  const releaseEntryId = `${prefix}-release`;
  const destinationFingerprint = randomUUID();
  const now = new Date().toISOString();

  await withTransaction(async (client) => {
    await client.query('DELETE FROM payout_attempts WHERE payout_id = $1', [payoutId]);
    await client.query('DELETE FROM payout_events WHERE payout_id = $1', [payoutId]);
    await client.query('DELETE FROM payouts WHERE id = $1', [payoutId]);
    await client.query('DELETE FROM escrows WHERE order_id = $1', [orderId]);
    await client.query('DELETE FROM orders WHERE id = $1', [orderId]);
    await client.query('DELETE FROM seller_payout_accounts WHERE id = $1', [destinationId]);
    await client.query('DELETE FROM sellers WHERE uid = $1', [sellerId]);

    await client.query(
      `INSERT INTO sellers (uid, email, is_verified, is_suspended)
       VALUES ($1, $2, 1, 0)`,
      [sellerId, `${prefix}@example.com`],
    );

    await client.query(
      `INSERT INTO seller_payout_accounts (
         id, seller_uid, destination_type, provider_name, provider_ref_id,
         currency, account_name, mobile_encrypted, masked_account, destination_fingerprint,
         is_default, verification_status, verification_attempts,
         is_active, created_at, updated_at
       ) VALUES ($1, $2, 'mobile_money', 'Airtel Money', 'airtel-money',
         'MWK', 'Downtime Seller', '265999111444', '****1444', $3,
         1, 'verified', 1, 1, $4, $4)`,
      [destinationId, sellerId, destinationFingerprint, now],
    );

    await client.query(
      `INSERT INTO orders (
         id, buyer_id, seller_id, source, status, delivery_status, currency,
         subtotal_amount, subtotal_currency, total_amount, total_currency,
         payment_provider, settlement_route, payment_reference,
         checkout_idempotency_key, checkout_request_hash, escrow_id, items,
         buyer_details, placed_at, paid_at, fulfilled_at, created_at, updated_at
       ) VALUES (
         $1, $2, $3, 'listing', 'fulfilled', 'delivered', 'MWK',
         1500, 'MWK', 1500, 'MWK', NULL, NULL, NULL,
         NULL, NULL, $4, $5, NULL, $6, $6, $6, $6, $6
       )`,
      [orderId, `${prefix}-buyer`, sellerId, escrowId, JSON.stringify([]), now],
    );

    const escrowEntry = {
      id: randomUUID(),
      escrowId,
      entryType: 'credit',
      amount: 1500,
      currency: 'MWK',
      balanceAfter: 1500,
      note: 'Payment received — funds held in escrow',
      createdAt: now,
    };

    const releaseEntry = {
      id: releaseEntryId,
      escrowId,
      entryType: 'release',
      amount: 1500,
      currency: 'MWK',
      balanceAfter: 0,
      note: 'Escrow released to seller earnings',
      actorId: 'admin-downtime-test',
      createdAt: now,
    };

    await client.query(
      `INSERT INTO escrows (
         id, order_id, state, currency, balance_amount, balance_currency,
         entries, created_at, updated_at
       ) VALUES ($1, $2, 'released', 'MWK', 0, 'MWK', $3, $4, $4)`,
      [escrowId, orderId, JSON.stringify([escrowEntry, releaseEntry]), now],
    );

    await client.query(
      `INSERT INTO payouts (
         id, seller_id, order_id, escrow_id, release_entry_id,
         destination_account_id, amount, currency, status, provider,
         requested_by, requested_at, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'MWK', $8, 'paychangu', $9, $10, $10, $10)`,
      [
        payoutId,
        sellerId,
        orderId,
        escrowId,
        releaseEntryId,
        destinationId,
        1470,
        status,
        'admin-downtime-test',
        now,
      ],
    );

    await client.query(
      `UPDATE payouts
       SET failure_reason = NULL, manual_review_reason = NULL
       WHERE id = $1`,
      [payoutId],
    );
  });

  return { payoutId, sellerId };
}

test('provider balance lookup timeout holds payout for manual review', async () => {
  const { payoutId } = await seedPayout('balance-timeout');
  const originalFetch = global.fetch;
  const originalSecretKey = process.env.PAYCHANGU_SECRET_KEY;
  process.env.PAYCHANGU_SECRET_KEY = 'test-secret-key';

  global.fetch = (async () => {
    throw new Error('provider timeout while checking wallet-balance');
  }) as typeof fetch;

  try {
    const result = await payoutService.executePayout({
      payoutId,
      actorType: 'admin',
      actorId: 'admin-timeout',
    });

    assert.equal(result.reasonCode, 'provider_timeout');
    assert.equal(result.nextAction, 'manual_review');

    const payoutResult = await query<Record<string, unknown>>(
      `SELECT status, failure_reason, manual_review_reason, paid_at
       FROM payouts WHERE id = $1`,
      [payoutId],
    );
    const payout = payoutResult.rows[0];

    assert.equal(payout.status, 'held');
    assert.equal(payout.failure_reason, 'provider_timeout');
    assert.match(String(payout.manual_review_reason ?? ''), /manual review/i);
    assert.equal(payout.paid_at, null);

    const attemptsResult = await query<{ count: string | number }>(
      `SELECT COUNT(*) AS count FROM payout_attempts WHERE payout_id = $1`,
      [payoutId],
    );
    assert.equal(Number(attemptsResult.rows[0]?.count ?? 0), 0);
  } finally {
    global.fetch = originalFetch;
    if (originalSecretKey === undefined) {
      delete process.env.PAYCHANGU_SECRET_KEY;
    } else {
      process.env.PAYCHANGU_SECRET_KEY = originalSecretKey;
    }
  }
});

test('provider payout submission outage holds payout without writing paid state', async () => {
  const { payoutId } = await seedPayout('submit-outage', 'failed');
  await query(
    `UPDATE payouts SET failure_reason = 'provider_timeout' WHERE id = $1`,
    [payoutId],
  );

  const originalFetch = global.fetch;
  const originalSecretKey = process.env.PAYCHANGU_SECRET_KEY;
  process.env.PAYCHANGU_SECRET_KEY = 'test-secret-key';
  global.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/wallet-balance')) {
      return new Response(JSON.stringify({ data: { main_balance: 100000, currency: 'MWK' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    throw new Error('fetch failed: provider unavailable');
  }) as typeof fetch;

  try {
    const result = await payoutService.executePayout({
      payoutId,
      actorType: 'admin',
      actorId: 'admin-outage',
    });

    assert.equal(result.reasonCode, 'provider_unavailable');
    assert.equal(result.nextAction, 'retry_blocked');
    assert.ok(result.attempt);

    const payoutResult = await query<Record<string, unknown>>(
      `SELECT status, failure_reason, manual_review_reason, paid_at, last_attempt_id
       FROM payouts WHERE id = $1`,
      [payoutId],
    );
    const payout = payoutResult.rows[0];

    assert.equal(payout.status, 'held');
    assert.equal(payout.failure_reason, 'provider_unavailable');
    assert.match(String(payout.manual_review_reason ?? ''), /provider outage|manual review/i);
    assert.equal(payout.paid_at, null);
    assert.ok(payout.last_attempt_id);
  } finally {
    global.fetch = originalFetch;
    if (originalSecretKey === undefined) {
      delete process.env.PAYCHANGU_SECRET_KEY;
    } else {
      process.env.PAYCHANGU_SECRET_KEY = originalSecretKey;
    }
  }
});

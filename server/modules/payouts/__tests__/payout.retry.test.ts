import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'crypto';
import { getPaymentDb } from '../../../sqlite.js';
import { payoutService } from '../payout.service.js';
import { serverOrderService } from '../../orders/order.service.js';
import { escrowRepository } from '../../escrow/escrow.repository.js';

const payoutId = 'retry-payout-test';
const orderId = 'retry-order-test';
const sellerId = 'retry-seller-test';
const destinationId = 'retry-destination-test';

function resetState(): void {
  const db = getPaymentDb();
  db.prepare('DELETE FROM payout_attempts WHERE payout_id = ?').run(payoutId);
  db.prepare('DELETE FROM payout_events WHERE payout_id = ?').run(payoutId);
  db.prepare('DELETE FROM payouts WHERE id = ?').run(payoutId);
  db.prepare('DELETE FROM escrows WHERE order_id = ?').run(orderId);
  db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
  db.prepare('DELETE FROM seller_payout_accounts WHERE id = ?').run(destinationId);
  db.prepare('DELETE FROM sellers WHERE uid = ?').run(sellerId);
}

function seedPayout(): void {
  const db = getPaymentDb();
  const now = new Date().toISOString();

  db.prepare(`INSERT OR REPLACE INTO sellers (uid, email, is_verified)
    VALUES (?, ?, 1)`).run(sellerId, 'retry@example.com');

  db.prepare(`INSERT INTO seller_payout_accounts (
    id, seller_uid, destination_type, provider_name, provider_ref_id,
    currency, account_name, masked_account, destination_fingerprint,
    is_default, verification_status, verification_attempts,
    is_active, created_at, updated_at
  ) VALUES (?, ?, 'mobile_money', 'Airtel Money', 'airtel-money',
    'MWK', 'Retry Seller', '****1234', ?,
    1, 'verified', 1,
    1, ?, ?)
  `).run(destinationId, sellerId, randomUUID(), now, now);

  serverOrderService.create({
    id: orderId,
    buyerId: 'buyer-retry-test',
    sellerId,
    source: 'listing',
    status: 'fulfilled',
    currency: 'MWK',
    subtotal: { amount: 1500, currency: 'MWK' },
    total: { amount: 1500, currency: 'MWK' },
    items: [],
    createdAt: now,
    updatedAt: now,
  });

  serverOrderService.setStatus(orderId, 'fulfilled');
  escrowRepository.create(orderId, 'MWK', 1500);
  escrowRepository.updateState(orderId, 'released');

  db.prepare(`INSERT INTO payouts (
    id, seller_id, order_id, escrow_id, release_entry_id,
    destination_account_id, amount, currency, status,
    provider, requested_by, requested_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 'MWK', 'failed', 'paychangu', ?, ?, ?, ?)`)
  .run(
    payoutId,
    sellerId,
    orderId,
    'retry-escrow-id',
    'retry-release-entry',
    destinationId,
    1470,
    'admin-retry-test',
    now,
    now,
    now,
  );

  db.prepare(`UPDATE payouts SET failure_reason = 'provider_timeout' WHERE id = ?`).run(payoutId);
}

test('retry payout generates a fresh provider charge id per attempt', async () => {
  resetState();
  seedPayout();

  const originalFetch = global.fetch;
  let requestCount = 0;

  global.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (url.includes('/wallet-balance')) {
      return new Response(JSON.stringify({ data: { main_balance: 100000, currency: 'MWK' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    requestCount += 1;

    return new Response(JSON.stringify({
      status: requestCount === 1 ? 'failed' : 'successful',
      data: {
        transaction: {
          status: requestCount === 1 ? 'failed' : 'successful',
        },
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const first = await payoutService.executePayout({
      payoutId,
      actorType: 'admin',
      actorId: 'admin-1',
    });

    assert.ok(first.attempt);
    assert.equal(first.attempt?.attemptNo, 1);
    assert.match(first.attempt?.providerChargeId ?? '', /-A01$/);

    const db = getPaymentDb();
    db.prepare(`UPDATE payouts SET failure_reason = 'provider_timeout', status = 'failed' WHERE id = ?`).run(payoutId);

    const second = await payoutService.executePayout({
      payoutId,
      actorType: 'admin',
      actorId: 'admin-1',
    });

    assert.ok(second.attempt);
    assert.equal(second.attempt?.attemptNo, 2);
    assert.match(second.attempt?.providerChargeId ?? '', /-A02$/);
    assert.notEqual(first.attempt?.providerChargeId, second.attempt?.providerChargeId);

    const attempts = db.prepare(`SELECT provider_charge_id FROM payout_attempts WHERE payout_id = ? ORDER BY attempt_no ASC`).all(payoutId) as Array<{ provider_charge_id: string }>;
    assert.equal(attempts.length, 2);
    assert.notEqual(attempts[0]?.provider_charge_id, attempts[1]?.provider_charge_id);
  } finally {
    global.fetch = originalFetch;
    resetState();
  }
});

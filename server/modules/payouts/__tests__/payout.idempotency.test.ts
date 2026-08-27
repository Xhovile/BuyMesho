import test from 'node:test';
import assert from 'node:assert/strict';
import '../payout.schema.js';
import { PayoutRepository } from '../payout.repository.js';
import { reserveRetryAttempt } from '../payout.execution-repository.js';
import { getPaymentDb } from '../../../postgresCompat.js';

const repository = new PayoutRepository();

function clearState(): void {
  const db = getPaymentDb();
  db.prepare('DELETE FROM payout_attempts').run();
  db.prepare('DELETE FROM payouts').run();
  db.prepare('DELETE FROM orders WHERE id = ?').run('order_phase3_idempotency_1');
  db.prepare('DELETE FROM sellers WHERE uid = ?').run('seller_phase3_idempotency_1');
}

test('payout cannot be processed twice while a provider attempt is active', async () => {
  clearState();
  const db = getPaymentDb();

  try {
    db.prepare("INSERT INTO sellers (uid, email) VALUES (?, ?)").run('seller_phase3_idempotency_1', 'phase3@example.com');

    db.prepare(`
      INSERT INTO orders (
        id, buyer_id, seller_id, source, status, currency,
        subtotal_amount, subtotal_currency, total_amount, total_currency,
        payment_provider, payment_reference, items, created_at, updated_at
      ) VALUES (?, ?, ?, 'listing', 'in_escrow', 'MWK', 1000, 'MWK', 1000, 'MWK', 'paychangu', 'phase3-ref', '[]', ?, ?)
    `).run('order_phase3_idempotency_1', 'buyer_phase3', 'seller_phase3_idempotency_1', new Date().toISOString(), new Date().toISOString());

    const { payout } = repository.createConnectPayoutCandidate({
      sellerId: 'seller_phase3_idempotency_1',
      orderId: 'order_phase3_idempotency_1',
      amount: 970,
      grossAmount: 1000,
      platformFeeAmount: 30,
      processingFeeAmount: 0,
      reserveAmount: 0,
      reserveCapAmount: 0,
      manualAdjustmentAmount: 0,
      payoutFeeAmount: 0,
      sellerReceivesAmount: 970,
      netAmount: 970,
      formulaSnapshot: { grossAmount: 1000, netAmount: 970 },
      currency: 'MWK',
      requestedBy: 'system',
      destinationAccountId: null,
      snapshot: null,
    });

    const firstAttempt = await reserveRetryAttempt({
      payoutId: payout.id,
      provider: 'paychangu',
      actorType: 'system',
      actorId: 'system',
    });

    assert.equal(firstAttempt.attemptNo, 1);
    assert.ok(firstAttempt.providerChargeId);

    await assert.rejects(
      () => reserveRetryAttempt({
        payoutId: payout.id,
        provider: 'paychangu',
        actorType: 'system',
        actorId: 'system',
      }),
      /Payout is already processing/i,
    );

    const attempts = db
      .prepare('SELECT attempt_no, status FROM payout_attempts WHERE payout_id = ? ORDER BY attempt_no')
      .all(payout.id) as Array<{ attempt_no: number; status: string }>;
    assert.equal(attempts.length, 1);
    assert.deepEqual(attempts[0], { attempt_no: 1, status: 'processing' });

    const current = repository.findById(payout.id);
    assert.equal(current?.status, 'processing');
    assert.equal(current?.providerChargeId, firstAttempt.providerChargeId);
  } finally {
    clearState();
  }
});

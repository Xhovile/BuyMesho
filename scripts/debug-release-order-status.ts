import { randomUUID } from 'node:crypto';
import { withTransaction } from '../server/postgres.js';
import { getPaymentDb } from '../server/postgresCompat.js';
import { orderRepository } from '../server/modules/orders/order.repository.js';
import { serverOrderService } from '../server/modules/orders/order.service.js';
import { escrowRepository } from '../server/modules/escrow/escrow.repository.js';
import { payoutService } from '../server/modules/payouts/payout.service.js';

if (process.env.NODE_ENV !== 'test') {
  console.error('This diagnostic requires NODE_ENV=test.');
  process.exit(1);
}

const db = getPaymentDb();
const id = randomUUID();
const sellerId = `debug-seller-${id.slice(0, 8)}`;
const buyerId = `debug-buyer-${id.slice(0, 8)}`;
const now = new Date().toISOString();

function cleanup() {
  db.prepare('DELETE FROM payout_events WHERE payout_id IN (SELECT id FROM payouts WHERE order_id = ?)').run(id);
  db.prepare('DELETE FROM payout_attempts WHERE payout_id IN (SELECT id FROM payouts WHERE order_id = ?)').run(id);
  db.prepare('DELETE FROM payouts WHERE order_id = ?').run(id);
  db.prepare('DELETE FROM escrow_events WHERE escrow_id IN (SELECT id FROM escrows WHERE order_id = ?)').run(id);
  db.prepare('DELETE FROM escrows WHERE order_id = ?').run(id);
  db.prepare('DELETE FROM orders WHERE id = ?').run(id);
  db.prepare('DELETE FROM sellers WHERE uid = ?').run(sellerId);
}

try {
  db.prepare('INSERT INTO sellers (uid, email, is_verified) VALUES (?, ?, 1)').run(sellerId, `${sellerId}@example.com`);

  await orderRepository.saveAsync({
    id,
    buyerId,
    sellerId,
    source: 'listing',
    status: 'in_escrow',
    deliveryStatus: 'action_required',
    currency: 'MWK',
    subtotal: { amount: 1500, currency: 'MWK' },
    total: { amount: 1500, currency: 'MWK' },
    items: [{
      listingId: 'debug-listing',
      title: 'Debug Item',
      quantity: 1,
      unitPrice: { amount: 1500, currency: 'MWK' },
    }],
    createdAt: now,
    updatedAt: now,
  });

  const escrow = await escrowRepository.createAsync(id, 'MWK', 1500);

  console.time('TOTAL');
  await withTransaction(async (client) => {
    console.time('RELEASE');
    const released = await escrowRepository.releaseToSellerEarningsAsync({
      orderId: id,
      releasedBy: buyerId,
      reference: 'debug-release',
    }, client);
    console.timeEnd('RELEASE');
    console.log('RELEASE_RESULT:', Boolean(released));

    if (!released) throw new Error('Release returned undefined');

    console.time('PAYOUT');
    const payout = await payoutService.createEligiblePayoutCandidateAsync({
      sellerId,
      orderId: id,
      escrowId: escrow.id,
      releaseEntryId: released.releaseEntry.id,
      amount: 1410,
      grossAmount: 1500,
      platformFeeAmount: 45,
      processingFeeAmount: 0,
      reserveAmount: 0,
      reserveCapAmount: 90,
      manualAdjustmentAmount: 0,
      payoutFeeAmount: 45,
      sellerReceivesAmount: 1410,
      netAmount: 1410,
      formulaSnapshot: {},
      currency: 'MWK',
      requestedBy: buyerId,
    }, client);
    console.timeEnd('PAYOUT');
    console.log('PAYOUT_RESULT:', payout.id, payout.status);

    console.time('ORDER_STATUS');
    const updated = await serverOrderService.setStatusAsync(id, 'fulfilled', client);
    console.timeEnd('ORDER_STATUS');
    console.log('ORDER_STATUS_RESULT:', updated?.status ?? null);

    console.log('TRANSACTION_CALLBACK_COMPLETE');
  });

  console.timeEnd('TOTAL');
  console.log('COMMIT_COMPLETE');
} catch (error) {
  console.error('ERROR:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  cleanup();
}

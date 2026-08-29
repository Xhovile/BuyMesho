import fetch from 'node-fetch';
import express from 'express';
import { createBuyerEscrowRouter } from '../server/routes/escrow/buyerEscrowRoutes.js';
import { orderRepository } from '../server/modules/orders/order.repository.js';
import { escrowRepository } from '../server/modules/escrow/escrow.repository.js';
import { query } from '../server/postgres.js';
import { getPaymentDb } from '../server/postgresCompat.js';

if (process.env.NODE_ENV !== 'test') {
  console.error('Debug release refused: this destructive reproduction may only run with NODE_ENV=test against the isolated test database.');
  process.exit(1);
}

async function main() {
  process.env.PAYCHANGU_SECRET_KEY = 'test-secret-key';
  const releasePayoutOrderId = 'order-release-payout-step-3';
  const sellerId = 'seller-release-payout-1';

  const db = getPaymentDb();
  db.prepare('DELETE FROM payout_events WHERE payout_id IN (SELECT id FROM payouts WHERE order_id = ?)').run(releasePayoutOrderId);
  db.prepare('DELETE FROM payout_attempts WHERE payout_id IN (SELECT id FROM payouts WHERE order_id = ?)').run(releasePayoutOrderId);
  db.prepare('DELETE FROM payouts WHERE order_id = ?').run(releasePayoutOrderId);
  db.prepare('DELETE FROM escrow_events WHERE escrow_id IN (SELECT id FROM escrows WHERE order_id = ?)').run(releasePayoutOrderId);
  db.prepare('DELETE FROM escrows WHERE order_id = ?').run(releasePayoutOrderId);
  db.prepare('DELETE FROM orders WHERE id = ?').run(releasePayoutOrderId);
  db.prepare('DELETE FROM seller_payout_account_events WHERE seller_uid = ?').run(sellerId);
  db.prepare('DELETE FROM seller_payout_accounts WHERE seller_uid = ?').run(sellerId);
  db.prepare('DELETE FROM sellers WHERE uid = ?').run(sellerId);

  const nowStamp = new Date().toISOString();
  await orderRepository.saveAsync({
    id: releasePayoutOrderId,
    buyerId: 'buyer-release-payout-1',
    sellerId,
    source: 'listing',
    status: 'in_escrow',
    deliveryStatus: 'action_required',
    currency: 'MWK',
    subtotal: { amount: 1500, currency: 'MWK' },
    total: { amount: 1500, currency: 'MWK' },
    items: [{ listingId: 'listing-release-payout-1', title: 'Release Item', quantity: 1, unitPrice: { amount: 1500, currency: 'MWK' } }],
    createdAt: nowStamp,
    updatedAt: nowStamp,
  });
  await escrowRepository.createAsync(releasePayoutOrderId, 'MWK', 1500);

  db.prepare('INSERT INTO sellers (uid, email, is_verified) VALUES (?, ?, 1)').run(sellerId, `${sellerId}@example.com`);
  db.prepare(`INSERT INTO seller_payout_accounts (id, seller_uid, destination_type, provider_name, provider_ref_id, currency, account_name, mobile_encrypted, masked_account, destination_fingerprint, is_default, verification_status, verification_attempts, is_active, created_at, updated_at) VALUES (?, ?, 'mobile_money', 'paychangu', 'airtel-money', 'MWK', 'Release Test', '0990000000', '****0000', ?, 1, 'verified', 0, 1, ?, ?)`)
    .run('destination-release-payout-1', sellerId, 'debug-fingerprint', nowStamp, nowStamp);

  const app = express();
  app.use(express.json());
  app.use('/api/escrow', createBuyerEscrowRouter((req, _res, next) => {
    (req as any).user = { uid: 'buyer-release-payout-1', email: 'buyer-release-payout-1@example.com', is_admin: false };
    next();
  }));

  const server = app.listen(0);
  const port = (server.address() as any).port;

  let diagnosticsFinished = false;
  const diagnostics = setTimeout(async () => {
    if (diagnosticsFinished) return;

    try {
      const activity = await query<{
        pid: number;
        state: string;
        wait_event_type: string | null;
        wait_event: string | null;
        query: string;
        backend_xid: string | null;
        query_start: string | null;
      }>(
        `SELECT pid, state, wait_event_type, wait_event, query, backend_xid, query_start
         FROM pg_stat_activity
         WHERE datname = current_database()
           AND pid <> pg_backend_pid()
         ORDER BY query_start NULLS LAST`,
      );

      console.log('[release-debug-db] activity:', JSON.stringify(activity.rows, null, 2));

      const locks = await query<{
        blocked_pid: number;
        blocked_query: string;
        blocking_pid: number | null;
        blocking_query: string | null;
        locktype: string;
        mode: string;
        relation: string | null;
      }>(
        `SELECT
           blocked.pid AS blocked_pid,
           blocked.query AS blocked_query,
           blocking.pid AS blocking_pid,
           blocking.query AS blocking_query,
           blocked_locks.locktype,
           blocked_locks.mode,
           blocked_locks.relation::regclass::text AS relation
         FROM pg_locks blocked_locks
         JOIN pg_stat_activity blocked ON blocked.pid = blocked_locks.pid
         LEFT JOIN LATERAL (
           SELECT a.pid, a.query
           FROM pg_locks blocking_locks
           JOIN pg_stat_activity a ON a.pid = blocking_locks.pid
           WHERE blocking_locks.locktype = blocked_locks.locktype
             AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
             AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
             AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
             AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
             AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
             AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
             AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
             AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
             AND blocking_locks.granted
           LIMIT 1
         ) blocking ON true
         WHERE NOT blocked_locks.granted`,
      );

      console.log('[release-debug-db] locks:', JSON.stringify(locks.rows, null, 2));
    } catch (error) {
      console.error('[release-debug-db] diagnostics failed:', error);
    }
  }, 3000);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/escrow/${releasePayoutOrderId}/release`, {
      method: 'POST',
      headers: { authorization: 'Bearer test', 'content-type': 'application/json' },
      body: JSON.stringify({ reference: 'buyer-confirmed-delivery' }),
    });

    diagnosticsFinished = true;
    clearTimeout(diagnostics);
    console.log('Status:', response.status);
    const body = await response.json();
    console.log('Body:', JSON.stringify(body, null, 2));
  } finally {
    diagnosticsFinished = true;
    clearTimeout(diagnostics);
    server.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });

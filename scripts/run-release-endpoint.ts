import express from 'express';
import { createEscrowRouter } from '../server/routes/escrowRoutes.js';
import { serverOrderService } from '../server/modules/orders/order.service.js';
import { escrowRepository } from '../server/modules/escrow/escrow.repository.js';
import { getPaymentDb } from '../server/sqlite.js';
import { randomUUID } from 'crypto';

function createReleaseApp(uid: string, isAdmin = false): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/escrow', createEscrowRouter((req, _res, next) => {
    (req as express.Request & { user?: unknown }).user = {
      uid,
      email: `${uid}@example.com`,
      is_admin: isAdmin,
    } as unknown as Record<string, unknown>;
    next();
  }));
  return app;
}

async function run() {
  const db = getPaymentDb();
  const orderId = 'order-release-payout-step-3';
  const sellerId = 'seller-release-payout-1';
  const destinationId = 'destination-release-payout-1';
  const now = new Date().toISOString();

  db.prepare('DELETE FROM payout_events WHERE payout_id IN (SELECT id FROM payouts WHERE order_id = ?)').run(orderId);
  db.prepare('DELETE FROM payout_attempts WHERE payout_id IN (SELECT id FROM payouts WHERE order_id = ?)').run(orderId);
  db.prepare('DELETE FROM payouts WHERE order_id = ?').run(orderId);
  db.prepare('DELETE FROM escrow_events WHERE escrow_id IN (SELECT id FROM escrows WHERE order_id = ?)').run(orderId);
  db.prepare('DELETE FROM escrows WHERE order_id = ?').run(orderId);
  db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
  db.prepare('DELETE FROM seller_payout_account_events WHERE seller_uid = ?').run(sellerId);
  db.prepare('DELETE FROM seller_payout_accounts WHERE seller_uid = ?').run(sellerId);
  db.prepare('DELETE FROM sellers WHERE uid = ?').run(sellerId);

  // seed seller and destination
  db.prepare('INSERT OR REPLACE INTO sellers (uid, email, is_verified) VALUES (?, ?, 1)').run(sellerId, `${sellerId}@example.com`);
  db.prepare(`INSERT INTO seller_payout_accounts (
      id, seller_uid, destination_type, provider_name, provider_ref_id,
      currency, account_name, mobile_encrypted, masked_account, destination_fingerprint,
      is_default, verification_status, verification_attempts, is_active, created_at, updated_at
    ) VALUES (?, ?, 'mobile_money', 'paychangu', 'airtel-money', 'MWK', 'Release Test', '0990000000', '****0000', ?, 1, 'verified', 0, 1, ?, ?)`)
    .run(destinationId, sellerId, randomUUID(), now, now);

  serverOrderService.create({
    id: orderId,
    buyerId: 'buyer-release-payout-1',
    sellerId,
    source: 'listing',
    status: 'in_escrow',
    currency: 'MWK',
    subtotal: { amount: 1500, currency: 'MWK' },
    total: { amount: 1500, currency: 'MWK' },
    items: [],
    createdAt: now,
    updatedAt: now,
  });
  serverOrderService.setStatus(orderId, 'in_escrow');
  escrowRepository.create(orderId, 'MWK', 1500);

  const app = createReleaseApp('buyer-release-payout-1');
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/escrow/${orderId}/release`, {
      method: 'POST', headers: { authorization: 'Bearer test', 'content-type': 'application/json' },
      body: JSON.stringify({ reference: 'buyer-confirmed-delivery' }),
    });

    console.log('status', response.status);
    const body = await response.json();
    console.log('body', JSON.stringify(body, null, 2));
  } finally {
    server.close();
  }
}

run();

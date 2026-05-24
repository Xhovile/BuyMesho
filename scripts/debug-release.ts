import fetch from 'node-fetch';
import express from 'express';
import { createBuyerEscrowRouter } from '../server/routes/escrow/buyerEscrowRoutes.js';
import { serverOrderService } from '../server/modules/orders/order.service.js';
import { escrowRepository } from '../server/modules/escrow/escrow.repository.js';
import { getPaymentDb } from '../server/sqlite.js';

// Minimal debug reproduction of the test
async function main() {
  process.env.PAYCHANGU_SECRET_KEY = 'test-secret-key';
  const releasePayoutOrderId = 'order-release-payout-step-3';
  const sellerId = 'seller-release-payout-1';

  // clear state
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
  serverOrderService.create({
    id: releasePayoutOrderId,
    buyerId: 'buyer-release-payout-1',
    sellerId,
    source: 'listing',
    status: 'in_escrow',
    currency: 'MWK',
    subtotal: { amount: 1500, currency: 'MWK' },
    total: { amount: 1500, currency: 'MWK' },
    items: [{ listingId: 'listing-release-payout-1', title: 'Release Item', quantity: 1, unitPrice: { amount: 1500, currency: 'MWK' } }],
    createdAt: nowStamp,
    updatedAt: nowStamp,
  });
  serverOrderService.setStatus(releasePayoutOrderId, 'in_escrow');
  escrowRepository.create(releasePayoutOrderId, 'MWK', 1500);

  // seed destination directly (simpler approach)
  db.prepare('INSERT OR REPLACE INTO sellers (uid, email, is_verified) VALUES (?, ?, 1)').run(sellerId, `${sellerId}@example.com`);
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

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/escrow/${releasePayoutOrderId}/release`, {
      method: 'POST',
      headers: { authorization: 'Bearer test', 'content-type': 'application/json' },
      body: JSON.stringify({ reference: 'buyer-confirmed-delivery' }),
    });

    console.log('Status:', response.status);
    const body = await response.json();
    console.log('Body:', JSON.stringify(body, null, 2));
  } finally {
    server.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });

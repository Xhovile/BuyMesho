import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createPaymentAdminRouter } from '../payment.admin.routes.js';
import { getPaymentDb } from '../../../postgresCompat.js';

function createAdminApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', createPaymentAdminRouter((req, _res, next) => {
    (req as express.Request & { user?: unknown }).user = {
      uid: 'admin-suspension-test',
      email: 'admin-suspension-test@example.com',
      is_admin: true,
    };
    next();
  }));
  return app;
}

async function callAdmin(path: string, options: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  const app = createAdminApp();
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: {
        authorization: 'Bearer test',
        'content-type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    });

    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    server.close();
  }
}

function cleanup() {
  const db = getPaymentDb();
  db.prepare("DELETE FROM payouts WHERE id IN ('admin-suspension-seller-payout','admin-suspension-event-payout')").run();
  db.prepare("DELETE FROM admin_actions WHERE target_id = 'admin-suspension-owner'").run();
  db.prepare("DELETE FROM sellers WHERE uid = 'admin-suspension-owner'").run();
}

test('seller payout suspension does not hold event-owned payouts sharing the compatibility seller_id', async () => {
  cleanup();

  const db = getPaymentDb();
  db.prepare("INSERT INTO sellers (uid, email, is_verified, is_suspended) VALUES ('admin-suspension-owner', 'suspension-owner@example.com', 1, 0)").run();

  db.prepare("INSERT INTO payouts (id, seller_id, owner_type, owner_uid, order_id, escrow_id, release_entry_id, amount, gross_amount, platform_fee_amount, processing_fee_amount, reserve_amount, reserve_cap_amount, manual_adjustment_amount, payout_fee_amount, seller_receives_amount, net_amount, currency, status, provider, requested_by, requested_at, created_at, updated_at) VALUES ('admin-suspension-seller-payout', 'admin-suspension-owner', 'seller', 'admin-suspension-owner', 'admin-suspension-order-seller', 'admin-suspension-escrow-seller', 'admin-suspension-release-seller', 950, 1000, 50, 0, 0, 0, 0, 0, 950, 950, 'MWK', 'failed', 'paychangu', 'admin-test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").run();

  db.prepare("INSERT INTO payouts (id, seller_id, owner_type, owner_uid, event_id, event_creator_uid, order_id, escrow_id, release_entry_id, amount, gross_amount, platform_fee_amount, processing_fee_amount, reserve_amount, reserve_cap_amount, manual_adjustment_amount, payout_fee_amount, seller_receives_amount, net_amount, currency, status, provider, requested_by, requested_at, created_at, updated_at) VALUES ('admin-suspension-event-payout', 'admin-suspension-owner', 'event_creator', 'admin-suspension-owner', 998801, 'admin-suspension-owner', 'admin-suspension-order-event', 'admin-suspension-escrow-event', 'admin-suspension-release-event', 950, 1000, 50, 0, 0, 0, 0, 0, 950, 950, 'MWK', 'failed', 'paychangu', 'admin-test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").run();

  try {
    const result = await callAdmin('/api/admin/payouts/sellers/admin-suspension-owner/suspension', {
      method: 'POST',
      body: JSON.stringify({ suspended: true, reason: 'Compliance review' }),
    });

    assert.equal(result.status, 200);

    const sellerPayout = db.prepare("SELECT owner_type, owner_uid, status, failure_reason, manual_review_reason FROM payouts WHERE id = 'admin-suspension-seller-payout'").get() as { owner_type: string; owner_uid: string; status: string; failure_reason: string; manual_review_reason: string };
    const eventPayout = db.prepare("SELECT owner_type, owner_uid, status, failure_reason, manual_review_reason FROM payouts WHERE id = 'admin-suspension-event-payout'").get() as { owner_type: string; owner_uid: string; status: string; failure_reason: string | null; manual_review_reason: string | null };

    assert.deepEqual(sellerPayout, {
      owner_type: 'seller',
      owner_uid: 'admin-suspension-owner',
      status: 'held',
      failure_reason: 'seller_suspended',
      manual_review_reason: 'Compliance review',
    });

    assert.deepEqual(eventPayout, {
      owner_type: 'event_creator',
      owner_uid: 'admin-suspension-owner',
      status: 'failed',
      failure_reason: null,
      manual_review_reason: null,
    });

    const seller = db.prepare("SELECT is_suspended FROM sellers WHERE uid = 'admin-suspension-owner'").get() as { is_suspended: number };
    assert.equal(seller.is_suspended, 1);
  } finally {
    cleanup();
  }
});

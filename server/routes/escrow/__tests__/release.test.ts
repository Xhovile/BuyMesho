import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createEscrowRouter } from '../../escrowRoutes.js';
import { getPaymentDb } from '../../../sqlite.js';
import { escrowRepository } from '../../../modules/escrow/escrow.repository.js';
import { orderRepository } from '../../../modules/orders/order.repository.js';
import { serverOrderService } from '../../../modules/orders/order.service.js';
import { payoutRepository } from '../../../modules/payouts/payout.service.js';

const releasePayoutOrderId = 'order-release-payout-step-3';

function createReleaseApp(uid: string, isAdmin = false): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/escrow', createEscrowRouter((req, _res, next) => {
    (req as express.Request & { user?: unknown }).user = {
      uid,
      email: `${uid}@example.com`,
      is_admin: isAdmin,
    };
    next();
  }));
  return app;
}

function clearReleasePayoutState(): void {
  const db = getPaymentDb();
  db.prepare('DELETE FROM payouts WHERE order_id = ?').run(releasePayoutOrderId);
  db.prepare('DELETE FROM escrows WHERE order_id = ?').run(releasePayoutOrderId);
  db.prepare('DELETE FROM orders WHERE id = ?').run(releasePayoutOrderId);
}

function countPayoutsForOrder(orderId: string): number {
  const row = getPaymentDb()
    .prepare('SELECT COUNT(*) AS count FROM payouts WHERE order_id = ?')
    .get(orderId) as { count: number };
  return row.count;
}

test('release endpoint creates an eligible payout candidate linked to the released escrow', async () => {
  clearReleasePayoutState();

  const now = new Date().toISOString();
  serverOrderService.create({
    id: releasePayoutOrderId,
    buyerId: 'buyer-release-payout-1',
    sellerId: 'seller-release-payout-1',
    source: 'listing',
    status: 'in_escrow',
    currency: 'MWK',
    subtotal: { amount: 1500, currency: 'MWK' },
    total: { amount: 1500, currency: 'MWK' },
    items: [{ listingId: 'listing-release-payout-1', title: 'Release Item', quantity: 1, unitPrice: { amount: 1500, currency: 'MWK' } }],
    createdAt: now,
    updatedAt: now,
  });
  escrowRepository.create(releasePayoutOrderId, 'MWK', 1500);

  const app = createReleaseApp('buyer-release-payout-1');
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/escrow/${releasePayoutOrderId}/release`, {
      method: 'POST',
      headers: { authorization: 'Bearer test', 'content-type': 'application/json' },
      body: JSON.stringify({ reference: 'buyer-confirmed-delivery' }),
    });

    assert.equal(response.status, 200, 'release should return 200');
    const body = await response.json() as {
      escrow?: { id?: string; state?: string; entries?: Array<{ id: string; entryType: string; actorId?: string; reference?: string }> };
      payout?: {
        id?: string;
        sellerId?: string;
        orderId?: string;
        escrowId?: string;
        releaseEntryId?: string;
        amount?: number;
        currency?: string;
        status?: string;
        provider?: string;
        providerChargeId?: string | null;
        requestedBy?: string;
      };
    };

    const releaseEntry = body.escrow?.entries?.find((entry) => entry.entryType === 'release');
    assert.ok(body.escrow?.id, 'release response should include escrow');
    assert.equal(body.escrow?.state, 'released', 'escrow should be released');
    assert.equal(releaseEntry?.actorId, 'buyer-release-payout-1', 'release ledger should retain requester audit actor');
    assert.equal(releaseEntry?.reference, 'buyer-confirmed-delivery', 'release ledger should retain requester reference');
    assert.equal(body.payout?.sellerId, 'seller-release-payout-1', 'payout should belong to the order seller');
    assert.equal(body.payout?.orderId, releasePayoutOrderId, 'payout should link to the order');
    assert.equal(body.payout?.escrowId, body.escrow?.id, 'payout should link to the escrow');
    assert.equal(body.payout?.releaseEntryId, releaseEntry?.id, 'payout should link to the release ledger entry');
    assert.equal(body.payout?.amount, 1470, 'payout should use the server-side net payout formula');
    assert.equal(body.payout?.currency, 'MWK', 'payout should use the escrow currency');
    assert.equal(body.payout?.status, 'eligible', 'payout should start eligible without calling PayChangu');
    assert.equal(body.payout?.provider, 'paychangu', 'payout should be prepared for PayChangu');
    assert.equal(body.payout?.providerChargeId, null, 'payout candidates should not reserve a PayChangu charge id before a provider attempt');
    assert.equal(body.payout?.requestedBy, 'buyer-release-payout-1', 'payout should record the releasing buyer as requester');

    assert.equal(countPayoutsForOrder(releasePayoutOrderId), 1, 'release should persist exactly one payout candidate');
    const savedPayout = payoutRepository.findByEscrowId(body.escrow.id);
    assert.equal(savedPayout?.id, body.payout?.id, 'payout should be persisted for the escrow');
    assert.equal(savedPayout?.releaseEntryId, releaseEntry?.id, 'stored payout should link to release ledger entry');
    assert.equal(orderRepository.findById(releasePayoutOrderId)?.status, 'fulfilled', 'release should fulfill the order');
  } finally {
    server.close();
    clearReleasePayoutState();
  }
});

test('release endpoint rejects sellers without releasing escrow or creating payouts', async () => {
  clearReleasePayoutState();

  const now = new Date().toISOString();
  serverOrderService.create({
    id: releasePayoutOrderId,
    buyerId: 'buyer-release-payout-1',
    sellerId: 'seller-release-payout-1',
    source: 'listing',
    status: 'pending_payment',
    currency: 'MWK',
    subtotal: { amount: 1500, currency: 'MWK' },
    total: { amount: 1500, currency: 'MWK' },
    items: [{ listingId: 'listing-release-payout-1', title: 'Release Item', quantity: 1, unitPrice: { amount: 1500, currency: 'MWK' } }],
    createdAt: now,
    updatedAt: now,
  });
  escrowRepository.create(releasePayoutOrderId, 'MWK', 1500);

  const app = createReleaseApp('seller-release-payout-1');
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/escrow/${releasePayoutOrderId}/release`, {
      method: 'POST',
      headers: { authorization: 'Bearer test', 'content-type': 'application/json' },
      body: JSON.stringify({ reference: 'seller-should-not-release' }),
    });

    assert.equal(response.status, 403, 'seller should not be allowed to release escrow for their own order');
    const body = await response.json() as { error?: string };
    assert.equal(body.error, 'Only the buyer or an admin can release escrow for this order');
    assert.equal(escrowRepository.findByOrderId(releasePayoutOrderId)?.state, 'funded', 'escrow should remain funded');
    assert.equal(countPayoutsForOrder(releasePayoutOrderId), 0, 'seller release attempt should not create a payout candidate');
    assert.equal(orderRepository.findById(releasePayoutOrderId)?.status, 'pending_payment', 'seller release attempt should not fulfill the order');
  } finally {
    server.close();
    clearReleasePayoutState();
  }
});

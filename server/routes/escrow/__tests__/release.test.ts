import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import express from 'express';
import { createEscrowRouter } from '../../escrowRoutes.js';
import { getPaymentDb } from '../../../sqlite.js';
import { escrowRepository } from '../../../modules/escrow/escrow.repository.js';
import { orderRepository } from '../../../modules/orders/order.repository.js';
import { serverOrderService } from '../../../modules/orders/order.service.js';
import { payoutRepository } from '../../../modules/payouts/payout.service.js';

const releasePayoutOrderId = 'order-release-payout-step-3';
const sellerId = 'seller-release-payout-1';
const destinationId = 'destination-release-payout-1';

const originalFetch = global.fetch;
const originalEnv = {
  PAYCHANGU_PAYOUT_BASE_URL: process.env.PAYCHANGU_PAYOUT_BASE_URL,
  PAYCHANGU_BASE_URL: process.env.PAYCHANGU_BASE_URL,
  PAYCHANGU_SECRET_KEY: process.env.PAYCHANGU_SECRET_KEY,
  PAYCHANGU_MOBILE_MONEY_PAYOUT_PATH: process.env.PAYCHANGU_MOBILE_MONEY_PAYOUT_PATH,
  PAYCHANGU_BANK_PAYOUT_PATH: process.env.PAYCHANGU_BANK_PAYOUT_PATH,
  PAYCHANGU_PAYOUT_STATUS_PATH: process.env.PAYCHANGU_PAYOUT_STATUS_PATH,
  PAYCHANGU_MOBILE_MONEY_PATH: process.env.PAYCHANGU_MOBILE_MONEY_PATH,
  PAYCHANGU_BANKS_PATH: process.env.PAYCHANGU_BANKS_PATH,
};

type CapturedRequest = {
  url: string;
  method: string;
  authorization: string | null;
  body: Record<string, unknown>;
};

function now(): string {
  return new Date().toISOString();
}

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

function resetPayChanguState(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  global.fetch = originalFetch;
}

function useDefaultPayChanguEnv(): void {
  delete process.env.PAYCHANGU_PAYOUT_BASE_URL;
  delete process.env.PAYCHANGU_BASE_URL;
  delete process.env.PAYCHANGU_MOBILE_MONEY_PAYOUT_PATH;
  delete process.env.PAYCHANGU_BANK_PAYOUT_PATH;
  delete process.env.PAYCHANGU_PAYOUT_STATUS_PATH;
  delete process.env.PAYCHANGU_MOBILE_MONEY_PATH;
  delete process.env.PAYCHANGU_BANKS_PATH;
  process.env.PAYCHANGU_SECRET_KEY = 'test-secret-key';
}

function mockPayChanguFetch(): CapturedRequest[] {
  const requests: CapturedRequest[] = [];

  global.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const headers = new Headers(init?.headers);
    const method = init?.method ?? 'GET';

    const parsedUrl = new URL(url);

    // Forward any non-PayChangu requests (e.g., calls to the local test server)
    // to the original fetch implementation so tests can contact the server.
    const host = parsedUrl.hostname || '';
    if (!host.includes('paychangu') && !host.includes('api.paychangu.com')) {
      return originalFetch(input, init);
    }

    requests.push({
      url,
      method,
      authorization: headers.get('authorization'),
      body: init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {},
    });

    if (method === 'GET' && parsedUrl.pathname === '/wallet-balance') {
      return new Response(JSON.stringify({
        data: {
          main_balance: 5000,
          currency: 'MWK',
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (
      method === 'POST' &&
      parsedUrl.pathname === '/mobile-money/payouts/initialize'
    ) {
      return new Response(JSON.stringify({
        status: 'success',
        data: {
          transaction: {
            status: 'pending',
            ref_id: 'mobile-ref',
            trans_id: 'mobile-trans',
          },
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (
      method === 'POST' &&
      parsedUrl.pathname === '/direct-charge/payouts/initialize'
    ) {
      return new Response(JSON.stringify({
        status: 'success',
        data: {
          transaction: {
            status: 'pending',
            ref_id: 'bank-ref',
            trans_id: 'bank-trans',
          },
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ status: 'success', data: {} }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  return requests;
}

function clearReleasePayoutState(): void {
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
}

function seedVerifiedDestination(): void {
  const db = getPaymentDb();
  const stamp = now();

  db.prepare('INSERT OR REPLACE INTO sellers (uid, email, is_verified) VALUES (?, ?, 1)')
    .run(sellerId, `${sellerId}@example.com`);

  db.prepare(
    `INSERT INTO seller_payout_accounts (
      id, seller_uid, destination_type, provider_name, provider_ref_id,
      currency, account_name, mobile_encrypted, masked_account, destination_fingerprint,
      is_default, verification_status, verification_attempts, is_active, created_at, updated_at
    ) VALUES (?, ?, 'mobile_money', 'paychangu', 'airtel-money', 'MWK', 'Release Test', '0990000000', '****0000', ?, 1, 'verified', 0, 1, ?, ?)`,
  ).run(destinationId, sellerId, randomUUID(), stamp, stamp);
}

function countPayoutAttempts(payoutId: string): number {
  const row = getPaymentDb()
    .prepare('SELECT COUNT(*) AS count FROM payout_attempts WHERE payout_id = ?')
    .get(payoutId) as { count: number };
  return row.count;
}

function countPayoutsForOrder(orderId: string): number {
  const row = getPaymentDb()
    .prepare('SELECT COUNT(*) AS count FROM payouts WHERE order_id = ?')
    .get(orderId) as { count: number };
  return row.count;
}

test('release endpoint creates an eligible payout candidate and dispatches it to PayChangu', async () => {
  clearReleasePayoutState();
  useDefaultPayChanguEnv();
  const requests = mockPayChanguFetch();

  const nowStamp = now();
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
  seedVerifiedDestination();

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
        providerStatus?: string | null;
        requestedBy?: string;
      };
      payoutEligibility?: { eligible?: boolean; reason?: string };
      payoutDispatch?: {
        reasonCode?: string | null;
        reason?: string;
        nextAction?: string;
        attempt?: {
          id?: string;
          attemptNo?: number;
          provider?: string;
          providerChargeId?: string;
          providerReference?: string;
          providerTransactionId?: string | null;
          status?: string;
        } | null;
        execution?: {
          provider?: string;
          providerChargeId?: string;
          providerReference?: string;
          providerTransactionId?: string | null;
          status?: string;
          processedAt?: string;
        } | null;
      };
    };

    const releaseEntry = body.escrow?.entries?.find((entry) => entry.entryType === 'release');

    assert.ok(body.escrow?.id, 'release response should include escrow');
    assert.equal(body.escrow?.state, 'released', 'escrow should be released');
    assert.equal(releaseEntry?.actorId, 'buyer-release-payout-1', 'release ledger should retain requester audit actor');
    assert.equal(releaseEntry?.reference, 'buyer-confirmed-delivery', 'release ledger should retain requester reference');
    assert.equal(body.payout?.sellerId, sellerId, 'payout should belong to the order seller');
    assert.equal(body.payout?.orderId, releasePayoutOrderId, 'payout should link to the order');
    assert.equal(body.payout?.escrowId, body.escrow?.id, 'payout should link to the escrow');
    assert.equal(body.payout?.releaseEntryId, releaseEntry?.id, 'payout should link to the release ledger entry');
    assert.equal(body.payout?.amount, 1455, 'payout should use the server-side net payout formula');
    assert.equal(body.payout?.currency, 'MWK', 'payout should use the escrow currency');
    assert.equal(body.payout?.status, 'pending', 'payout should advance beyond eligible after dispatch');
    assert.equal(body.payout?.provider, 'paychangu', 'payout should be prepared for PayChangu');
    assert.equal(body.payout?.providerStatus, 'pending', 'payout should reflect the provider pending status');
    assert.equal(body.payout?.requestedBy, 'buyer-release-payout-1', 'payout should record the releasing buyer as requester');

    assert.equal(body.payoutDispatch?.nextAction, 'awaiting_provider', 'dispatch should report awaiting provider');
    assert.equal(body.payoutDispatch?.reasonCode, null, 'dispatch should not report an error code');
    assert.equal(body.payoutDispatch?.attempt?.status, 'pending', 'attempt should be marked pending');
    assert.equal(body.payoutDispatch?.execution?.status, 'pending', 'execution should be marked pending');

    assert.equal(requests.length, 2, 'release should check provider balance and submit one payout request');
    assert.equal(requests[0]?.url, 'https://api.paychangu.com/wallet-balance?currency=MWK');
    assert.equal(requests[0]?.method, 'GET');
    assert.equal(requests[0]?.authorization, 'Bearer test-secret-key');

    const expectedChargeId = `BM-PO-${body.payout?.id}-A01`;
    assert.equal(requests[1]?.url, 'https://api.paychangu.com/mobile-money/payouts/initialize');
    assert.equal(requests[1]?.method, 'POST');
    assert.equal(requests[1]?.authorization, 'Bearer test-secret-key');
    assert.deepEqual(requests[1]?.body, {
      mobile: '0990000000',
      mobile_money_operator_ref_id: 'airtel-money',
      currency: 'MWK',
      amount: '1455',
      charge_id: expectedChargeId,
    });

    assert.equal(countPayoutsForOrder(releasePayoutOrderId), 1, 'release should persist exactly one payout candidate');
    assert.equal(countPayoutAttempts(body.payout?.id ?? ''), 1, 'release should create one payout attempt');

    const savedPayout = payoutRepository.findByEscrowId(body.escrow?.id ?? '');
    assert.equal(savedPayout?.id, body.payout?.id, 'payout should be persisted for the escrow');
    assert.equal(savedPayout?.releaseEntryId, releaseEntry?.id, 'stored payout should link to release ledger entry');

    const formulaRow = getPaymentDb()
      .prepare(`SELECT gross_amount, platform_fee_amount, processing_fee_amount, reserve_amount, reserve_cap_amount,
                       manual_adjustment_amount, net_amount, formula_snapshot
                FROM payouts
                WHERE id = ?`)
      .get(body.payout?.id) as {
        gross_amount: number | null;
        platform_fee_amount: number | null;
        processing_fee_amount: number | null;
        reserve_amount: number | null;
        reserve_cap_amount: number | null;
        manual_adjustment_amount: number | null;
        net_amount: number | null;
        formula_snapshot: string | null;
      };

    assert.equal(formulaRow.gross_amount, 1500, 'payout should persist the gross formula amount');
    assert.equal(formulaRow.platform_fee_amount, 45, 'payout should persist the platform fee formula amount');
    assert.equal(formulaRow.processing_fee_amount, 0, 'payout should persist the processing fee formula amount');
    assert.equal(formulaRow.reserve_amount, 0, 'payout should persist the reserve formula amount');
    assert.equal(formulaRow.reserve_cap_amount, 90, 'payout should persist the reserve cap formula amount');
    assert.equal(formulaRow.manual_adjustment_amount, 0, 'payout should persist the manual adjustment formula amount');
    assert.equal(formulaRow.net_amount, 1455, 'payout should persist the net formula amount');
    assert.deepEqual(JSON.parse(formulaRow.formula_snapshot ?? '{}'), {
      grossAmount: 1500,
      platformFeeAmount: 45,
      processingFeeAmount: 0,
      reserveAmount: 0,
      reserveCapAmount: 90,
      manualAdjustmentAmount: 0,
      netAmount: 1455,
      currency: 'MWK',
    });
    assert.equal(orderRepository.findById(releasePayoutOrderId)?.status, 'fulfilled', 'release should fulfill the order');
  } finally {
    server.close();
    resetPayChanguState();
    clearReleasePayoutState();
  }
});

test('release endpoint rejects sellers without releasing escrow or creating payouts', async () => {
  clearReleasePayoutState();
  useDefaultPayChanguEnv();

  const nowStamp = now();
  serverOrderService.create({
    id: releasePayoutOrderId,
    buyerId: 'buyer-release-payout-1',
    sellerId: sellerId,
    source: 'listing',
    status: 'pending_payment',
    currency: 'MWK',
    subtotal: { amount: 1500, currency: 'MWK' },
    total: { amount: 1500, currency: 'MWK' },
    items: [{ listingId: 'listing-release-payout-1', title: 'Release Item', quantity: 1, unitPrice: { amount: 1500, currency: 'MWK' } }],
    createdAt: nowStamp,
    updatedAt: nowStamp,
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
    resetPayChanguState();
    clearReleasePayoutState();
  }
});

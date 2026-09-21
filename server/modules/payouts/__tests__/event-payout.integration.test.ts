import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { getPaymentDb } from '../../../postgresCompat.js';
import { createEventPayoutCandidateAsync, resolveEventPayoutContext } from '../event-payout.integration.js';
import { payoutService } from '../payout.service.js';
import { withTransaction } from '../../../postgres.js';

const db = getPaymentDb();

afterEach(cleanup);

function cleanup() {
  db.prepare("DELETE FROM payout_attempts WHERE payout_id LIKE 'event-payout-test-%'").run();
  db.prepare("DELETE FROM payout_events WHERE payout_id LIKE 'event-payout-test-%'").run();
  db.prepare("DELETE FROM payouts WHERE id LIKE 'event-payout-test-%' OR escrow_id = 'event-payout-test-escrow'").run();
  db.prepare("DELETE FROM event_tickets WHERE order_id = 'event-payout-test-order'").run();
  db.prepare("DELETE FROM escrows WHERE id = 'event-payout-test-escrow'").run();
  db.prepare("DELETE FROM orders WHERE id = 'event-payout-test-order'").run();
  db.prepare("DELETE FROM events WHERE id = 992001").run();
  db.prepare("DELETE FROM seller_payout_accounts WHERE id = 'event-payout-test-destination'").run();
  db.prepare("DELETE FROM event_creators WHERE uid = 'event_payout_test_creator'").run();
}

function seed() {
  cleanup();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO event_creators (uid,email,display_name,organization_name,organization_type,event_types,status,created_at,updated_at)
    VALUES ('event_payout_test_creator','creator@example.com','Creator','Test Org','events','concert','approved',?,?)
  `).run(now, now);

  db.prepare(`
    INSERT INTO seller_payout_accounts (
      id, seller_uid, event_creator_uid, owner_type, owner_uid,
      destination_type, provider_name, provider_ref_id, currency, account_name,
      account_number_encrypted, mobile_encrypted, masked_account, destination_fingerprint,
      is_default, verification_status, verification_attempts, last_error, verified_at,
      replaced_from_id, replaced_by_id, is_active, created_at, updated_at
    ) VALUES (
      'event-payout-test-destination', NULL, 'event_payout_test_creator', 'event_creator', 'event_payout_test_creator',
      'mobile_money', 'Airtel Money', 'airtel_money', 'MWK', 'Creator',
      NULL, '0999999999', '******9999', 'event-payout-test-fingerprint',
      1, 'verified', 0, NULL, ?, NULL, NULL, 1, ?, ?
    )
  `).run(now, now, now);

  db.prepare(`
    INSERT INTO events (
      id, creator_uid, event_type, event_title, organizer_name, event_date, start_time,
      venue, location, ticket_mode, ticket_price, description, spec_values, status,
      payout_destination_id, created_at, updated_at
    ) VALUES (
      992001, 'event_payout_test_creator', 'concert', 'Payout Event', 'Creator', '2026-09-20', '18:00',
      'Test Venue', 'Lilongwe', 'paid', 10000, 'Test event', '{}', 'published',
      'event-payout-test-destination', ?, ?
    )
  `).run(now, now);

  db.prepare(`
    INSERT INTO orders (
      id,buyer_id,seller_id,source,status,currency,subtotal_amount,subtotal_currency,
      fees_amount,fees_currency,total_amount,total_currency,payment_provider,payment_reference,
      items,created_at,updated_at,paid_at
    ) VALUES (
      'event-payout-test-order','buyer','event_payout_test_creator','event','paid','MWK',10000,'MWK',0,'MWK',10000,'MWK',
      'paychangu','REF-EVENT-PAYOUT','[{"kind":"event_ticket","eventId":"992001","quantity":1,"unitPrice":{"amount":10000}}]',?,?,?
    )
  `).run(now, now, now);
}

test('event payout context resolves the event-bound verified destination', async () => {
  seed();
  await withTransaction(async (client) => {
    const context = await resolveEventPayoutContext('event-payout-test-order', client);
    assert.equal(context?.eventId, '992001');
    assert.equal(context?.eventCreatorUid, 'event_payout_test_creator');
    assert.equal(context?.destinationAccountId, 'event-payout-test-destination');
    assert.equal(context?.payoutMethod, 'airtel_money');
  });
  cleanup();
});

test('event payout context rejects orders that mix event tickets with listing items', async () => {
  seed();

  const dbRow = db.prepare('SELECT items FROM orders WHERE id = ?').get('event-payout-test-order') as { items: string };
  const mixedItems = JSON.stringify([
    ...JSON.parse(dbRow.items),
    {
      kind: 'listing',
      listingId: 'listing-992001',
      title: 'Marketplace item',
      quantity: 1,
      unitPrice: { amount: 5000, currency: 'MWK' },
    },
  ]);

  db.prepare('UPDATE orders SET items = ? WHERE id = ?').run(mixedItems, 'event-payout-test-order');

  await assert.rejects(
    withTransaction((client) => resolveEventPayoutContext('event-payout-test-order', client)),
    /event tickets and non-event items cannot be settled as one payout/,
  );

  cleanup();
});

test('event payout replay uses the stored immutable fee snapshot', async () => {
  seed();
  const now = new Date().toISOString();
  const storedSnapshot = {
    formulaVersion: 'event-payout-v1',
    scope: 'event',
    eventId: '992001',
    currency: 'MWK',
    inputs: {
      grossAmount: 10000,
      processingFeeAmount: 250,
      reserveAmount: 100,
      manualAdjustmentAmount: 0,
      payoutMethod: 'airtel_money',
    },
    policy: {
      platformFeeBps: 300,
      payoutFeeBps: { airtel_money: 180, tnm_mpamba: 150, bank_transfer: 170 },
      bankPayoutFlatFeeAmount: 700,
    },
    result: {
      grossAmount: 10000,
      platformFeeAmount: 300,
      processingFeeAmount: 250,
      reserveAmount: 100,
      reserveCapAmount: 600,
      manualAdjustmentAmount: 0,
      payoutFeeAmount: 180,
      sellerReceivesAmount: 9170,
      netAmount: 9170,
    },
  };

  db.prepare(`
    INSERT INTO payouts (
      id, seller_id, event_id, event_creator_uid, order_id, escrow_id, release_entry_id,
      destination_account_id, amount, gross_amount, platform_fee_amount, processing_fee_amount,
      reserve_amount, reserve_cap_amount, manual_adjustment_amount, payout_fee_amount,
      seller_receives_amount, net_amount, formula_snapshot, currency, status, provider,
      provider_charge_id, requested_by, requested_at, created_at, updated_at
    ) VALUES (
      'event-payout-test-replay', 'event_payout_test_creator', 992001, 'event_payout_test_creator',
      'event-payout-test-order', NULL, NULL,
      'event-payout-test-destination', 9170, 10000, 300, 250, 100, 600, 0, 180,
      9170, 9170, ?, 'MWK', 'pending_settlement', 'paychangu', NULL, 'event_payout_test_creator', ?, ?, ?
    )
  `).run(JSON.stringify(storedSnapshot), now, now, now);

  await withTransaction(async (client) => {
    const context = await resolveEventPayoutContext('event-payout-test-order', client);
    assert.ok(context);

    const result = await createEventPayoutCandidateAsync({
      orderId: 'event-payout-test-order',
      event: context,
      grossAmount: 15000,
      currency: 'MWK',
      requestedBy: 'event_payout_test_creator',
      requestedAt: now,
    }, client);

    assert.equal(result.created, false);
    assert.equal(result.payoutFormula.processingFeeAmount, 250);
    assert.equal(result.payoutFormula.reserveAmount, 100);
    assert.equal(result.payoutFormula.netAmount, 9170);
    assert.equal(result.formulaSnapshot.inputs.grossAmount, 10000);
    assert.equal(result.formulaSnapshot.inputs.processingFeeAmount, 250);
    assert.equal(result.formulaSnapshot.result.netAmount, 9170);
  });

  cleanup();
});

test('event payout candidate rejects an existing payout with a different financial owner identity', async () => {
  seed();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO payouts (
      id, seller_id, owner_type, owner_uid, order_id, escrow_id, release_entry_id,
      amount, gross_amount, platform_fee_amount, processing_fee_amount, reserve_amount, reserve_cap_amount,
      manual_adjustment_amount, payout_fee_amount, seller_receives_amount, net_amount, formula_snapshot,
      currency, status, provider, requested_by, requested_at, created_at, updated_at
    ) VALUES (
      'event-payout-conflicting-owner', 'event_payout_test_creator', 'seller', 'event_payout_test_creator',
      'event-payout-test-order', NULL, NULL,
      9700, 10000, 300, 0, 0, 0, 0, 0, 9700, 9700, '{}',
      'MWK', 'pending_settlement', 'paychangu', 'system', ?, ?, ?
    )
  `).run(now, now, now);

  await withTransaction(async (client) => {
    const context = await resolveEventPayoutContext('event-payout-test-order', client);
    assert.ok(context);

    await assert.rejects(
      () => createEventPayoutCandidateAsync({
        orderId: 'event-payout-test-order',
        event: context,
        grossAmount: 10000,
        currency: 'MWK',
        requestedBy: 'event_payout_test_creator',
        requestedAt: now,
      }, client),
      /Existing event payout does not match the event payout financial identity/,
    );
  });
});

test('event payout candidate stores event identity, bound destination, and immutable fee snapshot without escrow', async () => {
  seed();
  const now = new Date().toISOString();

  await withTransaction(async (client) => {
    const context = await resolveEventPayoutContext('event-payout-test-order', client);
    assert.ok(context);

    const result = await createEventPayoutCandidateAsync({
      orderId: 'event-payout-test-order',
      escrowId: 'event-payout-test-escrow',
      releaseEntryId: 'event-payout-test-release',
      event: context,
      grossAmount: 10000,
      currency: 'MWK',
      requestedBy: 'event_payout_test_creator',
      requestedAt: now,
    }, client);

    assert.equal(result.created, true);
    assert.equal(result.payout.ownerType, 'event_creator');
    assert.equal(result.payout.ownerUid, 'event_payout_test_creator');
    assert.equal(result.payout.eventId, '992001');
    assert.equal(result.payout.eventCreatorUid, 'event_payout_test_creator');
    assert.equal(result.payout.destinationAccountId, 'event-payout-test-destination');
    assert.equal(result.payout.escrowId, null);
    assert.equal(result.payout.releaseEntryId, null);
    assert.equal(result.payout.status, 'eligible');
    assert.equal(result.payout.amount, 9520);
    assert.equal(result.payoutFormula.platformFeeAmount, 300);
    assert.equal(result.payoutFormula.payoutFeeAmount, 180);
    assert.equal(result.payoutFormula.netAmount, 9520);
    assert.equal(result.formulaSnapshot.scope, 'event');
    assert.equal(result.formulaSnapshot.eventId, '992001');
    assert.equal(result.formulaSnapshot.formulaVersion, 'event-payout-v1');
  });

  const genericReadRow = db.prepare(
    "SELECT id FROM payouts WHERE order_id = 'event-payout-test-order' LIMIT 1",
  ).get() as { id: string } | undefined;
  assert.ok(genericReadRow?.id);
  const genericRead = payoutService.findById(genericReadRow.id);
  assert.equal(genericRead?.eventId, '992001');
  assert.equal(genericRead?.eventCreatorUid, 'event_payout_test_creator');

  cleanup();
});

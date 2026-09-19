import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { getPaymentDb } from '../../../postgresCompat.js';
import { createEventPayoutCandidateAsync, resolveEventPayoutContext } from '../event-payout.integration.js';
import { withTransaction } from '../../../postgres.js';

const db = getPaymentDb();

function cleanup() {
  db.prepare("DELETE FROM payout_attempts WHERE payout_id IN (SELECT id FROM payouts WHERE order_id = 'event-payout-test-order' OR event_id = 992001)").run();
  db.prepare("DELETE FROM payouts WHERE order_id = 'event-payout-test-order' OR event_id = 992001").run();
  db.prepare("DELETE FROM orders WHERE id = 'event-payout-test-order'").run();
  db.prepare("DELETE FROM events WHERE id = 992001").run();
  db.prepare("DELETE FROM seller_payout_accounts WHERE id = 'event-payout-test-destination'").run();
  db.prepare("DELETE FROM event_creators WHERE uid = 'event_payout_test_creator'").run();
}

afterEach(cleanup);

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
      'event-payout-test-order','buyer','event_payout_test_creator','event','in_escrow','MWK',10000,'MWK',0,'MWK',10000,'MWK',
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

test('event payout candidate stores event identity, bound destination, and immutable fee snapshot', async () => {
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
    assert.equal(result.payout.amount, 9520);
    assert.equal(result.payoutFormula.platformFeeAmount, 300);
    assert.equal(result.payoutFormula.payoutFeeAmount, 180);
    assert.equal(result.payoutFormula.netAmount, 9520);
    assert.equal(result.formulaSnapshot.scope, 'event');
    assert.equal(result.formulaSnapshot.eventId, '992001');
    assert.equal(result.formulaSnapshot.formulaVersion, 'event-payout-v1');
  });

  cleanup();
});

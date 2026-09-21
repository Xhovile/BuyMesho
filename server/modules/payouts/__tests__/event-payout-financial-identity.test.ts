import assert from 'node:assert/strict';
import test from 'node:test';
import { getPaymentDb } from '../../../postgresCompat.js';

const db = getPaymentDb();

function cleanup() {
  db.prepare("DELETE FROM payouts WHERE id IN ('event-financial-identity-test')").run();
  db.prepare("DELETE FROM events WHERE id = 991101").run();
  db.prepare("DELETE FROM seller_payout_accounts WHERE id IN ('event-financial-destination-a','event-financial-destination-b')").run();
  db.prepare("DELETE FROM event_creators WHERE uid = 'event_financial_creator'").run();
}

test('event payout financial identity binds payout to event and exact event destination', () => {
  cleanup();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO event_creators
      (uid,email,display_name,organization_name,organization_type,event_types,status,active_until,created_at,updated_at)
    VALUES ('event_financial_creator','creator@example.com','Creator','Creator Org','events','concert','approved',?, ?, ?)
  `).run(new Date(Date.now() + 86400000).toISOString(), now, now);

  db.prepare(`
    INSERT INTO seller_payout_accounts (
      id,seller_uid,event_creator_uid,owner_type,owner_uid,destination_type,provider_name,provider_ref_id,
      currency,account_name,account_number_encrypted,masked_account,destination_fingerprint,
      is_default,verification_status,verification_attempts,is_active,created_at,updated_at
    ) VALUES ('event-financial-destination-a',NULL,'event_financial_creator','event_creator','event_financial_creator',
      'mobile_money','paychangu','airtel-money','MWK','Creator A','test','099***0001','event-financial-fingerprint-a',1,'verified',0,1,?,?)
  `).run(now, now);

  db.prepare(`
    INSERT INTO seller_payout_accounts (
      id,seller_uid,event_creator_uid,owner_type,owner_uid,destination_type,provider_name,provider_ref_id,
      currency,account_name,account_number_encrypted,masked_account,destination_fingerprint,
      is_default,verification_status,verification_attempts,is_active,created_at,updated_at
    ) VALUES ('event-financial-destination-b',NULL,'event_financial_creator','event_creator','event_financial_creator',
      'mobile_money','paychangu','tnm','MWK','Creator B','test','099***0002','event-financial-fingerprint-b',0,'verified',0,1,?,?)
  `).run(now, now);

  db.prepare(`
    INSERT INTO events (
      id,creator_uid,event_type,event_title,organizer_name,event_date,start_time,venue,location,ticket_mode,
      ticket_price,description,spec_values,status,payout_destination_id,created_at,updated_at
    ) VALUES (991101,'event_financial_creator','concert','Financial Identity Event','Creator','2026-10-01','18:00',
      'Venue A','Blantyre','paid',10000,'Test','{}','published','event-financial-destination-a',?,?)
  `).run(now, now);

  db.prepare(`
    INSERT INTO payouts (
      id,seller_id,event_id,event_creator_uid,order_id,escrow_id,release_entry_id,destination_account_id,
      amount,gross_amount,platform_fee_amount,processing_fee_amount,reserve_amount,reserve_cap_amount,
      manual_adjustment_amount,payout_fee_amount,seller_receives_amount,net_amount,formula_snapshot,
      currency,status,provider,requested_by,requested_at,created_at,updated_at
    ) VALUES (
      'event-financial-identity-test','event_financial_creator',991101,'event_financial_creator','event-order-991101',NULL,NULL,
      'event-financial-destination-a',8700,10000,1000,300,0,0,0,8700,8700,8700,'{}','MWK','pending_settlement','paychangu','system',?,?,?
    )
  `).run(now, now, now);

  const payout = db.prepare(`
    SELECT event_id,event_creator_uid,owner_type,owner_uid,destination_account_id
    FROM payouts
    WHERE id = 'event-financial-identity-test'
  `).get() as {
    event_id: number;
    event_creator_uid: string;
    owner_type: string;
    owner_uid: string;
    destination_account_id: string;
  };

  assert.equal(payout.event_id, 991101);
  assert.equal(payout.event_creator_uid, 'event_financial_creator');
  assert.equal(payout.owner_type, 'event_creator');
  assert.equal(payout.owner_uid, 'event_financial_creator');
  assert.equal(payout.destination_account_id, 'event-financial-destination-a');

  assert.throws(() => {
    db.prepare(`UPDATE payouts SET owner_uid = 'wrong-owner' WHERE id = 'event-financial-identity-test'`).run();
  }, /ck_payout_owner_identity|payout owner/i);

  assert.throws(() => {
    db.prepare(`UPDATE payouts SET destination_account_id = 'event-financial-destination-b' WHERE id = 'event-financial-identity-test'`).run();
  }, /Event payout destination must match the event-bound destination/);

  cleanup();
});

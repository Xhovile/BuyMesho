import assert from "node:assert/strict";
import test from "node:test";
import { getPaymentDb } from "../../../postgresCompat.js";
import { getEventFinancialReport } from "../eventFinancialReporting.js";
import { PAYOUT_POLICY } from "../../payouts/payout.policy.js";

const db = getPaymentDb();

function cleanup() {
  db.prepare("DELETE FROM payout_attempts WHERE payout_id IN ('event_financial_payout_1','event_financial_payout_failed_1')").run();
  db.prepare("DELETE FROM payouts WHERE id IN ('event_financial_payout_1','event_financial_payout_failed_1')").run();
  db.prepare("DELETE FROM refund_transactions WHERE order_id IN ('event_financial_order_1','event_financial_mixed_order_1')").run();
  db.prepare("DELETE FROM escrows WHERE order_id IN ('event_financial_order_1','event_financial_mixed_order_1')").run();
  db.prepare("DELETE FROM payments WHERE order_id IN ('event_financial_order_1','event_financial_mixed_order_1')").run();
  db.prepare("DELETE FROM event_tickets WHERE order_id IN ('event_financial_order_1','event_financial_mixed_order_1')").run();
  db.prepare("DELETE FROM orders WHERE id IN ('event_financial_order_1','event_financial_mixed_order_1')").run();
  db.prepare("DELETE FROM events WHERE id IN (992001, 992002)").run();
  db.prepare("DELETE FROM seller_payout_accounts WHERE id IN ('event_financial_destination_1','event_financial_destination_2')").run();
  db.prepare("DELETE FROM event_creators WHERE uid = 'event_financial_creator'").run();
}

test("event financial reporting uses recorded payout snapshots and preserves traceability", () => {
  cleanup();
  const now = new Date().toISOString();

  try {
  db.prepare(`
    INSERT INTO event_creators
      (uid,email,display_name,organization_name,organization_type,event_types,status,created_at,updated_at)
    VALUES ('event_financial_creator','creator@example.com','Finance Creator','Finance Org','events','concert','approved',?,?)
  `).run(now, now);



  db.prepare(`
    INSERT INTO seller_payout_accounts
      (id,seller_uid,event_creator_uid,owner_type,owner_uid,destination_type,provider_name,provider_ref_id,
       currency,account_name,account_number_encrypted,mobile_encrypted,masked_account,destination_fingerprint,
       is_default,verification_status,verification_attempts,is_active,created_at,updated_at)
    VALUES ('event_financial_destination_1',NULL,'event_financial_creator','event_creator','event_financial_creator',
            'mobile_money','Airtel Money','airtel','MWK','Finance Creator',NULL,'encrypted-mobile','0999****111',
            'event-financial-fingerprint',1,'verified',0,1,?,?)
  `).run(now, now);

  db.prepare(`
    INSERT INTO events
      (id,creator_uid,event_type,event_title,organizer_name,event_date,start_time,venue,location,
       ticket_mode,ticket_price,description,spec_values,status,payout_destination_id,created_at,updated_at)
    VALUES (992001,'event_financial_creator','concert','Financial Event','Finance Creator','2026-09-20','18:00',
            'Finance Venue','Lilongwe','paid',10000,'Test','{}','published','event_financial_destination_1',?,?)
  `).run(now, now);

  db.prepare(`
    INSERT INTO orders
      (id,buyer_id,seller_id,source,status,currency,subtotal_amount,subtotal_currency,fees_amount,fees_currency,
       total_amount,total_currency,payment_provider,payment_reference,items,created_at,updated_at,paid_at)
    VALUES ('event_financial_order_1','event-financial-buyer','event_financial_creator','event','paid','MWK',
            20000,'MWK',0,'MWK',20000,'MWK','paychangu','FIN-REF-1',
            '[{"kind":"event_ticket","eventId":"992001","quantity":2,"unitPrice":{"amount":10000}}]',?,?,?)
  `).run(now, now, now);

  db.prepare(`
    INSERT INTO payments
      (id,order_id,provider,method,status,reference,provider_reference,currency,amount,paid_at,verified,created_at,updated_at)
    VALUES ('event_financial_payment_1','event_financial_order_1','paychangu','mobile_money','captured',
            'FIN-REF-1','PROV-FIN-1','MWK',20000,?,1,?,?)
  `).run(now, now, now);

  db.prepare(`
    INSERT INTO event_tickets
      (id,event_id,order_id,code,ticket_title,ticket_type,holder_name,holder_email,holder_phone,status,
       purchase_date,updated_at,event_title,event_date,start_time,venue,location,metadata)
    VALUES
      ('event_financial_ticket_1',992001,'event_financial_order_1','FIN-TICKET-1','Financial Event','General Admission',
       'Buyer One','buyer@example.com','0999000000','Waiting Entry',?,?,'Financial Event','2026-09-20','18:00',
       'Finance Venue','Lilongwe','{}'),
      ('event_financial_ticket_2',992001,'event_financial_order_1','FIN-TICKET-2','Financial Event','General Admission',
       'Buyer Two','buyer2@example.com','0999000001','Refunded',?,?,'Financial Event','2026-09-20','18:00',
       'Finance Venue','Lilongwe','{}')
  `).run(now, now, now, now);

  db.prepare(`
    INSERT INTO refund_transactions
      (id,refund_request_id,order_id,buyer_id,seller_id,amount,currency,status,transaction_id,executed_at,created_at,updated_at)
    VALUES ('event_financial_refund_1',NULL,'event_financial_order_1','event-financial-buyer','event_financial_creator',
            5000,'MWK','refunded','RF-FIN-1',?,?,?)
  `).run(now, now, now);

  const formulaSnapshot = JSON.stringify({
    formulaVersion: 'event-payout-v1',
    scope: 'event',
    eventId: '992001',
    currency: 'MWK',
    inputs: {
      grossAmount: 20000,
      processingFeeAmount: 500,
      reserveAmount: 0,
      manualAdjustmentAmount: 0,
      payoutMethod: 'airtel_money',
    },
    policy: {
      platformFeeBps: 300,
      payoutFeeBps: { airtel_money: 180, tnm_mpamba: 150, bank_transfer: 170 },
      bankPayoutFlatFeeAmount: 700,
    },
    result: {
      grossAmount: 20000,
      platformFeeAmount: 600,
      processingFeeAmount: 500,
      reserveAmount: 0,
      reserveCapAmount: 1200,
      manualAdjustmentAmount: 0,
      payoutFeeAmount: 360,
      sellerReceivesAmount: 18540,
      netAmount: 18540,
    },
  });

  db.prepare(`
    INSERT INTO payouts
      (id,seller_id,owner_type,owner_uid,event_id,event_creator_uid,order_id,escrow_id,release_entry_id,
       destination_account_id,amount,gross_amount,platform_fee_amount,processing_fee_amount,reserve_amount,
       reserve_cap_amount,manual_adjustment_amount,payout_fee_amount,seller_receives_amount,net_amount,
       formula_snapshot,currency,status,provider,requested_by,requested_at,created_at,updated_at)
    VALUES ('event_financial_payout_1','event_financial_creator','event_creator','event_financial_creator',992001,
            'event_financial_creator','event_financial_order_1','event_financial_escrow_1','release-fin-1',
            'event_financial_destination_1',18540,20000,600,500,0,1200,0,360,18540,18540,?,
            'MWK','paid','paychangu','event_financial_creator',?,?,?)
  `).run(formulaSnapshot, now, now, now);

  db.prepare(`
    INSERT INTO payout_attempts
      (id,payout_id,attempt_no,provider,provider_charge_id,request_payload,response_payload,status,created_at,updated_at)
    VALUES ('event_financial_attempt_1','event_financial_payout_1',1,'paychangu','CHARGE-FIN-1',
            '{"providerReference":"PROVIDER-FIN-1","providerTransactionId":"TX-FIN-1"}','{"status":"success"}',
            'paid',?,?)
  `).run(now, now);

  const report = getEventFinancialReport(db, '992001');
  assert.ok(report);

  assert.equal(report.event.creatorUid, 'event_financial_creator');
  assert.equal(report.sales.ticketsSold, 2);
  assert.equal(report.sales.ticketsRefunded, 1);
  assert.equal(report.sales.grossTicketRevenue, 20000);
  assert.equal(report.sales.refundedAmount, 5000);
  assert.equal(report.sales.unallocatedRefundedAmount, 0);
  assert.equal(report.sales.netSales, 15000);

  assert.equal(report.fees.buyMeshoCommission, 600);
  assert.equal(report.fees.processingFees, 500);
  assert.equal(report.fees.reserves, 0);
  assert.equal(report.fees.payoutFees, 360);
  assert.equal(report.fees.manualAdjustments, 0);

  assert.equal(report.payouts.count, 1);
  assert.equal(report.payouts.netPaidAmount, 18540);
  assert.equal(report.payouts.netPayableAmount, 0);
  assert.equal(report.payouts.netPayoutAmount, 18540);
  assert.equal(report.payouts.byStatus.paid?.amount, 18540);

  assert.equal(report.payoutHistory[0]?.destination?.id, 'event_financial_destination_1');
  assert.equal(report.payoutHistory[0]?.attempts[0]?.providerChargeId, 'CHARGE-FIN-1');
  assert.equal(report.payoutHistory[0]?.attempts[0]?.providerReference, 'PROVIDER-FIN-1');
  assert.equal(report.payoutHistory[0]?.orderId, 'event_financial_order_1');
  assert.equal(report.payoutHistory[0]?.escrowId, 'event_financial_escrow_1');

  db.prepare(`
    INSERT INTO payouts
      (id,seller_id,owner_type,owner_uid,event_id,event_creator_uid,order_id,escrow_id,release_entry_id,
       destination_account_id,amount,gross_amount,platform_fee_amount,processing_fee_amount,reserve_amount,
       reserve_cap_amount,manual_adjustment_amount,payout_fee_amount,seller_receives_amount,net_amount,
       formula_snapshot,currency,status,provider,requested_by,requested_at,created_at,updated_at)
    VALUES ('event_financial_payout_failed_1','event_financial_creator','event_creator','event_financial_creator',992001,
            'event_financial_creator','event_financial_order_1','event_financial_escrow_1','release-fin-failed-1',
            'event_financial_destination_1',1000,1000,0,0,0,60,0,0,1000,1000,
            '{"formulaVersion":"event-payout-v1","scope":"event","eventId":"992001","currency":"MWK",
              "inputs":{"grossAmount":1000,"processingFeeAmount":0,"reserveAmount":0,"manualAdjustmentAmount":0,"payoutMethod":"airtel_money"},
              "policy":{"platformFeeBps":300,"payoutFeeBps":{"airtel_money":180},"bankPayoutFlatFeeAmount":700},
              "result":{"grossAmount":1000,"platformFeeAmount":0,"processingFeeAmount":0,"reserveAmount":0,"reserveCapAmount":60,
                        "manualAdjustmentAmount":0,"payoutFeeAmount":0,"sellerReceivesAmount":1000,"netAmount":1000}}',
            'MWK','failed','paychangu','event_financial_creator',?,?,?)
  `).run(now, now, now);

  const payoutStateReport = getEventFinancialReport(db, '992001');
  assert.ok(payoutStateReport);
  assert.equal(payoutStateReport.payouts.netPaidAmount, 18540);
  assert.equal(payoutStateReport.payouts.netPayableAmount, 1000);
  assert.equal(payoutStateReport.payouts.netPayoutAmount, 19540);
  const failedPayoutLedger = payoutStateReport.ledger.find((entry) => entry.payoutId === 'event_financial_payout_failed_1');
  assert.ok(failedPayoutLedger);
  assert.equal(failedPayoutLedger.direction, 'neutral');
  assert.equal(failedPayoutLedger.movementType, 'obligation');
  assert.equal(failedPayoutLedger.amount, 1000);

  db.prepare(`
    INSERT INTO seller_payout_accounts
      (id,seller_uid,event_creator_uid,owner_type,owner_uid,destination_type,provider_name,provider_ref_id,
       currency,account_name,account_number_encrypted,mobile_encrypted,masked_account,destination_fingerprint,
       is_default,verification_status,verification_attempts,is_active,created_at,updated_at)
    VALUES ('event_financial_destination_2',NULL,'event_financial_creator','event_creator','event_financial_creator',
            'mobile_money','TNM Mpamba','tnm','MWK','Finance Creator',NULL,'encrypted-mobile-2','0888****222',
            'event-financial-fingerprint-2',0,'verified',0,1,?,?)
  `).run(now, now);

  db.prepare("SELECT set_config('buymesho.allow_event_payout_replacement','1',false)").get();
  try {
    db.prepare("UPDATE events SET payout_destination_id = ?, updated_at = ? WHERE id = ?")
      .run('event_financial_destination_2', now, 992001);
  } finally {
    db.prepare("SELECT set_config('buymesho.allow_event_payout_replacement','0',false)").get();
  }

  const mutablePolicy = PAYOUT_POLICY as unknown as {
    platformFeeBps: number;
    payoutFeeBps: Record<string, number>;
  };
  const originalPlatformFeeBps = mutablePolicy.platformFeeBps;
  const originalAirtelFeeBps = mutablePolicy.payoutFeeBps.airtel_money;
  mutablePolicy.platformFeeBps = 900;
  mutablePolicy.payoutFeeBps.airtel_money = 999;

  let historicalReportAfterChanges;
  try {
    historicalReportAfterChanges = getEventFinancialReport(db, '992001');
  } finally {
    mutablePolicy.platformFeeBps = originalPlatformFeeBps;
    mutablePolicy.payoutFeeBps.airtel_money = originalAirtelFeeBps;
  }

  assert.ok(historicalReportAfterChanges);
  assert.equal(historicalReportAfterChanges.currentDestination?.id, 'event_financial_destination_2');
  const historicalPayout = historicalReportAfterChanges.payoutHistory.find(
    (payout) => payout.payoutId === 'event_financial_payout_1',
  );
  assert.ok(historicalPayout);
  assert.equal(historicalPayout.destination?.id, 'event_financial_destination_1');
  assert.equal(historicalReportAfterChanges.fees.buyMeshoCommission, 600);
  assert.equal(historicalReportAfterChanges.fees.payoutFees, 360);
  assert.equal(historicalPayout.netAmount, 18540);
  assert.equal(historicalPayout.formulaVersion, 'event-payout-v1');

  assert.equal(report.ledger.filter((entry) => entry.kind === 'sale').length, 1);
  assert.equal(report.ledger.filter((entry) => entry.kind === 'refund').length, 1);
  assert.equal(report.ledger.filter((entry) => entry.kind === 'payout').length, 1);



    cleanup();
  } catch (error) {
    cleanup();
    throw error;
  }
});


test("event financial reporting leaves refunds unallocated for mixed-event orders without an item link", () => {
  cleanup();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO event_creators
        (uid,email,display_name,organization_name,organization_type,event_types,status,created_at,updated_at)
      VALUES ('event_financial_creator','creator@example.com','Finance Creator','Finance Org','events','concert','approved',?,?)
    `).run(now, now);

    db.prepare(`
      INSERT INTO events
        (id,creator_uid,event_type,event_title,organizer_name,event_date,start_time,venue,location,
         ticket_mode,ticket_price,description,spec_values,status,created_at,updated_at)
      VALUES
        (992001,'event_financial_creator','concert','Financial Event A','Finance Creator','2026-09-20','18:00',
         'Finance Venue A','Lilongwe','paid',10000,'Test','{}','published',?,?),
        (992002,'event_financial_creator','concert','Financial Event B','Finance Creator','2026-09-21','18:00',
         'Finance Venue B','Lilongwe','paid',10000,'Test','{}','published',?,?)
    `).run(now, now, now, now);

    db.prepare(`
      INSERT INTO orders
        (id,buyer_id,seller_id,source,status,currency,subtotal_amount,subtotal_currency,fees_amount,fees_currency,
         total_amount,total_currency,payment_provider,payment_reference,items,created_at,updated_at,paid_at)
      VALUES ('event_financial_mixed_order_1','event-financial-buyer','event_financial_creator','event','paid','MWK',
              20000,'MWK',0,'MWK',20000,'MWK','paychangu','FIN-MIXED-REF-1',
              '[{"kind":"event_ticket","eventId":"992001","quantity":1,"unitPrice":{"amount":10000}},
                {"kind":"event_ticket","eventId":"992002","quantity":1,"unitPrice":{"amount":10000}}]',?,?,?)
    `).run(now, now, now);

    db.prepare(`
      INSERT INTO payments
        (id,order_id,provider,method,status,reference,provider_reference,currency,amount,paid_at,verified,created_at,updated_at)
      VALUES ('event_financial_mixed_payment_1','event_financial_mixed_order_1','paychangu','mobile_money','captured',
              'FIN-MIXED-REF-1','PROV-MIXED-FIN-1','MWK',20000,?,1,?,?)
    `).run(now, now, now);

    db.prepare(`
      INSERT INTO event_tickets
        (id,event_id,order_id,code,ticket_title,ticket_type,holder_name,holder_email,holder_phone,status,
         purchase_date,updated_at,event_title,event_date,start_time,venue,location,metadata)
      VALUES
        ('event_financial_mixed_ticket_1',992001,'event_financial_mixed_order_1','FIN-MIXED-TICKET-1','Financial Event A','General Admission',
         'Buyer One','buyer@example.com','0999000000','Waiting Entry',?,?,'Financial Event A','2026-09-20','18:00',
         'Finance Venue A','Lilongwe','{}'),
        ('event_financial_mixed_ticket_2',992002,'event_financial_mixed_order_1','FIN-MIXED-TICKET-2','Financial Event B','General Admission',
         'Buyer Two','buyer2@example.com','0999000001','Waiting Entry',?,?,'Financial Event B','2026-09-21','18:00',
         'Finance Venue B','Lilongwe','{}')
    `).run(now, now, now, now);

    db.prepare(`
      INSERT INTO refund_transactions
        (id,refund_request_id,order_id,buyer_id,seller_id,amount,currency,status,transaction_id,executed_at,created_at,updated_at)
      VALUES ('event_financial_mixed_refund_1',NULL,'event_financial_mixed_order_1','event-financial-buyer','event_financial_creator',
              4000,'MWK','refunded','RF-MIXED-FIN-1',?,?,?)
    `).run(now, now, now);

    const eventA = getEventFinancialReport(db, '992001');
    const eventB = getEventFinancialReport(db, '992002');

    assert.ok(eventA);
    assert.ok(eventB);
    assert.equal(eventA.sales.grossTicketRevenue, 10000);
    assert.equal(eventB.sales.grossTicketRevenue, 10000);
    assert.equal(eventA.sales.refundedAmount, 0);
    assert.equal(eventB.sales.refundedAmount, 0);
    assert.equal(eventA.sales.unallocatedRefundedAmount, 4000);
    assert.equal(eventB.sales.unallocatedRefundedAmount, 4000);
  } catch (error) {
    cleanup();
    throw error;
  }

  cleanup();
});

import { getPaymentDb } from '../server/sqlite.js';
import { serverOrderService } from '../server/modules/orders/order.service.js';
import { escrowRepository } from '../server/modules/escrow/escrow.repository.js';
import { payoutService } from '../server/modules/payouts/payout.service.js';
import { randomUUID } from 'crypto';

async function run() {
  try {
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

    escrowRepository.create(orderId, 'MWK', 1500);
    const escrow = escrowRepository.findByOrderId(orderId);
    const payoutFormula = { grossAmount: 1500, platformFeeAmount: 45, processingFeeAmount: 0, reserveAmount: 0, reserveCapAmount: 90, manualAdjustmentAmount: 0, netAmount: 1455, currency: 'MWK' };

    const payout = payoutService.createEligiblePayoutCandidate({
      sellerId,
      orderId,
      escrowId: escrow?.id ?? 'escrow-id',
      releaseEntryId: 'release-entry',
      amount: 1455,
      grossAmount: 1500,
      platformFeeAmount: 45,
      processingFeeAmount: 0,
      reserveAmount: 0,
      reserveCapAmount: 90,
      manualAdjustmentAmount: 0,
      netAmount: 1455,
      formulaSnapshot: payoutFormula,
      currency: 'MWK',
      requestedBy: 'buyer-release-payout-1',
      requestedAt: now,
      destinationAccountId: destinationId,
      snapshot: { payoutFormula, releaseAmount: 1500, releaseEntryId: 'release-entry' },
    });

    console.log('created payout', payout);
  } catch (err) {
    console.error('debug-release error:', err);
    if (err && typeof err === 'object' && 'stack' in err) {
      console.error((err as Error).stack);
    }
    process.exit(1);
  }
}

run();

import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query } from "../../../postgres.js";
import { orderRepository, type StoredOrder } from "../../orders/order.repository.js";
import { paymentRepository } from "../payment.repository.js";
import { escrowRepository } from "../../escrow/escrow.repository.js";
import { BuyMeshoPayChanguDirectCardStore } from "../paychangu.direct-card.store.js";

function createOrder(orderId: string): StoredOrder {
  const now = new Date().toISOString();
  return {
    id: orderId,
    buyerId: "direct-card-test-buyer",
    sellerId: "direct-card-test-seller",
    source: "listing",
    status: "pending_payment",
    deliveryStatus: "action_required",
    currency: "MWK",
    subtotal: { amount: 1250, currency: "MWK" },
    total: { amount: 1250, currency: "MWK" },
    paymentProvider: "paychangu",
    settlementRoute: "escrow",
    paymentReference: null,
    items: [],
    buyerDetails: null,
    placedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

async function cleanup(orderId: string): Promise<void> {
  await query("DELETE FROM paychangu_direct_card_charges WHERE order_id = $1", [orderId]);
  await query("DELETE FROM payments WHERE order_id = $1", [orderId]);
  await query("DELETE FROM escrows WHERE order_id = $1", [orderId]);
  await query("DELETE FROM orders WHERE id = $1", [orderId]);
}

test("BuyMesho Direct Card store atomically claims an order and settles through the existing settlement flow", async () => {
  const orderId = "ord_direct_card_" + randomUUID().replace(/-/g, "");
  const chargeId = "BM-CARD-" + randomUUID().replace(/-/g, "");
  const paymentReference = "PAYCHANGU-CARD-" + randomUUID().replace(/-/g, "");
  const now = new Date().toISOString();
  const store = new BuyMeshoPayChanguDirectCardStore();

  try {
    orderRepository.save(createOrder(orderId));
    const ownedOrder = await store.getOrder(orderId, "direct-card-test-buyer");
    assert.ok(ownedOrder);
    assert.equal(ownedOrder.amount, 1250);
    assert.equal(ownedOrder.currency, "MWK");
    assert.equal(await store.getOrder(orderId, "another-buyer"), null);

    const charge = await store.createPendingCharge({
      order: ownedOrder,
      id: "direct-card-record-" + randomUUID().replace(/-/g, ""),
      chargeId,
      paymentReference,
      resultUrl: "https://buymesho.app/payment/return",
      now,
    });
    assert.equal(charge.status, "pending");
    assert.equal(charge.amount, 1250);
    assert.equal(charge.currency, "MWK");
    assert.equal(orderRepository.findById(orderId)?.paymentReference, paymentReference);
    assert.equal((await paymentRepository.findByReferenceAsync(paymentReference))?.status, "pending");

    await assert.rejects(
      () => store.createPendingCharge({
        order: ownedOrder,
        id: "direct-card-record-replay-" + randomUUID().replace(/-/g, ""),
        chargeId: "BM-CARD-" + randomUUID().replace(/-/g, ""),
        paymentReference: "PAYCHANGU-CARD-" + randomUUID().replace(/-/g, ""),
        resultUrl: "https://buymesho.app/payment/return",
        now: new Date().toISOString(),
      }),
      /payment reference|eligible for a new payment/i,
    );

    const initiated = await store.recordInitiationResult(chargeId, {
      chargeId,
      status: "pending_verification",
      requires3dsAuth: false,
    });
    assert.equal(initiated.charge.status, "pending_verification");

    const providerVerified = {
      chargeId,
      verified: true,
      status: "paid" as const,
      amount: 1250,
      currency: "MWK",
    };
    const settled = await store.settleVerifiedCharge(chargeId, providerVerified);
    assert.equal(settled.charge.status, "paid");
    assert.equal(settled.payment.status, "captured");
    assert.equal(settled.payment.verified, true);
    assert.equal(orderRepository.findById(orderId)?.status, "in_escrow");
    assert.equal(escrowRepository.findByOrderId(orderId)?.balanceAmount, 1250);

    const replay = await store.settleVerifiedCharge(chargeId, providerVerified);
    assert.equal(replay.charge.status, "paid");
    assert.equal(replay.payment.status, "captured");
    assert.equal(escrowRepository.findByOrderId(orderId)?.entries.filter((entry) => entry.entryType === "credit").length, 1);

    const columns = await query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'paychangu_direct_card_charges'",
    );
    assert.equal(columns.rows.some((row) => /pan|card_number|cvv|security_code/i.test(row.column_name)), false);
  } finally {
    await cleanup(orderId);
  }
});

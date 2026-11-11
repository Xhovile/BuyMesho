import type {
  DirectCardCheckoutStore,
  DirectCardInitiationRecord,
  DirectCardOrderSnapshot,
  DirectCardPaymentSummary,
  DirectCardVerificationRecord,
  PayChanguDirectCardInitiation,
  PayChanguDirectCardVerification,
  StoredPayChanguCardCharge,
} from "@xhovile/platform/payments/direct-card/server";
import type { PoolClient } from "pg";
import type { PaymentVerificationResult } from "../../../src/modules/payments/types.js";
import { query, withTransaction } from "../../postgres.js";
import { orderRepository } from "../orders/order.repository.js";
import { paymentRepository, type StoredPayment } from "./payment.repository.js";
import { applyVerifiedPayChanguPayment } from "./paychangu.flow.js";

type DbExecutor = Pick<PoolClient, "query">;
type ChargeRow = Record<string, unknown>;
type ChargeLookupColumn = "charge_id" | "payment_reference";

function normalizeCurrency(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function isTerminalChargeStatus(status: StoredPayChanguCardCharge["status"]): boolean {
  return status === "paid" || status === "failed" || status === "cancelled" || status === "reversed";
}

function toCharge(row: ChargeRow): StoredPayChanguCardCharge {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    buyerId: String(row.buyer_id),
    paymentReference: String(row.payment_reference),
    chargeId: String(row.charge_id),
    amount: Number(row.amount),
    currency: normalizeCurrency(row.currency) as "MWK" | "USD",
    status: String(row.status) as StoredPayChanguCardCharge["status"],
    requires3dsAuth: row.requires_3ds_auth === true || Number(row.requires_3ds_auth) === 1,
    authorizationCompleted: row.authorization_completed === true || Number(row.authorization_completed) === 1,
    threeDsAuthUrl: row.three_ds_auth_url == null ? null : String(row.three_ds_auth_url),
    resultUrl: String(row.result_url),
    providerOrderReference: row.provider_order_reference == null ? null : String(row.provider_order_reference),
    lastProviderStatus: row.last_provider_status == null ? null : String(row.last_provider_status),
    failureReason: row.failure_reason == null ? null : String(row.failure_reason),
    verifiedAt: row.verified_at == null ? null : String(row.verified_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function paymentStatusForCard(payment: StoredPayment): DirectCardPaymentSummary["status"] {
  switch (payment.status) {
    case "captured":
      return "captured";
    case "requires_action":
      return "requires_action";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "refunded":
      return "reversed";
    case "authorized":
      return "pending_verification";
    default:
      return "pending";
  }
}

function toPaymentSummary(payment: StoredPayment): DirectCardPaymentSummary {
  return {
    id: payment.id,
    reference: payment.reference,
    orderId: payment.orderId,
    status: paymentStatusForCard(payment),
    verified: Boolean(payment.verified),
  };
}

function toPaymentVerification(
  charge: StoredPayChanguCardCharge,
  result: PayChanguDirectCardVerification,
  verified: boolean,
): PaymentVerificationResult {
  return {
    verified,
    provider: "paychangu",
    txRef: charge.paymentReference,
    reference: charge.paymentReference,
    orderId: charge.orderId,
    status: verified ? "captured" : result.status === "failed" || result.status === "reversed" ? "failed" : "pending",
    failureReason: result.failureReason?.slice(0, 500),
    currency: result.currency,
    amount: result.amount !== undefined && result.currency
      ? { amount: result.amount, currency: normalizeCurrency(result.currency) }
      : undefined,
    checkoutUrl: charge.threeDsAuthUrl,
  };
}

async function findCharge(
  executor: DbExecutor,
  column: ChargeLookupColumn,
  value: string,
  lock = false,
): Promise<StoredPayChanguCardCharge | null> {
  const result = await executor.query<ChargeRow>(
    `SELECT * FROM paychangu_direct_card_charges WHERE ${column} = $1 LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [value],
  );
  return result.rows[0] ? toCharge(result.rows[0]) : null;
}

export class BuyMeshoPayChanguDirectCardStore implements DirectCardCheckoutStore {
  async getOrder(orderId: string, buyerId: string): Promise<DirectCardOrderSnapshot | null> {
    const order = await orderRepository.findByIdAsync(orderId);
    if (!order || order.buyerId !== buyerId) return null;
    return {
      id: order.id,
      buyerId: order.buyerId,
      status: order.status,
      amount: Number(order.total.amount),
      currency: normalizeCurrency(order.total.currency || order.currency) as "MWK" | "USD",
      paymentReference: order.paymentReference ?? null,
    };
  }

  async createPendingCharge(input: {
    order: DirectCardOrderSnapshot;
    id: string;
    chargeId: string;
    paymentReference: string;
    resultUrl: string;
    now: string;
  }): Promise<StoredPayChanguCardCharge> {
    return withTransaction(async (client) => {
      const locked = await client.query<ChargeRow>(
        `SELECT id, buyer_id, status, payment_reference, total_amount, total_currency, currency
           FROM orders
          WHERE id = $1
          FOR UPDATE`,
        [input.order.id],
      );
      const order = locked.rows[0];
      if (!order || String(order.buyer_id) !== input.order.buyerId) {
        throw new Error("Order not found or not owned by the authenticated buyer.");
      }
      if (String(order.status) !== "pending_payment") {
        throw new Error("Order is not eligible for a new payment.");
      }
      if (String(order.payment_reference ?? "").trim()) {
        throw new Error("Order already has a payment reference; use the existing checkout.");
      }

      const amount = Number(order.total_amount);
      const currency = normalizeCurrency(order.total_currency ?? order.currency);
      if (amount !== input.order.amount || currency !== normalizeCurrency(input.order.currency)) {
        throw new Error("Order amount or currency changed during checkout; restart checkout.");
      }
      if (!Number.isFinite(amount) || amount <= 0 || (currency !== "MWK" && currency !== "USD")) {
        throw new Error("Stored order has an unsupported payment amount or currency.");
      }

      const claimed = await client.query(
        `UPDATE orders
            SET payment_reference = $1, payment_provider = 'paychangu', updated_at = $2
          WHERE id = $3 AND buyer_id = $4 AND status = 'pending_payment'
            AND (payment_reference IS NULL OR btrim(payment_reference) = '')
        RETURNING id`,
        [input.paymentReference, input.now, input.order.id, input.order.buyerId],
      );
      if ((claimed.rowCount ?? 0) !== 1) {
        throw new Error("Order already has a payment reference; use the existing checkout.");
      }

      const payment: StoredPayment = {
        id: input.id,
        orderId: input.order.id,
        provider: "paychangu",
        method: "card",
        status: "pending",
        amount: { amount, currency },
        reference: input.paymentReference,
        providerReference: input.chargeId,
        checkoutUrl: null,
        paidAt: null,
        verified: false,
        createdAt: input.now,
        updatedAt: input.now,
      };
      await paymentRepository.saveAsync(payment, client);

      const inserted = await client.query<ChargeRow>(
        `INSERT INTO paychangu_direct_card_charges
          (id, order_id, buyer_id, payment_reference, charge_id, amount, currency, status,
           requires_3ds_auth, authorization_completed, three_ds_auth_url, result_url,
           provider_order_reference, last_provider_status, failure_reason, verified_at,
           created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0, 0, NULL, $8, NULL, NULL, NULL, NULL, $9, $9)
         RETURNING *`,
        [
          input.id,
          input.order.id,
          input.order.buyerId,
          input.paymentReference,
          input.chargeId,
          amount,
          currency,
          input.resultUrl,
          input.now,
        ],
      );
      if (!inserted.rows[0]) throw new Error("Failed to persist the pending Direct Card Charge.");
      return toCharge(inserted.rows[0]);
    });
  }

  async getPaymentSummary(reference: string): Promise<DirectCardPaymentSummary | null> {
    const payment = await paymentRepository.findByReferenceAsync(reference);
    return payment ? toPaymentSummary(payment) : null;
  }

  async getChargeById(chargeId: string): Promise<StoredPayChanguCardCharge | null> {
    return findCharge({ query }, "charge_id", chargeId);
  }

  async getChargeByPaymentReference(reference: string): Promise<StoredPayChanguCardCharge | null> {
    return findCharge({ query }, "payment_reference", reference);
  }

  private async getRecord(
    executor: DbExecutor,
    charge: StoredPayChanguCardCharge,
  ): Promise<DirectCardVerificationRecord> {
    const payment = await paymentRepository.findByReferenceAsync(charge.paymentReference, executor);
    if (!payment) throw new Error("Stored payment summary was not found for the Direct Card Charge.");
    return { charge, payment: toPaymentSummary(payment) };
  }

  async recordInitiationResult(
    chargeId: string,
    result: PayChanguDirectCardInitiation,
  ): Promise<DirectCardInitiationRecord> {
    return withTransaction(async (client) => {
      const current = await findCharge(client, "charge_id", chargeId, true);
      if (!current) throw new Error("Direct Card Charge reference was not found.");
      if (result.chargeId !== chargeId) throw new Error("PayChangu initiation returned a mismatched charge identifier.");
      if (isTerminalChargeStatus(current.status)) {
        if (current.status === "paid") return this.getRecord(client, current);
        throw new Error("Cannot replace initiation state for a terminal Direct Card Charge.");
      }

      const now = new Date().toISOString();
      const status = result.requires3dsAuth ? "requires_action" : "pending_verification";
      await client.query(
        `UPDATE paychangu_direct_card_charges
            SET status = $1, requires_3ds_auth = $2, three_ds_auth_url = $3,
                provider_order_reference = $4, last_provider_status = $5,
                failure_reason = NULL, updated_at = $6
          WHERE charge_id = $7`,
        [status, result.requires3dsAuth ? 1 : 0, result.threeDsAuthUrl ?? null,
          result.providerOrderReference ?? null, result.status, now, chargeId],
      );

      const updatedPayment = await paymentRepository.updateByReferenceAsync(
        current.paymentReference,
        (payment) => ({
          ...payment,
          status: result.requires3dsAuth ? "requires_action" : "pending",
          providerReference: chargeId,
          checkoutUrl: result.threeDsAuthUrl ?? null,
          verified: false,
          updatedAt: now,
        }),
        client,
      );
      if (!updatedPayment) throw new Error("Stored payment record was not found for the Direct Card Charge.");

      const charge = await findCharge(client, "charge_id", chargeId);
      if (!charge) throw new Error("Direct Card Charge could not be reread after initiation.");
      const record = await this.getRecord(client, charge);
      return { charge: record.charge, payment: record.payment };
    });
  }

  async recordAuthorizationResult(
    chargeId: string,
    result: { completed: boolean; failureReason?: string },
  ): Promise<DirectCardVerificationRecord> {
    return withTransaction(async (client) => {
      const current = await findCharge(client, "charge_id", chargeId, true);
      if (!current) throw new Error("Direct Card Charge reference was not found.");
      if (current.status === "paid") return this.getRecord(client, current);
      const now = new Date().toISOString();
      await client.query(
        `UPDATE paychangu_direct_card_charges
            SET authorization_completed = $1, failure_reason = $2, updated_at = $3
          WHERE charge_id = $4`,
        [result.completed ? 1 : 0, result.completed ? null : result.failureReason?.slice(0, 500) ?? "Cardholder authorization is not yet confirmed.", now, chargeId],
      );
      const charge = await findCharge(client, "charge_id", chargeId);
      if (!charge) throw new Error("Direct Card Charge could not be reread after authorization.");
      return this.getRecord(client, charge);
    });
  }

  async recordVerification(
    chargeId: string,
    result: PayChanguDirectCardVerification,
  ): Promise<DirectCardVerificationRecord> {
    return withTransaction(async (client) => {
      const current = await findCharge(client, "charge_id", chargeId, true);
      if (!current) throw new Error("Direct Card Charge reference was not found.");
      const existingPayment = await paymentRepository.findByReferenceAsync(current.paymentReference, client);
      if (!existingPayment) throw new Error("Stored payment summary was not found for the Direct Card Charge.");
      if (current.status === "paid" || (existingPayment.status === "captured" && existingPayment.verified)) {
        return this.getRecord(client, current);
      }
      if (isTerminalChargeStatus(current.status)) return this.getRecord(client, current);

      // A provider response that says "paid" but fails verification must never be
      // promoted to success by this path.
      const status: StoredPayChanguCardCharge["status"] = result.verified && result.status === "paid"
        ? "pending_verification"
        : result.status === "paid"
          ? "unknown"
          : result.status === "pending"
            ? current.requires3dsAuth && !current.authorizationCompleted ? "requires_action" : "pending_verification"
            : result.status;
      const paymentStatus: StoredPayment["status"] =
        status === "failed" || status === "reversed" ? "failed"
          : status === "requires_action" ? "requires_action" : "pending";
      const now = new Date().toISOString();

      await client.query(
        `UPDATE paychangu_direct_card_charges
            SET status = $1, last_provider_status = $2, failure_reason = $3, verified_at = NULL, updated_at = $4
          WHERE charge_id = $5`,
        [status, result.status, result.failureReason?.slice(0, 500) ?? null, now, chargeId],
      );

      const verification = toPaymentVerification(current, result, false);
      const updatedPayment = await paymentRepository.updateByReferenceAsync(
        current.paymentReference,
        (payment) => ({
          ...payment,
          status: paymentStatus,
          verified: false,
          verification,
          updatedAt: now,
        }),
        client,
      );
      if (!updatedPayment) throw new Error("Stored payment record was not found for the Direct Card Charge.");

      const charge = await findCharge(client, "charge_id", chargeId);
      if (!charge) throw new Error("Direct Card Charge could not be reread after verification.");
      return this.getRecord(client, charge);
    });
  }

  async settleVerifiedCharge(
    chargeId: string,
    result: PayChanguDirectCardVerification,
  ): Promise<DirectCardVerificationRecord> {
    if (!result.verified || result.status !== "paid") {
      throw new Error("Direct Card settlement requires a verified successful provider response.");
    }
    if (result.amount === undefined || !result.currency) {
      throw new Error("Verified Direct Card Charge is missing its authoritative amount or currency.");
    }

    const preflight = await withTransaction(async (client) => {
      const charge = await findCharge(client, "charge_id", chargeId, true);
      if (!charge) throw new Error("Direct Card Charge reference was not found.");
      const payment = await paymentRepository.findByReferenceAsync(charge.paymentReference, client);
      if (!payment) throw new Error("Stored payment record was not found for the Direct Card Charge.");

      if (payment.status === "captured" && payment.verified) {
        if (charge.status !== "paid") {
          const now = new Date().toISOString();
          await client.query(
            `UPDATE paychangu_direct_card_charges
                SET status = 'paid', last_provider_status = 'paid', failure_reason = NULL,
                    verified_at = COALESCE(verified_at, $1), updated_at = $1
              WHERE charge_id = $2 AND status NOT IN ('failed', 'cancelled', 'reversed')`,
            [now, chargeId],
          );
        }
        const current = await findCharge(client, "charge_id", chargeId);
        if (!current) throw new Error("Direct Card Charge could not be reread after reconciliation.");
        return { charge: current, alreadySettled: true };
      }

      if (isTerminalChargeStatus(charge.status)) {
        throw new Error("A terminal Direct Card Charge cannot be settled.");
      }
      if (charge.requires3dsAuth && !charge.authorizationCompleted) {
        throw new Error("Cardholder authorization must be confirmed before Direct Card settlement.");
      }
      const order = await orderRepository.findByIdAsync(charge.orderId, client);
      if (!order || order.paymentReference !== charge.paymentReference) {
        throw new Error("Direct Card Charge no longer matches its stored order payment reference.");
      }

      const expectedCurrency = normalizeCurrency(charge.currency);
      if (Number(result.amount) !== charge.amount ||
          normalizeCurrency(result.currency) !== expectedCurrency ||
          Number(order.total.amount) !== charge.amount ||
          normalizeCurrency(order.total.currency || order.currency) !== expectedCurrency) {
        throw new Error("Verified Direct Card Charge amount or currency does not exactly match the stored order.");
      }
      if (order.status !== "pending_payment") {
        throw new Error("Order is no longer eligible for Direct Card settlement.");
      }
      return { charge, alreadySettled: false };
    });

    if (!preflight.alreadySettled) {
      const verification: PaymentVerificationResult = {
        verified: true,
        provider: "paychangu",
        txRef: preflight.charge.paymentReference,
        reference: preflight.charge.paymentReference,
        orderId: preflight.charge.orderId,
        status: "captured",
        currency: preflight.charge.currency,
        amount: { amount: preflight.charge.amount, currency: preflight.charge.currency },
        checkoutUrl: preflight.charge.threeDsAuthUrl,
      };
      const settled = await applyVerifiedPayChanguPayment(verification);
      if (!settled.order) throw new Error("Verified Direct Card Charge could not resolve its order for settlement.");

      const payment = await paymentRepository.findByReferenceAsync(preflight.charge.paymentReference);
      const order = await orderRepository.findByIdAsync(preflight.charge.orderId);
      if (!payment || payment.status !== "captured" || !payment.verified || !order) {
        throw new Error("Existing BuyMesho settlement flow did not confirm Direct Card payment state.");
      }
    }

    return withTransaction(async (client) => {
      const current = await findCharge(client, "charge_id", chargeId, true);
      if (!current) throw new Error("Direct Card Charge reference was not found.");
      if (current.status !== "paid" && isTerminalChargeStatus(current.status)) {
        throw new Error("Direct Card Charge reached a terminal non-success state during settlement.");
      }
      const now = new Date().toISOString();
      await client.query(
        `UPDATE paychangu_direct_card_charges
            SET status = 'paid', last_provider_status = 'paid', failure_reason = NULL,
                verified_at = COALESCE(verified_at, $1), updated_at = $1
          WHERE charge_id = $2 AND status NOT IN ('failed', 'cancelled', 'reversed')`,
        [now, chargeId],
      );
      const charge = await findCharge(client, "charge_id", chargeId);
      if (!charge || charge.status !== "paid") throw new Error("Direct Card Charge could not be marked paid after settlement.");
      return this.getRecord(client, charge);
    });
  }
}

export const buyMeshoPayChanguDirectCardStore = new BuyMeshoPayChanguDirectCardStore();

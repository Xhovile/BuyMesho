import { getFirebaseAdmin } from "../../auth/firebaseAdmin.js";
import { query } from "../../postgres.js";
import { sendEmail } from "../email/email.service.js";
import { renderOrderRefundedEmail } from "../email/templates/order-refunded.js";
import type { StoredOrder } from "../orders/order.repository.js";
import {
  claimEmailNotification,
  markEmailNotificationSent,
  releaseEmailNotification,
} from "./email-delivery.repository.js";

type RecipientRole = "buyer" | "seller";
type SendEmail = typeof sendEmail;

export type OrderRefundedInput = {
  order: StoredOrder;
  reason: string;
};

async function getSellerBusinessName(sellerUid: string): Promise<string | null> {
  try {
    const result = await query<{ business_name?: string | null }>(
      "SELECT business_name FROM sellers WHERE uid = $1 LIMIT 1",
      [sellerUid],
    );
    return result.rows[0]?.business_name?.trim() || null;
  } catch (error) {
    console.warn("Failed to load seller business name for refund email", error);
    return null;
  }
}

async function sendOrderRefundedEmail(
  input: OrderRefundedInput,
  role: RecipientRole,
  dependencies: { send?: SendEmail } = {},
): Promise<boolean> {
  const { order } = input;
  const recipientId = role === "buyer" ? order.buyerId : order.sellerId;
  const userRecord = await getFirebaseAdmin().auth().getUser(recipientId);
  const email = userRecord.email?.trim();
  if (!email) return false;

  const sellerBusinessName = (await getSellerBusinessName(order.sellerId)) || "BuyMesho seller";
  const buyerName = order.buyerDetails?.fullName?.trim() || "BuyMesho customer";
  const recipientName = role === "buyer"
    ? buyerName
    : sellerBusinessName;
  const counterpartyName = role === "buyer"
    ? sellerBusinessName
    : buyerName;
  const actionUrl = `https://buymesho.app/orders/${encodeURIComponent(order.id)}`;
  const dedupeKey = `${order.id}:${role}`;
  const claim = dependenciesClaim(role, dedupeKey);
  if (!claim()) return false;

  try {
    const { text, html } = renderOrderRefundedEmail({
      recipientName,
      role,
      orderId: order.id,
      amount: order.total.amount,
      currency: order.total.currency || order.currency,
      counterpartyName,
      reason: input.reason,
      actionUrl,
    });

    await (dependencies.send ?? sendEmail)({
      sender: "notifications",
      to: { email, name: recipientName },
      subject: "BuyMesho order refunded",
      text,
      html,
    });
    markEmailNotificationSent("order_refunded", dedupeKey);
    return true;
  } catch (error) {
    releaseEmailNotification("order_refunded", dedupeKey);
    throw error;
  }
}

function dependenciesClaim(_role: RecipientRole, dedupeKey: string): () => boolean {
  return () => claimEmailNotification("order_refunded", dedupeKey);
}

export async function notifyOrderRefunded(
  input: OrderRefundedInput,
  dependencies: { send?: SendEmail } = {},
): Promise<void> {
  await Promise.allSettled([
    sendOrderRefundedEmail(input, "buyer", dependencies),
    sendOrderRefundedEmail(input, "seller", dependencies),
  ]);
}

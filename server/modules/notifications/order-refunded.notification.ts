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
type FirebaseUser = { email?: string | null; displayName?: string | null };

type DeliveryDependencies = {
  send?: SendEmail;
  claim?: (notificationType: string, dedupeKey: string) => boolean;
  markSent?: (notificationType: string, dedupeKey: string) => void;
  release?: (notificationType: string, dedupeKey: string) => void;
  lookupUser?: (uid: string) => Promise<FirebaseUser>;
  lookupSellerBusinessName?: (uid: string) => Promise<string | null>;
};

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
  dependencies: DeliveryDependencies,
): Promise<boolean> {
  const { order } = input;
  const recipientId = role === "buyer" ? order.buyerId : order.sellerId;
  const lookupUser = dependencies.lookupUser ?? (async (uid: string) => getFirebaseAdmin().auth().getUser(uid));
  const userRecord = await lookupUser(recipientId);
  const email = userRecord.email?.trim();
  if (!email) return false;

  const lookupSellerBusinessName = dependencies.lookupSellerBusinessName ?? getSellerBusinessName;
  const sellerBusinessName = (await lookupSellerBusinessName(order.sellerId)) || "BuyMesho seller";
  const buyerName = order.buyerDetails?.fullName?.trim() || "BuyMesho customer";
  const recipientName = role === "buyer" ? buyerName : sellerBusinessName;
  const counterpartyName = role === "buyer" ? sellerBusinessName : buyerName;
  const actionUrl = `https://buymesho.app/orders/${encodeURIComponent(order.id)}`;
  const dedupeKey = `${order.id}:${role}`;
  const claim = dependencies.claim ?? claimEmailNotification;
  const markSent = dependencies.markSent ?? markEmailNotificationSent;
  const release = dependencies.release ?? releaseEmailNotification;

  if (!claim("order_refunded", dedupeKey)) return false;

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
    markSent("order_refunded", dedupeKey);
    return true;
  } catch (error) {
    release("order_refunded", dedupeKey);
    throw error;
  }
}

export async function notifyOrderRefunded(
  input: OrderRefundedInput,
  dependencies: DeliveryDependencies = {},
): Promise<void> {
  await Promise.allSettled([
    sendOrderRefundedEmail(input, "buyer", dependencies),
    sendOrderRefundedEmail(input, "seller", dependencies),
  ]);
}

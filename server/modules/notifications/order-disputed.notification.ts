import { getFirebaseAdmin } from "../../auth/firebaseAdmin.js";
import { query } from "../../postgres.js";
import { sendEmail } from "../email/email.service.js";
import { renderOrderDisputedEmail } from "../email/templates/order-disputed.js";
import {
  claimEmailNotification,
  markEmailNotificationSent,
  releaseEmailNotification,
} from "./email-delivery.repository.js";

type RecipientRole = "buyer" | "seller";
type SendEmail = typeof sendEmail;

export type OrderDisputedInput = {
  orderId: string;
  disputeId: string;
  buyerId: string;
  sellerId: string;
  reason: string;
};

async function getUserEmail(uid: string) {
  const user = await getFirebaseAdmin().auth().getUser(uid);
  return { email: user.email?.trim() || "", displayName: user.displayName?.trim() || "" };
}

async function getSellerBusinessName(sellerUid: string): Promise<string | null> {
  try {
    const result = await query<{ business_name?: string | null }>(
      "SELECT business_name FROM sellers WHERE uid = $1 LIMIT 1",
      [sellerUid],
    );
    return result.rows[0]?.business_name?.trim() || null;
  } catch (error) {
    console.warn("Failed to load seller business name for dispute email", error);
    return null;
  }
}

async function sendOrderDisputedEmail(
  input: OrderDisputedInput,
  role: RecipientRole,
  dependencies: { send?: SendEmail } = {},
): Promise<boolean> {
  const recipientId = role === "buyer" ? input.buyerId : input.sellerId;
  const recipient = await getUserEmail(recipientId);
  if (!recipient.email) return false;

  const sellerBusinessName = (await getSellerBusinessName(input.sellerId)) || "BuyMesho seller";
  const buyerName = recipientId === input.buyerId && recipient.displayName
    ? recipient.displayName
    : "BuyMesho customer";
  const recipientName = role === "buyer"
    ? recipient.displayName || "there"
    : sellerBusinessName;
  const counterpartyName = role === "buyer"
    ? sellerBusinessName
    : buyerName;
  const actionUrl = `https://buymesho.app/orders/${encodeURIComponent(input.orderId)}`;
  const dedupeKey = `${input.disputeId}:${role}`;

  if (!claimEmailNotification("order_disputed", dedupeKey)) return false;

  try {
    const { text, html } = renderOrderDisputedEmail({
      recipientName,
      role,
      orderId: input.orderId,
      counterpartyName,
      reason: input.reason,
      actionUrl,
    });

    await (dependencies.send ?? sendEmail)({
      sender: "notifications",
      to: { email: recipient.email, name: recipientName },
      subject: "BuyMesho order dispute opened",
      text,
      html,
    });
    markEmailNotificationSent("order_disputed", dedupeKey);
    return true;
  } catch (error) {
    releaseEmailNotification("order_disputed", dedupeKey);
    throw error;
  }
}

export async function notifyOrderDisputed(
  input: OrderDisputedInput,
  dependencies: { send?: SendEmail } = {},
): Promise<void> {
  await Promise.allSettled([
    sendOrderDisputedEmail(input, "buyer", dependencies),
    sendOrderDisputedEmail(input, "seller", dependencies),
  ]);
}

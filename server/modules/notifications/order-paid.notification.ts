import { getFirebaseAdmin } from "../../auth/firebaseAdmin.js";
import { getPaymentDb } from "../../postgresCompat.js";
import { sendEmail } from "../email/email.service.js";
import { renderOrderPaidEmail } from "../email/templates/order-paid.js";
import type { StoredOrder } from "../orders/order.repository.js";

type RecipientRole = "buyer" | "seller";

function getSellerBusinessName(sellerUid: string): string | null {
  try {
    const row = getPaymentDb().prepare("SELECT business_name FROM sellers WHERE uid = ? LIMIT 1").get(sellerUid) as { business_name?: string | null } | undefined;
    const name = row?.business_name?.trim();
    return name || null;
  } catch (error) {
    console.warn("Failed to load seller business name for order email", error);
    return null;
  }
}

async function sendOrderPaidEmail(order: StoredOrder, role: RecipientRole): Promise<void> {
  const recipientId = role === "buyer" ? order.buyerId : order.sellerId;
  const userRecord = await getFirebaseAdmin().auth().getUser(recipientId);
  const email = userRecord.email?.trim();
  if (!email) return;

  const recipientName = role === "seller"
    ? order.buyerDetails?.fullName?.trim() || userRecord.displayName?.trim() || email.split("@")[0] || "there"
    : userRecord.displayName?.trim() || email.split("@")[0] || "there";

  const sellerBusinessName = getSellerBusinessName(order.sellerId) || "the seller";
  const buyerCheckoutName = order.buyerDetails?.fullName?.trim() || "the buyer";
  const counterpartyName = role === "buyer" ? sellerBusinessName : buyerCheckoutName;
  const actionUrl = role === "seller"
    ? `https://buymesho.app/seller/payouts?view=orders&order=${encodeURIComponent(order.id)}`
    : `https://buymesho.app/orders/${encodeURIComponent(order.id)}`;

  const { text, html } = renderOrderPaidEmail({
    recipientName,
    role,
    counterpartyName,
    orderId: order.id,
    totalAmount: order.total.amount,
    currency: order.total.currency || order.currency,
    actionUrl,
  });

  await sendEmail({
    sender: "notifications",
    to: { email, name: recipientName },
    subject: role === "buyer"
      ? `BuyMesho payment confirmed — ${sellerBusinessName}`
      : `BuyMesho — new paid order from ${buyerCheckoutName}`,
    text,
    html,
  });
}

export async function notifyOrderPaid(order: StoredOrder): Promise<void> {
  await Promise.allSettled([
    sendOrderPaidEmail(order, "buyer"),
    sendOrderPaidEmail(order, "seller"),
  ]);
}

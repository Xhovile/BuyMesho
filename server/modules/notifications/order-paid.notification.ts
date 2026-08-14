import { getFirebaseAdmin } from "../../auth/firebaseAdmin.js";
import { sendEmail } from "../email/email.service.js";
import { renderOrderPaidEmail } from "../email/templates/order-paid.js";
import type { StoredOrder } from "../orders/order.repository.js";

type RecipientRole = "buyer" | "seller";

async function sendOrderPaidEmail(order: StoredOrder, role: RecipientRole): Promise<void> {
  const recipientId = role === "buyer" ? order.buyerId : order.sellerId;
  const userRecord = await getFirebaseAdmin().auth().getUser(recipientId);
  const email = userRecord.email?.trim();
  if (!email) return;

  const recipientName = userRecord.displayName?.trim() || email.split("@")[0] || "there";
  const actionUrl = `https://buymesho.app/orders/${encodeURIComponent(order.id)}`;
  const { text, html } = renderOrderPaidEmail({
    recipientName,
    role,
    orderId: order.id,
    totalAmount: order.total.amount,
    currency: order.total.currency || order.currency,
    actionUrl,
  });

  await sendEmail({
    sender: "notifications",
    to: { email, name: recipientName },
    subject: role === "buyer" ? "BuyMesho payment confirmed" : "BuyMesho — new paid order",
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

import { query } from "../../postgres.js";
import { sendEmail } from "../email/email.service.js";
import { renderOrderPaidEmail } from "../email/templates/order-paid.js";
import type { StoredOrder } from "../orders/order.repository.js";
import { resolveNotificationRecipient } from "./email-recipient.js";

type RecipientRole = "buyer" | "seller";

async function getSellerBusinessName(sellerUid: string): Promise<string | null> {
  try {
    const result = await query<{ business_name?: string | null }>(
      "SELECT business_name FROM sellers WHERE uid = $1 LIMIT 1",
      [sellerUid],
    );
    const name = result.rows[0]?.business_name?.trim();
    return name || null;
  } catch (error) {
    console.warn("Failed to load seller business name for order email", error);
    return null;
  }
}

async function getEventCreatorRegistrationName(creatorUid: string): Promise<string | null> {
  try {
    const result = await query<{ display_name?: string | null }>(
      "SELECT display_name FROM event_creators WHERE uid = $1 LIMIT 1",
      [creatorUid],
    );
    const name = result.rows[0]?.display_name?.trim();
    return name || null;
  } catch (error) {
    console.warn("Failed to load event creator registration name for order email", error);
    return null;
  }
}

function getEventTicketHolderName(order: StoredOrder): string | null {
  for (const item of order.items ?? []) {
    const record = item as unknown as Record<string, unknown>;
    if (record.kind !== "event_ticket") continue;

    const ticketHolder = record.ticketHolder;
    if (ticketHolder && typeof ticketHolder === "object" && !Array.isArray(ticketHolder)) {
      const holder = ticketHolder as Record<string, unknown>;
      if (typeof holder.fullName === "string" && holder.fullName.trim()) return holder.fullName.trim();
    }

    const tickets = record.tickets;
    if (Array.isArray(tickets)) {
      for (const ticket of tickets) {
        if (!ticket || typeof ticket !== "object") continue;
        const holder = (ticket as Record<string, unknown>).holder;
        if (!holder || typeof holder !== "object" || Array.isArray(holder)) continue;
        const fullName = (holder as Record<string, unknown>).fullName;
        if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
      }
    }
  }

  return null;
}

function getEventId(order: StoredOrder): string | null {
  if (order.source !== "event") return null;
  for (const item of order.items ?? []) {
    if (item?.kind === "event_ticket" && item.eventId) return String(item.eventId);
  }
  return null;
}

async function sendOrderPaidEmail(order: StoredOrder, role: RecipientRole): Promise<void> {
  const recipientId = role === "buyer" ? order.buyerId : order.sellerId;
  const userRecord = await resolveNotificationRecipient(recipientId);
  const email = userRecord.email?.trim();
  if (!email) return;

  const sellerBusinessName = await getSellerBusinessName(order.sellerId);
  const eventTicketHolderName = getEventTicketHolderName(order);
  const buyerCheckoutName = order.buyerDetails?.fullName?.trim() || eventTicketHolderName;
  const isEventOrder = order.source === "event";
  const eventCreatorRegistrationName = isEventOrder
    ? await getEventCreatorRegistrationName(order.sellerId)
    : null;
  const recipientName = role === "buyer"
    ? buyerCheckoutName || userRecord.displayName?.trim() || "there"
    : isEventOrder
      ? eventCreatorRegistrationName || sellerBusinessName || userRecord.displayName?.trim() || "there"
      : sellerBusinessName || userRecord.displayName?.trim() || "there";
  const counterpartyName = role === "buyer"
    ? sellerBusinessName || "BuyMesho seller"
    : buyerCheckoutName || "BuyMesho customer";
  const eventId = getEventId(order);
  const actionUrl = role === "seller"
    ? eventId
      ? `https://buymesho.app/explore/events/manage?event=${encodeURIComponent(eventId)}`
      : `https://buymesho.app/seller/payouts?view=orders&order=${encodeURIComponent(order.id)}`
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
      ? `BuyMesho payment confirmed — ${sellerBusinessName || "BuyMesho seller"}`
      : `BuyMesho — new paid order from ${counterpartyName}`,
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

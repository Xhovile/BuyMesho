import { query } from "../../postgres.js";
import { sendEmail } from "../email/email.service.js";
import { renderOrderPaidEmail } from "../email/templates/order-paid.js";
import type { StoredOrder } from "../orders/order.repository.js";
import { resolveNotificationRecipient } from "./email-recipient.js";
import {
  claimEmailNotification,
  markEmailNotificationSent,
  releaseEmailNotification,
} from "./email-delivery.repository.js";

type RecipientRole = "buyer" | "seller";

type Send = typeof sendEmail;

type NotificationDependencies = {
  send?: Send;
  claim?: (notificationType: string, dedupeKey: string) => boolean;
  markSent?: (notificationType: string, dedupeKey: string) => void;
  release?: (notificationType: string, dedupeKey: string) => void;
  resolveRecipient?: typeof resolveNotificationRecipient;
  getSellerBusinessName?: typeof getSellerBusinessName;
  getEventCreatorDisplayName?: typeof getEventCreatorDisplayName;
};

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

async function getEventCreatorDisplayName(creatorUid: string): Promise<string | null> {
  try {
    const result = await query<{ display_name?: string | null }>(
      "SELECT display_name FROM event_creators WHERE uid = $1 LIMIT 1",
      [creatorUid],
    );
    const name = result.rows[0]?.display_name?.trim();
    return name || null;
  } catch (error) {
    console.warn("Failed to load event creator name for order email", error);
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
      if (typeof holder.fullName === "string" && holder.fullName.trim()) {
        return holder.fullName.trim();
      }
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

function getEventName(order: StoredOrder): string | null {
  if (order.source !== "event") return null;
  for (const item of order.items ?? []) {
    if (item?.kind === "event_ticket") {
      const title = (item as unknown as Record<string, unknown>).title;
      if (typeof title === "string" && title.trim()) return title.trim();
    }
  }
  return null;
}

async function sendOrderPaidEmail(
  order: StoredOrder,
  role: RecipientRole,
  deps: NotificationDependencies,
): Promise<void> {
  const notificationType = "order_paid";
  const dedupeKey = `${order.id}:${role}`;
  const claim = deps.claim ?? ((type: string, key: string) => claimEmailNotification(type, key));
  const markSent =
    deps.markSent ?? ((type: string, key: string) => markEmailNotificationSent(type, key));
  const release =
    deps.release ?? ((type: string, key: string) => releaseEmailNotification(type, key));

  const recipientId = role === "buyer" ? order.buyerId : order.sellerId;
  const resolveRecipient = deps.resolveRecipient ?? resolveNotificationRecipient;
  const userRecord = await resolveRecipient(recipientId);
  const email = userRecord.email?.trim();
  if (!email) return;

  if (!claim(notificationType, dedupeKey)) return;

  const sellerBusinessName = await (deps.getSellerBusinessName ?? getSellerBusinessName)(order.sellerId);
  const eventCreatorDisplayName = order.source === "event"
    ? await (deps.getEventCreatorDisplayName ?? getEventCreatorDisplayName)(order.sellerId)
    : null;
  const eventTicketHolderName = getEventTicketHolderName(order);
  const buyerCheckoutName = order.buyerDetails?.fullName?.trim() || eventTicketHolderName;
  const isEventOrder = order.source === "event";
  const eventName = getEventName(order);
  const recipientName = role === "buyer"
    ? buyerCheckoutName || userRecord.displayName?.trim() || "there"
    : isEventOrder
      ? eventCreatorDisplayName || "there"
      : sellerBusinessName || userRecord.displayName?.trim() || "there";
  const counterpartyName = role === "buyer"
    ? (isEventOrder
      ? eventCreatorDisplayName || sellerBusinessName || "Event creator"
      : sellerBusinessName || "BuyMesho seller")
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
    isEventOrder,
    eventName,
  });

  try {
    await (deps.send ?? sendEmail)({
      sender: "notifications",
      to: { email, name: recipientName },
      subject: isEventOrder
        ? role === "buyer"
          ? `BuyMesho event payment confirmed — ${eventName || "your event"}`
          : `BuyMesho — new event ticket purchase for ${eventName || "your event"}`
        : role === "buyer"
          ? `BuyMesho payment confirmed — ${counterpartyName}`
          : `BuyMesho — new paid order from ${counterpartyName}`,
      text,
      html,
    });
    markSent(notificationType, dedupeKey);
  } catch (error) {
    release(notificationType, dedupeKey);
    throw error;
  }
}

export async function notifyOrderPaid(
  order: StoredOrder,
  deps: NotificationDependencies = {},
): Promise<void> {
  // Event buyers receive the unified event-ticket purchase notification.
  // Keep order_paid for marketplace buyers while retaining the event manager
  // purchase notification in this flow.
  const recipients: RecipientRole[] = order.source === "event" ? ["seller"] : ["buyer", "seller"];
  await Promise.allSettled(recipients.map((role) => sendOrderPaidEmail(order, role, deps)));
}

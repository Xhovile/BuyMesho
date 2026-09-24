import { query } from "../../postgres.js";
import { sendEmail } from "../email/email.service.js";
import { renderDisputeWorkflowEmail } from "../email/templates/dispute-workflow.js";
import { claimEmailNotification, markEmailNotificationSent, releaseEmailNotification } from "./email-delivery.repository.js";
import { resolveNotificationRecipient } from "./email-recipient.js";
import { orderRepository } from "../orders/order.repository.js";

type RecipientRole = "buyer" | "seller";
type SendEmail = typeof sendEmail;
type FirebaseUser = { email?: string | null; displayName?: string | null };
type DeliveryDependencies = { send?: SendEmail; claim?: (notificationType: string, dedupeKey: string) => boolean; markSent?: (notificationType: string, dedupeKey: string) => void; release?: (notificationType: string, dedupeKey: string) => void; lookupUser?: (uid: string) => Promise<FirebaseUser>; lookupSellerBusinessName?: (uid: string) => Promise<string | null>; lookupOrder?: (orderId: string) => ReturnType<typeof orderRepository.findById>; lookupEvidence?: (caseId: string) => Promise<string[]> };
export type DisputeWorkflowEvent = "submitted" | "under_review" | "more_information_requested" | "rejected" | "approved" | "refund_processing" | "refund_completed" | "seller_wins" | "buyer_wins" | "seller_refund_recorded" | "seller_replacement_recorded" | "seller_dispute_rejected";
export type DisputeWorkflowNotificationInput = {
  caseId: string; orderId: string; buyerId: string; sellerId: string; event: DisputeWorkflowEvent; note?: string | null; amount?: number | null; currency?: string | null; transactionId?: string | null; refundMethod?: string | null; refundDate?: string | null; destination?: string | null; recipients?: RecipientRole[];
};

const EVENT_COPY: Record<DisputeWorkflowEvent, { subject: string; buyer: string; seller: string; label: string }> = {
  submitted: { subject: "BuyMesho dispute submitted", label: "Dispute submitted", buyer: "Your dispute has been received. BuyMesho will review the case and notify you of the next step.", seller: "A dispute has been opened for your order. Please review the case and respond where required." },
  under_review: { subject: "BuyMesho dispute under review", label: "Dispute under review", buyer: "Your dispute is now under formal review by BuyMesho.", seller: "The dispute for your order is now under formal review by BuyMesho." },
  more_information_requested: { subject: "BuyMesho needs more information", label: "More information requested", buyer: "More information is required to review your dispute. Please check the case for the requested details.", seller: "More information is required regarding the dispute for your order. Please check the case for the requested details." },
  rejected: { subject: "BuyMesho dispute decision", label: "Dispute rejected", buyer: "Your dispute was not approved. Review the case details for the decision and next step.", seller: "The dispute was rejected and the transaction can continue." },
  approved: { subject: "BuyMesho refund approved", label: "Refund approved", buyer: "Your refund has been approved. Approval authorizes the refund workflow; it does not by itself mean the money has been returned yet.", seller: "A refund has been approved for the disputed order. The financial refund step is separate from the approval decision." },
  refund_processing: { subject: "BuyMesho refund processing", label: "Refund processing", buyer: "Your refund is being processed.", seller: "The refund for the disputed order is being processed." },
  refund_completed: { subject: "BuyMesho refund completed", label: "Refund completed", buyer: "Your refund has been processed successfully.", seller: "The refund for the disputed order has been processed successfully." },
  seller_wins: { subject: "BuyMesho dispute resolved in seller's favor", label: "Resolved in seller's favor", buyer: "The dispute was resolved in the seller's favor. Review the case details for the decision and next step.", seller: "The dispute was resolved in your favor and the transaction can continue." },
  buyer_wins: { subject: "BuyMesho dispute resolved in buyer's favor", label: "Resolved in buyer's favor", buyer: "The dispute was resolved in your favor.", seller: "The dispute was resolved in the buyer's favor. Review the case details for the decision and next step." },
  seller_refund_recorded: { subject: "BuyMesho seller refund recorded", label: "Seller refund recorded", buyer: "The seller has submitted refund details for your disputed order. The refund information has been recorded and is available in your BuyMesho dispute case.", seller: "Your refund transaction for the disputed order has been recorded." },
  seller_replacement_recorded: { subject: "BuyMesho seller replacement submitted", label: "Seller replacement submitted", buyer: "The seller has chosen to send another item to resolve your disputed order. Review the seller's explanation in your BuyMesho Disputes page.", seller: "Your replacement resolution for the disputed order has been recorded." },
  seller_dispute_rejected: { subject: "BuyMesho seller disputed-order response", label: "Seller rejected dispute", buyer: "The seller has rejected your dispute. Review the seller's explanation in your BuyMesho Disputes page or contact BuyMesho Admin for assistance.", seller: "Your rejection response for the disputed order has been recorded." },
};

async function getSellerBusinessName(sellerUid: string): Promise<string | null> {
  try {
    const result = await query<{ business_name?: string | null }>("SELECT business_name FROM sellers WHERE uid = $1 LIMIT 1", [sellerUid]);
    return result.rows[0]?.business_name?.trim() || null;
  } catch (error) {
    console.warn("Failed to load seller business name for dispute workflow email", error);
    return null;
  }
}

async function getEventCreatorDisplayName(creatorUid: string): Promise<string | null> {
  try {
    const result = await query<{ display_name?: string | null }>("SELECT display_name FROM event_creators WHERE uid = $1 LIMIT 1", [creatorUid]);
    return result.rows[0]?.display_name?.trim() || null;
  } catch (error) {
    console.warn("Failed to load event creator name for dispute workflow email", error);
    return null;
  }
}

function getBuyerCheckoutName(order: ReturnType<typeof orderRepository.findById>): string | null {
  const orderName = order?.buyerDetails?.fullName?.trim();
  if (orderName) return orderName;
  for (const item of order?.items ?? []) {
    const record = item as unknown as Record<string, unknown>;
    if (record.kind !== "event_ticket") continue;
    const holder = record.ticketHolder;
    if (holder && typeof holder === "object" && !Array.isArray(holder)) {
      const fullName = (holder as Record<string, unknown>).fullName;
      if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
    }
    const tickets = record.tickets;
    if (Array.isArray(tickets)) {
      for (const ticket of tickets) {
        if (!ticket || typeof ticket !== "object") continue;
        const ticketHolder = (ticket as Record<string, unknown>).holder;
        if (!ticketHolder || typeof ticketHolder !== "object" || Array.isArray(ticketHolder)) continue;
        const fullName = (ticketHolder as Record<string, unknown>).fullName;
        if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
      }
    }
  }
  return null;
}

function getOrderItemSummary(order: ReturnType<typeof orderRepository.findById>): string[] {
  return (order?.items ?? []).map((item) => {
    const title = typeof item?.title === "string" ? item.title.trim() : "";
    if (!title) return "";
    const quantity = Number(item.quantity ?? 1);
    return quantity > 1 ? `${title} × ${Math.trunc(quantity)}` : title;
  }).filter(Boolean);
}

async function getDisputeEvidence(caseId: string): Promise<string[]> {
  try {
    const result = await query<{ evidence?: string | null }>(
      "SELECT evidence FROM dispute_attempts WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1",
      [caseId],
    );
    const raw = result.rows[0]?.evidence;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, 20)
      : [];
  } catch (error) {
    console.warn("Failed to load dispute evidence for workflow email", error);
    return [];
  }
}
function actionUrl(role: RecipientRole, orderId: string): string {
  return role === "seller" ? `https://buymesho.app/seller/payouts?view=orders&order=${encodeURIComponent(orderId)}` : `https://buymesho.app/disputes?reference=${encodeURIComponent(orderId)}`;
}

async function sendToRole(input: DisputeWorkflowNotificationInput, role: RecipientRole, dependencies: DeliveryDependencies): Promise<boolean> {
  const recipientId = role === "buyer" ? input.buyerId : input.sellerId;
  const recipient = await resolveNotificationRecipient(recipientId, { lookupUser: dependencies.lookupUser });
  const email = recipient.email.trim();
  if (!email) return false;
  const eventCopy = EVENT_COPY[input.event];
  const dedupeKey = `${input.caseId}:${input.event}:${role}:${input.transactionId ?? ""}`;
  const notificationType = `dispute_${input.event}`;
  const claim = dependencies.claim ?? claimEmailNotification;
  const markSent = dependencies.markSent ?? markEmailNotificationSent;
  const release = dependencies.release ?? releaseEmailNotification;
  if (!claim(notificationType, dedupeKey)) return false;
  const order = dependencies.lookupOrder ? await dependencies.lookupOrder(input.orderId) : await orderRepository.findById(input.orderId);
  const isEventOrder = order?.source === "event";
  const buyerCheckoutName = getBuyerCheckoutName(order);
  const sellerBusinessName = dependencies.lookupSellerBusinessName ? await dependencies.lookupSellerBusinessName(input.sellerId) : await getSellerBusinessName(input.sellerId);
  const eventCreatorDisplayName = isEventOrder ? await getEventCreatorDisplayName(input.sellerId) : null;
  const sellerName = isEventOrder ? (eventCreatorDisplayName || "Event creator") : (sellerBusinessName || recipient.displayName.trim() || "BuyMesho seller");
  const buyerName = buyerCheckoutName || (role === "buyer" ? recipient.displayName.trim() : null) || "BuyMesho customer";
  const itemSummary = getOrderItemSummary(order);
  const evidence = dependencies.lookupEvidence ? await dependencies.lookupEvidence(input.caseId) : await getDisputeEvidence(input.caseId);
  const { text, html } = renderDisputeWorkflowEmail({
    recipientName: role === "seller" ? sellerName : buyerName,
    title: eventCopy.label,
    intro: eventCopy[role],
    orderId: input.orderId,
    eventLabel: eventCopy.label,
    actionUrl: actionUrl(role, input.orderId),
    actionLabel: "View dispute",
    amount: input.amount,
    currency: input.currency,
    refundMethod: input.refundMethod,
    transactionId: input.transactionId,
    refundDate: input.refundDate,
    destination: role === "buyer" ? input.destination : null,
    note: input.note,
    buyerName,
    sellerName,
    items: itemSummary,
    evidence,
  });
  try {
    await (dependencies.send ?? sendEmail)({ sender: "notifications", to: { email, name: role === "seller" ? sellerName : buyerName }, subject: eventCopy.subject, text, html });
    markSent(notificationType, dedupeKey);
    return true;
  } catch (error) {
    release(notificationType, dedupeKey);
    throw error;
  }
}

export async function notifyDisputeWorkflowEvent(input: DisputeWorkflowNotificationInput, dependencies: DeliveryDependencies = {}): Promise<void> {
  const recipients: RecipientRole[] = input.recipients?.length ? input.recipients : ["buyer", "seller"];
  await Promise.allSettled(recipients.map((role) => sendToRole(input, role, dependencies)));
}

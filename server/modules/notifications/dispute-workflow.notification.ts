import { sendEmail } from "../email/email.service.js";
import {
  claimEmailNotification,
  markEmailNotificationSent,
  releaseEmailNotification,
} from "./email-delivery.repository.js";
import { resolveNotificationRecipient } from "./email-recipient.js";

export type DisputeWorkflowEvent =
  | "submitted"
  | "under_review"
  | "more_information_requested"
  | "rejected"
  | "approved"
  | "refund_processing"
  | "refund_completed"
  | "seller_wins"
  | "buyer_wins"
  | "seller_refund_recorded";

type RecipientRole = "buyer" | "seller";
type SendEmail = typeof sendEmail;
type FirebaseUser = { email?: string | null; displayName?: string | null };

type DeliveryDependencies = {
  send?: SendEmail;
  claim?: (notificationType: string, dedupeKey: string) => boolean;
  markSent?: (notificationType: string, dedupeKey: string) => void;
  release?: (notificationType: string, dedupeKey: string) => void;
  lookupUser?: (uid: string) => Promise<FirebaseUser>;
};

export type DisputeWorkflowNotificationInput = {
  caseId: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  event: DisputeWorkflowEvent;
  note?: string | null;
  amount?: number | null;
  currency?: string | null;
  transactionId?: string | null;
  recipients?: RecipientRole[];
};

const EVENT_COPY: Record<DisputeWorkflowEvent, { subject: string; buyer: string; seller: string }> = {
  submitted: { subject: "BuyMesho dispute submitted", buyer: "Your dispute has been received. BuyMesho will review the case and notify you of the next step.", seller: "A dispute has been opened for your order. Please review the case and respond where required." },
  under_review: { subject: "BuyMesho dispute under review", buyer: "Your dispute is now under formal review by BuyMesho.", seller: "The dispute for your order is now under formal review by BuyMesho." },
  more_information_requested: { subject: "BuyMesho needs more information", buyer: "More information is required to review your dispute. Please check the case for the requested details.", seller: "More information is required regarding the dispute for your order. Please check the case for the requested details." },
  rejected: { subject: "BuyMesho dispute decision", buyer: "Your dispute was not approved. Review the case details for the decision and next step.", seller: "The dispute was rejected and the transaction can continue." },
  approved: { subject: "BuyMesho refund approved", buyer: "Your refund has been approved. Approval authorizes the refund workflow; it does not by itself mean the money has been returned yet.", seller: "A refund has been approved for the disputed order. The financial refund step is separate from the approval decision." },
  refund_processing: { subject: "BuyMesho refund processing", buyer: "Your refund is being processed.", seller: "The refund for the disputed order is being processed." },
  refund_completed: { subject: "BuyMesho refund completed", buyer: "Your refund has been processed successfully.", seller: "The refund for the disputed order has been processed successfully." },
  seller_wins: { subject: "BuyMesho dispute resolved in seller's favor", buyer: "The dispute was resolved in the seller's favor. Review the case details for the decision and next step.", seller: "The dispute was resolved in your favor and the transaction can continue." },
  buyer_wins: { subject: "BuyMesho dispute resolved in buyer's favor", buyer: "The dispute was resolved in your favor.", seller: "The dispute was resolved in the buyer's favor. Review the case details for the decision and next step." },
  seller_refund_recorded: { subject: "BuyMesho seller refund recorded", buyer: "Your refund transaction has been recorded from the seller.", seller: "Your refund transaction for the disputed order has been recorded." },
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function actionUrl(role: RecipientRole, orderId: string): string {
  return role === "seller"
    ? `https://buymesho.app/seller/payouts?view=orders&order=${encodeURIComponent(orderId)}`
    : `https://buymesho.app/orders/${encodeURIComponent(orderId)}`;
}

async function sendToRole(
  input: DisputeWorkflowNotificationInput,
  role: RecipientRole,
  dependencies: DeliveryDependencies,
): Promise<boolean> {
  const recipientId = role === "buyer" ? input.buyerId : input.sellerId;
  const recipient = await resolveNotificationRecipient(recipientId, { lookupUser: dependencies.lookupUser });
  const email = recipient.email.trim();
  if (!email) return false;

  const eventCopy = EVENT_COPY[input.event];
  const copy = eventCopy[role];
  const dedupeKey = `${input.caseId}:${input.event}:${role}:${input.transactionId ?? ""}`;
  const notificationType = `dispute_${input.event}`;
  const claim = dependencies.claim ?? claimEmailNotification;
  const markSent = dependencies.markSent ?? markEmailNotificationSent;
  const release = dependencies.release ?? releaseEmailNotification;
  if (!claim(notificationType, dedupeKey)) return false;

  const recipientName = recipient.displayName.trim() || (role === "seller" ? "BuyMesho seller" : "there");
  const details = [
    `Order: ${input.orderId}`,
    input.amount != null ? `Amount: ${input.amount} ${input.currency ?? ""}`.trim() : "",
    input.transactionId ? `Transaction ID: ${input.transactionId}` : "",
    input.note?.trim() ? `Note: ${input.note.trim()}` : "",
  ].filter(Boolean).join("\n");
  const text = `Hello ${recipientName},\n\n${copy}\n\n${details}\n\nView the case: ${actionUrl(role, input.orderId)}\n\nBuyMesho Notifications`;
  const html = `<p>Hello ${escapeHtml(recipientName)},</p><p>${escapeHtml(copy)}</p><p>${escapeHtml(details).replace(/\n/g, "<br />")}</p><p><a href="${escapeHtml(actionUrl(role, input.orderId))}">View the case</a></p><p>BuyMesho Notifications</p>`;

  try {
    await (dependencies.send ?? sendEmail)({
      sender: "notifications",
      to: { email, name: recipientName },
      subject: eventCopy.subject,
      text,
      html,
    });
    markSent(notificationType, dedupeKey);
    return true;
  } catch (error) {
    release(notificationType, dedupeKey);
    throw error;
  }
}

export async function notifyDisputeWorkflowEvent(
  input: DisputeWorkflowNotificationInput,
  dependencies: DeliveryDependencies = {},
): Promise<void> {
  const recipients = input.recipients?.length ? input.recipients : ["buyer", "seller"];
  await Promise.allSettled(recipients.map((role) => sendToRole(input, role, dependencies)));
}

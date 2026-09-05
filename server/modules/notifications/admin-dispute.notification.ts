import { sendEmail } from "../email/email.service.js";
import { claimEmailNotification, markEmailNotificationSent, releaseEmailNotification } from "./email-delivery.repository.js";
import { getConfiguredAdminEmails } from "../../auth/adminAccess.js";

function escapeHtml(value: string): string { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"); }
function adminRecipients(): string[] { return getConfiguredAdminEmails(); }
async function sendAdminMail(subject: string, text: string, html: string, dedupeKey: string): Promise<void> {
  const recipients = adminRecipients();
  if (!recipients.length) { console.warn("Admin notification skipped because ADMIN_EMAILS is not configured."); return; }
  if (!claimEmailNotification("admin_dispute_notification", dedupeKey)) return;
  try { for (const recipient of recipients) await sendEmail({ sender: "notifications", to: { email: recipient, name: "BuyMesho Admin" }, subject, text, html }); markEmailNotificationSent("admin_dispute_notification", dedupeKey); }
  catch (error) { releaseEmailNotification("admin_dispute_notification", dedupeKey); throw error; }
}

export async function notifyAdminSellerRefundRecorded(input: {
  caseId: string; orderId: string; buyerId: string; sellerId: string; amount: number; currency: string; refundMethod: string; transactionId: string; refundDate: string; destination?: string | null; note?: string | null;
}): Promise<void> {
  const details = [`Order: ${input.orderId}`, `Dispute case: ${input.caseId}`, `Buyer: ${input.buyerId}`, `Seller: ${input.sellerId}`, `Refund amount: ${input.amount} ${input.currency}`, `Refund method: ${input.refundMethod}`, `Transaction ID: ${input.transactionId}`, `Refund date: ${input.refundDate}`, input.destination ? `Refund destination: ${input.destination}` : "", input.note?.trim() ? `Seller note: ${input.note.trim()}` : ""].filter(Boolean).join("\n");
  await sendAdminMail("BuyMesho seller refund submitted", `A seller refund has been submitted for a disputed BuyMesho order.\n\n${details}\n\nReview the dispute in Admin Reports.`, `<p>A seller refund has been submitted for a disputed BuyMesho order.</p><p>${escapeHtml(details).replace(/\n/g, "<br />")}</p><p>Review the dispute in Admin Reports.</p>`, `${input.caseId}:seller_refund_admin:${input.transactionId}`);
}

export async function notifyAdminSellerResolutionRecorded(input: {
  caseId: string; orderId: string; buyerId: string; sellerId: string; resolution: "replacement" | "rejected"; reason: string;
}): Promise<void> {
  const label = input.resolution === "replacement" ? "Send another item" : "Reject";
  const details = [`Order: ${input.orderId}`, `Dispute case: ${input.caseId}`, `Buyer: ${input.buyerId}`, `Seller: ${input.sellerId}`, `Seller resolution: ${label}`, `Seller explanation: ${input.reason}`].join("\n");
  await sendAdminMail("BuyMesho seller dispute resolution submitted", `A seller has submitted a resolution for a disputed BuyMesho order.\n\n${details}\n\nReview the dispute in Admin Reports.`, `<p>A seller has submitted a resolution for a disputed BuyMesho order.</p><p>${escapeHtml(details).replace(/\n/g, "<br />")}</p><p>Review the dispute in Admin Reports.</p>`, `${input.caseId}:seller_resolution_admin:${input.resolution}`);
}

export async function notifyAdminSupportRequest(input: { requestId: string; caseId: string; orderId: string; buyerId: string; sellerId: string; reason: string }): Promise<void> {
  const details = [`Support request: ${input.requestId}`, `Order: ${input.orderId}`, `Dispute case: ${input.caseId}`, `Buyer: ${input.buyerId}`, `Seller: ${input.sellerId}`, `Reason: ${input.reason}`].join("\n");
  await sendAdminMail("BuyMesho buyer requested admin assistance", `A buyer has requested admin assistance after a dispute resolution.\n\n${details}\n\nReview the request in the admin dispute workspace.`, `<p>A buyer has requested admin assistance after a dispute resolution.</p><p>${escapeHtml(details).replace(/\n/g, "<br />")}</p><p>Review the request in the admin dispute workspace.</p>`, `${input.requestId}:support_admin`);
}

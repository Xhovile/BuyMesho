import { sendEmail } from "../email/email.service.js";
import { claimEmailNotification, markEmailNotificationSent, releaseEmailNotification } from "./email-delivery.repository.js";

function escapeHtml(value: string): string { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"); }

export async function notifyAdminSellerRefundRecorded(input: {
  caseId: string; orderId: string; buyerId: string; sellerId: string; amount: number; currency: string; refundMethod: string; transactionId: string; refundDate: string; destination?: string | null; note?: string | null;
}): Promise<void> {
  const recipients = (process.env.BUYMESHO_ADMIN_EMAILS ?? process.env.BUYMESHO_ADMIN_EMAIL ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!recipients.length) { console.warn("Seller refund recorded but no BUYMESHO_ADMIN_EMAILS/BUYMESHO_ADMIN_EMAIL is configured."); return; }
  const dedupeKey = `${input.caseId}:seller_refund_admin:${input.transactionId}`;
  if (!claimEmailNotification("admin_seller_refund_recorded", dedupeKey)) return;
  const details = [`Order: ${input.orderId}`, `Dispute case: ${input.caseId}`, `Buyer: ${input.buyerId}`, `Seller: ${input.sellerId}`, `Refund amount: ${input.amount} ${input.currency}`, `Refund method: ${input.refundMethod}`, `Transaction ID: ${input.transactionId}`, `Refund date: ${input.refundDate}`, input.destination ? `Refund destination: ${input.destination}` : "", input.note?.trim() ? `Seller note: ${input.note.trim()}` : ""].filter(Boolean).join("\n");
  const text = `A seller refund has been submitted for a disputed BuyMesho order.\n\n${details}\n\nReview the dispute in Admin Reports.`;
  const html = `<p>A seller refund has been submitted for a disputed BuyMesho order.</p><p>${escapeHtml(details).replace(/\n/g, "<br />")}</p><p>Review the dispute in Admin Reports.</p>`;
  try {
    for (const recipient of recipients) await sendEmail({ sender: "notifications", to: { email: recipient, name: "BuyMesho Admin" }, subject: "BuyMesho seller refund submitted", text, html });
    markEmailNotificationSent("admin_seller_refund_recorded", dedupeKey);
  } catch (error) {
    releaseEmailNotification("admin_seller_refund_recorded", dedupeKey);
    throw error;
  }
}

import { sendEmail } from "../email/email.service.js";
import { claimEmailNotification, markEmailNotificationSent, releaseEmailNotification } from "./email-delivery.repository.js";
import { getConfiguredAdminEmails } from "../../auth/adminAccess.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function adminRecipients(): string[] { return getConfiguredAdminEmails(); }

function renderAdminDisputeEmail(input: {
  title: string;
  intro: string;
  rows: Array<[string, string]>;
  note?: string | null;
  actionLabel?: string;
  actionUrl?: string;
}) {
  const rows = input.rows.filter(([, value]) => value.trim());
  const rowText = rows.map(([label, value]) => `${label}: ${value}`);
  const note = input.note?.trim() || "";
  const actionLabel = input.actionLabel ?? "Open Admin Reports";
  const actionUrl = input.actionUrl ?? "https://buymesho.app/admin/disputes";

  const text = [
    input.intro,
    "",
    ...rowText,
    ...(note ? ["", "Note", note] : []),
    "",
    `${actionLabel}: ${actionUrl}`,
    "",
    "BuyMesho",
  ].join("\n");

  const htmlRows = rows.map(([label, value], index) =>
    `<tr><td style="padding:${index === 0 ? "0 0 10px" : "10px 0"};font-size:14px;color:#6b7280;width:42%;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:${index === 0 ? "0 0 10px" : "10px 0"};font-size:14px;color:#111827;font-weight:700;vertical-align:top;">${escapeHtml(value)}</td></tr>`,
  ).join("");

  const noteBlock = note
    ? `<div style="margin:20px 0;padding:14px 16px;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;"><p style="margin:0 0 8px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;">Note</p><p style="margin:0;font-size:14px;line-height:1.6;color:#111827;white-space:pre-wrap;">${escapeHtml(note)}</p></div>`
    : "";

  const html = `<div style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.6"><div style="max-width:620px;margin:0 auto;padding:32px 20px"><h2 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#111827">${escapeHtml(input.title)}</h2><p style="margin:0 0 22px;font-size:15px;color:#374151">${escapeHtml(input.intro)}</p><div style="margin:0 0 20px;padding:18px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px"><p style="margin:0 0 14px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#6b7280">Dispute details</p><table role="presentation" style="width:100%;border-collapse:collapse">${htmlRows}</table></div>${noteBlock}<p style="margin:0 0 22px"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:14px">${escapeHtml(actionLabel)}</a></p><p style="margin:0;font-size:14px;color:#6b7280">BuyMesho Admin</p></div></div>`;
  return { text, html };
}

async function sendAdminMail(subject: string, template: { text: string; html: string }, dedupeKey: string): Promise<void> {
  const recipients = adminRecipients();
  if (!recipients.length) { console.warn("Admin notification skipped because ADMIN_EMAILS is not configured."); return; }
  if (!claimEmailNotification("admin_dispute_notification", dedupeKey)) return;
  try {
    for (const recipient of recipients) {
      await sendEmail({
        sender: "notifications",
        to: { email: recipient, name: "BuyMesho Admin" },
        subject,
        text: template.text,
        html: template.html,
      });
    }
    markEmailNotificationSent("admin_dispute_notification", dedupeKey);
  } catch (error) {
    releaseEmailNotification("admin_dispute_notification", dedupeKey);
    throw error;
  }
}

export async function notifyAdminSellerRefundRecorded(input: {
  caseId: string; orderId: string; buyerId: string; sellerId: string; amount: number; currency: string; refundMethod: string; transactionId: string; refundDate: string; destination?: string | null; note?: string | null;
}): Promise<void> {
  const template = renderAdminDisputeEmail({
    title: "Seller refund submitted",
    intro: "A seller has submitted refund details for a disputed BuyMesho order. Review the recorded transaction in Admin Reports.",
    rows: [
      ["Order", input.orderId],
      ["Dispute case", input.caseId],
      ["Buyer", input.buyerId],
      ["Seller", input.sellerId],
      ["Refund amount", `${input.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${input.currency}`],
      ["Refund method", input.refundMethod.replaceAll("_", " ")],
      ["Transaction ID", input.transactionId],
      ["Refund date", input.refundDate],
      ["Refund destination", input.destination ?? ""],
    ],
    note: input.note,
  });
  await sendAdminMail("BuyMesho seller refund submitted", template, `${input.caseId}:seller_refund_admin:${input.transactionId}`);
}

export async function notifyAdminSellerResolutionRecorded(input: {
  caseId: string; orderId: string; buyerId: string; sellerId: string; resolution: "replacement" | "rejected"; reason: string;
}): Promise<void> {
  const label = input.resolution === "replacement" ? "Send another item" : "Reject";
  const template = renderAdminDisputeEmail({
    title: "Seller dispute resolution submitted",
    intro: "A seller has submitted a resolution for a disputed BuyMesho order. Review the case in Admin Reports.",
    rows: [
      ["Order", input.orderId],
      ["Dispute case", input.caseId],
      ["Buyer", input.buyerId],
      ["Seller", input.sellerId],
      ["Seller resolution", label],
    ],
    note: input.reason,
  });
  await sendAdminMail("BuyMesho seller dispute resolution submitted", template, `${input.caseId}:seller_resolution_admin:${input.resolution}`);
}

export async function notifyAdminSupportRequest(input: { requestId: string; caseId: string; orderId: string; buyerId: string; sellerId: string; reason: string }): Promise<void> {
  const template = renderAdminDisputeEmail({
    title: "Buyer requested admin assistance",
    intro: "A buyer has requested admin assistance after a dispute resolution. Review the case in the admin dispute workspace.",
    rows: [
      ["Support request", input.requestId],
      ["Order", input.orderId],
      ["Dispute case", input.caseId],
      ["Buyer", input.buyerId],
      ["Seller", input.sellerId],
    ],
    note: input.reason,
  });
  await sendAdminMail("BuyMesho buyer requested admin assistance", template, `${input.requestId}:support_admin`);
}

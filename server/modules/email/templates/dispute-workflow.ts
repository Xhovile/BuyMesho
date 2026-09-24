import { escapeEmailHtml, renderBuyMeshoEmail, renderDetailCard, renderNoteCard } from "./buymesho-email.js";

export type DisputeWorkflowEmailData = {
  recipientName: string;
  title: string;
  intro: string;
  orderId: string;
  eventLabel: string;
  actionUrl: string;
  actionLabel?: string;
  amount?: number | null;
  currency?: string | null;
  refundMethod?: string | null;
  transactionId?: string | null;
  refundDate?: string | null;
  destination?: string | null;
  note?: string | null;
  buyerName?: string | null;
  sellerName?: string | null;
  items?: string[];
  evidence?: string[];
};

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function safeHttpEvidenceUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function renderDisputeWorkflowEmail(data: DisputeWorkflowEmailData) {
  const itemValues = (data.items ?? []).filter(Boolean);
  const evidenceValues = Array.from(new Set((data.evidence ?? []).map(safeHttpEvidenceUrl).filter((value): value is string => Boolean(value)))).slice(0, 20);
  const evidenceHtml = evidenceValues.length ? `<div style="margin:0 0 22px;padding:16px 18px;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;"><p style="margin:0 0 10px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#991b1b;">Evidence</p><div>${evidenceValues.map((url, index) => `<p style="margin:0 0 8px;"><a href="${escapeEmailHtml(url)}" style="font-size:14px;font-weight:700;color:#991b1b;">Open evidence ${index + 1}</a></p>`).join("")}</div></div>` : "";
  const evidenceText = evidenceValues.length ? `Evidence:\n${evidenceValues.map((url, index) => `Evidence ${index + 1}: ${url}`).join("\n")}` : "";
  const details = renderDetailCard(
    [
      ["Order", data.orderId],
      ...(data.buyerName ? [["Buyer", data.buyerName] as [string, string]] : []),
      ...(data.sellerName ? [["Seller", data.sellerName] as [string, string]] : []),
      ...(itemValues.length ? [["Items", itemValues.join(" · ")] as [string, string]] : []),
      ["Status", data.eventLabel],
      ...(data.amount != null && data.currency ? [["Amount", formatAmount(data.amount, data.currency)] as [string, string]] : []),
      ...(data.refundMethod ? [["Refund method", data.refundMethod.replaceAll("_", " ")] as [string, string]] : []),
      ...(data.transactionId ? [["Transaction ID", data.transactionId] as [string, string]] : []),
      ...(data.refundDate ? [["Refund date", data.refundDate] as [string, string]] : []),
      ...(data.destination ? [["Refund destination", data.destination] as [string, string]] : []),
    ],
    "Dispute details",
  );

  const note = data.note?.trim();
  const noteCard = note ? renderNoteCard("Description", note) : "";

  const bodyText = [
    "Dispute details",
    `Order: ${data.orderId}`,
    data.buyerName ? `Buyer: ${data.buyerName}` : "",
    data.sellerName ? `Seller: ${data.sellerName}` : "",
    itemValues.length ? `Items: ${itemValues.join(" · ")}` : "",
    `Status: ${data.eventLabel}`,
    data.amount != null && data.currency ? `Amount: ${formatAmount(data.amount, data.currency)}` : "",
    data.refundMethod ? `Refund method: ${data.refundMethod.replaceAll("_", " ")}` : "",
    data.transactionId ? `Transaction ID: ${data.transactionId}` : "",
    data.refundDate ? `Refund date: ${data.refundDate}` : "",
    data.destination ? `Refund destination: ${data.destination}` : "",
    note ? `Description: ${note}` : "",
    evidenceText,
  ].filter(Boolean).join("\n");

  return renderBuyMeshoEmail({
    recipientName: data.recipientName,
    title: data.title,
    intro: data.intro,
    bodyHtml: `${details}${noteCard}${evidenceHtml}`,
    bodyText,
    action: { label: data.actionLabel ?? "View dispute", url: data.actionUrl },
    preheader: data.intro,
  });
}

import { renderBuyMeshoEmail, renderDetailCard, renderNoteCard } from "./buymesho-email.js";

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
};

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function renderDisputeWorkflowEmail(data: DisputeWorkflowEmailData) {
  const details = renderDetailCard(
    [
      ["Order", data.orderId],
      ["Status", data.eventLabel],
      ...(data.amount != null && data.currency ? [["Amount", formatAmount(data.amount, data.currency)] as const] : []),
      ...(data.refundMethod ? [["Refund method", data.refundMethod.replaceAll("_", " ")] as const] : []),
      ...(data.transactionId ? [["Transaction ID", data.transactionId] as const] : []),
      ...(data.refundDate ? [["Refund date", data.refundDate] as const] : []),
      ...(data.destination ? [["Refund destination", data.destination] as const] : []),
    ],
    "Dispute details",
  );

  const note = data.note?.trim();
  const noteLabel = data.eventLabel.toLowerCase().includes("refund") ? "Seller note" : "Seller explanation";
  const noteCard = note ? renderNoteCard(noteLabel, note) : "";

  const bodyText = [
    "Dispute details",
    `Order: ${data.orderId}`,
    `Status: ${data.eventLabel}`,
    data.amount != null && data.currency ? `Amount: ${formatAmount(data.amount, data.currency)}` : "",
    data.refundMethod ? `Refund method: ${data.refundMethod.replaceAll("_", " ")}` : "",
    data.transactionId ? `Transaction ID: ${data.transactionId}` : "",
    data.refundDate ? `Refund date: ${data.refundDate}` : "",
    data.destination ? `Refund destination: ${data.destination}` : "",
    note ? `${noteLabel}: ${note}` : "",
  ].filter(Boolean).join("\n");

  return renderBuyMeshoEmail({
    recipientName: data.recipientName,
    title: data.title,
    intro: data.intro,
    bodyHtml: `${details}${noteCard}`,
    bodyText,
    action: { label: data.actionLabel ?? "View dispute", url: data.actionUrl },
    preheader: data.intro,
  });
}

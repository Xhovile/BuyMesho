function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
  const recipientName = escapeHtml(data.recipientName);
  const title = escapeHtml(data.title);
  const intro = escapeHtml(data.intro);
  const orderId = escapeHtml(data.orderId);
  const eventLabel = escapeHtml(data.eventLabel);
  const actionUrl = escapeHtml(data.actionUrl);
  const actionLabel = escapeHtml(data.actionLabel ?? "View dispute");

  const rows = [
    ["Order", data.orderId],
    ["Status", data.eventLabel],
    data.amount != null && data.currency ? ["Amount", formatAmount(data.amount, data.currency)] : null,
    data.refundMethod ? ["Refund method", data.refundMethod.replaceAll("_", " ")] : null,
    data.transactionId ? ["Transaction ID", data.transactionId] : null,
    data.refundDate ? ["Refund date", data.refundDate] : null,
    data.destination ? ["Refund destination", data.destination] : null,
  ].filter((row): row is [string, string] => Boolean(row));

  const note = data.note?.trim() || "";
  const text = [
    `Hello ${data.recipientName},`,
    "",
    data.intro,
    "",
    "Dispute details",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(note ? ["", data.eventLabel === "Seller refund recorded" ? "Seller note" : "Seller explanation", note] : []),
    "",
    `${data.actionLabel ?? "View dispute"}: ${data.actionUrl}`,
    "",
    "BuyMesho",
  ].join("\n");

  const htmlRows = rows
    .map(([label, value], index) => `<tr><td style="padding:${index === 0 ? "0 0 10px" : "10px 0"};font-size:14px;color:#6b7280;width:42%;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:${index === 0 ? "0 0 10px" : "10px 0"};font-size:14px;color:#111827;font-weight:700;vertical-align:top;">${escapeHtml(value)}</td></tr>`)
    .join("");

  const noteBlock = note
    ? `<div style="margin:20px 0 20px;padding:14px 16px;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;"><p style="margin:0 0 8px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;">${escapeHtml(data.eventLabel === "Seller refund recorded" ? "Seller note" : "Seller explanation")}</p><p style="margin:0;font-size:14px;line-height:1.6;color:#111827;white-space:pre-wrap;">${escapeHtml(note)}</p></div>`
    : "";

  const html = `
    <div style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.6;">
      <div style="max-width:620px;margin:0 auto;padding:32px 20px;">
        <h2 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#111827;">${title}</h2>
        <p style="margin:0 0 10px;font-size:16px;">Hello ${recipientName},</p>
        <p style="margin:0 0 22px;font-size:15px;color:#374151;">${intro}</p>

        <div style="margin:0 0 20px;padding:18px 18px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
          <p style="margin:0 0 14px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;">Dispute details</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            ${htmlRows}
          </table>
        </div>

        ${noteBlock}

        <p style="margin:0 0 22px;">
          <a href="${actionUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:14px;">${actionLabel}</a>
        </p>
        <p style="margin:0;font-size:14px;color:#6b7280;">If you did not expect this message, please contact BuyMesho Support.</p>
      </div>
    </div>
  `;

  return { text, html };
}

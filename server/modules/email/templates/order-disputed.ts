function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type OrderDisputedEmailData = {
  recipientName: string;
  role: "buyer" | "seller";
  orderId: string;
  counterpartyName: string;
  reason: string;
  actionUrl: string;
};

export function renderOrderDisputedEmail(data: OrderDisputedEmailData) {
  const recipientName = escapeHtml(data.recipientName);
  const orderId = escapeHtml(data.orderId);
  const counterpartyName = escapeHtml(data.counterpartyName);
  const reason = escapeHtml(data.reason);
  const actionUrl = escapeHtml(data.actionUrl);

  const text = [
    `Hello ${data.recipientName},`,
    "",
    `A dispute has been opened for BuyMesho order ${data.orderId}.`,
    `Counterparty: ${data.counterpartyName}`,
    `Reason: ${data.reason}`,
    "",
    "BuyMesho is reviewing the dispute before the order is settled.",
    `View order: ${data.actionUrl}`,
    "",
    "BuyMesho",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin:0 0 16px;">Order dispute opened</h2>
      <p style="margin:0 0 12px;">Hello ${recipientName},</p>
      <p style="margin:0 0 16px;">A dispute has been opened for BuyMesho order <strong>${orderId}</strong>.</p>
      <table style="border-collapse:collapse;margin:0 0 20px;">
        <tr><td style="padding:4px 16px 4px 0;font-weight:700;">Counterparty</td><td style="padding:4px 0;">${counterpartyName}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;font-weight:700;">Reason</td><td style="padding:4px 0;">${reason}</td></tr>
      </table>
      <p style="margin:0 0 16px;">BuyMesho is reviewing the dispute before the order is settled.</p>
      <p style="margin:0 0 20px;"><a href="${actionUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">View order</a></p>
      <p style="margin:0;font-size:14px;color:#6b7280;">BuyMesho</p>
    </div>
  `;

  return { text, html };
}

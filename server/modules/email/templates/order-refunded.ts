function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type OrderRefundedEmailData = {
  recipientName: string;
  role: "buyer" | "seller";
  orderId: string;
  amount: number;
  currency: string;
  counterpartyName: string;
  reason: string;
  actionUrl: string;
};

export function renderOrderRefundedEmail(data: OrderRefundedEmailData) {
  const recipientName = escapeHtml(data.recipientName);
  const orderId = escapeHtml(data.orderId);
  const amount = escapeHtml(String(data.amount));
  const currency = escapeHtml(data.currency);
  const counterpartyName = escapeHtml(data.counterpartyName);
  const reason = escapeHtml(data.reason);
  const actionUrl = escapeHtml(data.actionUrl);

  const intro = data.role === "buyer"
    ? `Your BuyMesho order ${data.orderId} has been refunded.`
    : `Order ${data.orderId} has been refunded and the seller payout will not proceed.`;

  const text = [
    `Hello ${data.recipientName},`,
    "",
    intro,
    `Amount: ${data.currency} ${data.amount}`,
    `Order: ${data.orderId}`,
    `Counterparty: ${data.counterpartyName}`,
    `Refund reason: ${data.reason}`,
    "",
    `View order: ${data.actionUrl}`,
    "",
    "BuyMesho",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin: 0 0 16px;">Order refunded</h2>
      <p style="margin: 0 0 12px;">Hello ${recipientName},</p>
      <p style="margin: 0 0 16px;">${escapeHtml(intro)}</p>
      <table style="border-collapse:collapse;margin:0 0 20px;">
        <tr><td style="padding:4px 16px 4px 0;font-weight:700;">Order</td><td style="padding:4px 0;">${orderId}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;font-weight:700;">Amount</td><td style="padding:4px 0;">${currency} ${amount}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;font-weight:700;">Counterparty</td><td style="padding:4px 0;">${counterpartyName}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;font-weight:700;">Reason</td><td style="padding:4px 0;">${reason}</td></tr>
      </table>
      <p style="margin: 0 0 20px;"><a href="${actionUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">View order</a></p>
      <p style="margin:0;font-size:14px;color:#6b7280;">BuyMesho</p>
    </div>
  `;

  return { text, html };
}

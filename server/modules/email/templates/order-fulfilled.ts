function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderOrderFulfilledEmail(params: {
  recipientName: string;
  orderId: string;
  totalAmount: number;
  currency: string;
  actionUrl: string;
  counterpartyName?: string | null;
}) {
  const recipientName = escapeHtml(params.recipientName);
  const orderId = escapeHtml(params.orderId);
  const currency = escapeHtml(params.currency);
  const counterpartyName = escapeHtml(params.counterpartyName || "");
  const actionUrl = escapeHtml(params.actionUrl);
  const amount = `${currency} ${params.totalAmount.toFixed(2)}`;

  const text = [
    `Hello ${params.recipientName},`,
    "",
    "Your BuyMesho order has been fulfilled.",
    `Order: ${params.orderId}`,
    `Total: ${amount}`,
    params.counterpartyName ? `From: ${params.counterpartyName}` : "",
    "",
    "You can view the order details in BuyMesho.",
    params.actionUrl,
    "",
    "BuyMesho",
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827; max-width: 620px;">
      <h2 style="margin: 0 0 16px;">Order fulfilled</h2>
      <p style="margin: 0 0 12px;">Hello ${recipientName},</p>
      <p style="margin: 0 0 16px;">
        Your BuyMesho order has been marked as <strong>fulfilled</strong>.
      </p>
      <div style="margin: 0 0 20px; padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px;">
        <p style="margin: 0 0 6px;"><strong>Order:</strong> ${orderId}</p>
        <p style="margin: 0 0 6px;"><strong>Total:</strong> ${amount}</p>
        ${params.counterpartyName ? `<p style="margin: 0;"><strong>Other party:</strong> ${counterpartyName}</p>` : ""}
      </div>
      <p style="margin: 0 0 20px;">
        <a href="${actionUrl}"
           style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">
          View order
        </a>
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        BuyMesho
      </p>
    </div>
  `;

  return { text, html };
}

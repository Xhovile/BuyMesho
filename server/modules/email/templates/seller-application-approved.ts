function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderSellerApplicationApprovedEmail(params: {
  recipientName: string;
  businessName: string;
  sellerDashboardUrl: string;
}) {
  const recipientName = escapeHtml(params.recipientName);
  const businessName = escapeHtml(params.businessName);
  const sellerDashboardUrl = escapeHtml(params.sellerDashboardUrl);

  const text = [
    `Hello ${params.recipientName},`,
    "",
    `Your application to sell as ${params.businessName} on BuyMesho has been approved.`,
    "You can now create listings and manage your seller activity from your seller dashboard.",
    "",
    `Open your seller dashboard: ${params.sellerDashboardUrl}`,
    "",
    "Welcome to BuyMesho,",
    "BuyMesho",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin: 0 0 16px;">Your seller application is approved</h2>
      <p style="margin: 0 0 12px;">Hello ${recipientName},</p>
      <p style="margin: 0 0 16px;">Your application to sell as <strong>${businessName}</strong> on BuyMesho has been approved.</p>
      <p style="margin: 0 0 20px;">You can now create listings and manage your seller activity from your seller dashboard.</p>
      <p style="margin: 0 0 20px;">
        <a href="${sellerDashboardUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">Open seller dashboard</a>
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">Welcome to BuyMesho.</p>
    </div>
  `;

  return { text, html };
}

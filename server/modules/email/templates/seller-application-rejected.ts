function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderSellerApplicationRejectedEmail(params: {
  recipientName: string;
  businessName: string;
  reviewNotes?: string | null;
  applicationUrl: string;
}) {
  const recipientName = escapeHtml(params.recipientName);
  const businessName = escapeHtml(params.businessName);
  const reviewNotes = params.reviewNotes?.trim() || "";
  const escapedReviewNotes = escapeHtml(reviewNotes);
  const applicationUrl = escapeHtml(params.applicationUrl);

  const text = [
    `Hello ${params.recipientName},`,
    "",
    `Your seller application for ${params.businessName} was not approved at this time.`,
    reviewNotes ? `Review notes: ${reviewNotes}` : "No additional review notes were provided.",
    "",
    "You may review the seller application requirements and submit a new application when you are ready.",
    `Seller application page: ${params.applicationUrl}`,
    "",
    "BuyMesho",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin: 0 0 16px;">Your seller application was not approved</h2>
      <p style="margin: 0 0 12px;">Hello ${recipientName},</p>
      <p style="margin: 0 0 16px;">Your seller application for <strong>${businessName}</strong> was not approved at this time.</p>
      ${reviewNotes ? `
        <div style="margin: 0 0 20px; padding: 14px 16px; background:#f3f4f6; border-radius:10px;">
          <strong>Review notes</strong>
          <p style="margin: 8px 0 0; white-space: pre-wrap;">${escapedReviewNotes}</p>
        </div>
      ` : ""}
      <p style="margin: 0 0 20px;">You may review the seller application requirements and submit a new application when you are ready.</p>
      <p style="margin: 0 0 20px;">
        <a href="${applicationUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">Open seller application</a>
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">BuyMesho</p>
    </div>
  `;

  return { text, html };
}

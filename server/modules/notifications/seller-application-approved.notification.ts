import { sendEmail } from "../email/email.service.js";
import { renderSellerApplicationApprovedEmail } from "../email/templates/seller-application-approved.js";

type SendEmail = typeof sendEmail;

export type ApprovedSellerApplication = {
  applicantEmail: string;
  fullLegalName?: string | null;
  businessName?: string | null;
};

export async function notifySellerApplicationApproved(
  application: ApprovedSellerApplication,
  dependencies: { send?: SendEmail } = {},
): Promise<void> {
  const email = application.applicantEmail.trim();
  if (!email) return;

  const recipientName = application.fullLegalName?.trim() || "there";
  const businessName = application.businessName?.trim() || "your business";
  const sellerDashboardUrl = "https://buymesho.app/seller/payouts?view=hub";
  const { text, html } = renderSellerApplicationApprovedEmail({
    recipientName,
    businessName,
    sellerDashboardUrl,
  });

  await (dependencies.send ?? sendEmail)({
    sender: "transactional",
    to: { email, name: recipientName },
    subject: "Your BuyMesho seller application has been approved",
    text,
    html,
  });
}

import { sendEmail } from "../email/email.service.js";
import { renderSellerApplicationRejectedEmail } from "../email/templates/seller-application-rejected.js";
import {
  claimEmailNotification,
  markEmailNotificationSent,
  releaseEmailNotification,
} from "./email-delivery.repository.js";

type SendEmail = typeof sendEmail;

export type RejectedSellerApplication = {
  applicationId: string | number;
  applicantEmail: string;
  fullLegalName?: string | null;
  businessName?: string | null;
  reviewNotes?: string | null;
};

type Dependencies = {
  send?: SendEmail;
  claim?: (key: string) => boolean;
  markSent?: (key: string) => void;
  release?: (key: string) => void;
};

export async function notifySellerApplicationRejected(
  application: RejectedSellerApplication,
  dependencies: Dependencies = {},
): Promise<boolean> {
  const email = application.applicantEmail.trim();
  if (!email) return false;

  const key = String(application.applicationId);
  const claim = dependencies.claim ?? ((dedupeKey: string) =>
    claimEmailNotification("seller_application_rejected", dedupeKey));
  const markSent = dependencies.markSent ?? ((dedupeKey: string) =>
    markEmailNotificationSent("seller_application_rejected", dedupeKey));
  const release = dependencies.release ?? ((dedupeKey: string) =>
    releaseEmailNotification("seller_application_rejected", dedupeKey));

  if (!claim(key)) return false;

  try {
    const recipientName = application.fullLegalName?.trim() || "there";
    const businessName = application.businessName?.trim() || "your seller application";
    const applicationUrl = "https://buymesho.app/become-seller";
    const { text, html } = renderSellerApplicationRejectedEmail({
      recipientName,
      businessName,
      reviewNotes: application.reviewNotes,
      applicationUrl,
    });

    await (dependencies.send ?? sendEmail)({
      sender: "transactional",
      to: { email, name: recipientName },
      subject: "Update on your BuyMesho seller application",
      text,
      html,
    });

    markSent(key);
    return true;
  } catch (error) {
    release(key);
    throw error;
  }
}

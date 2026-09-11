import { sendEmail } from "../email/email.service.js";
import { getConfiguredAdminEmails } from "../../auth/adminAccess.js";
import { renderPayoutAdminFailedEmail } from "../email/templates/payout-admin-failed.js";
import { claimEmailNotification, markEmailNotificationSent, releaseEmailNotification } from "./email-delivery.repository.js";

export type AdminPayoutFinalFailedInput = {
  sellerName: string;
  amount: number;
  currency: string;
  payoutId: string;
  orderReference?: string | null;
  orderTitle?: string | null;
  destination?: string | null;
  attemptNo: number;
  failureReason?: string | null;
  failedAt: string;
};

export async function notifyAdminsPayoutFinalFailed(input: AdminPayoutFinalFailedInput): Promise<void> {
  const recipients = getConfiguredAdminEmails();
  if (!recipients.length) {
    console.warn("Admin payout notification skipped because ADMIN_EMAILS is not configured.");
    return;
  }

  const key = `${input.payoutId.trim()}:final_failed`;
  if (!claimEmailNotification("admin_payout_final_failed", key)) return;

  try {
    const { text, html } = renderPayoutAdminFailedEmail({
      ...input,
      dashboardUrl: "https://buymesho.app/admin/payouts",
    });

    for (const recipient of recipients) {
      await sendEmail({
        sender: "notifications",
        to: { email: recipient, name: "BuyMesho Admin" },
        subject: "BuyMesho payout requires manual review",
        text,
        html,
      });
    }

    markEmailNotificationSent("admin_payout_final_failed", key);
  } catch (error) {
    releaseEmailNotification("admin_payout_final_failed", key);
    throw error;
  }
}

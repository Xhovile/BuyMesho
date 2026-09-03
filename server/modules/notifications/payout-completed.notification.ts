import { sendEmail } from "../email/email.service.js";
import { renderPayoutCompletedEmail } from "../email/templates/payout-completed.js";
import { claimEmailNotification, markEmailNotificationSent, releaseEmailNotification } from "./email-delivery.repository.js";

type Send = typeof sendEmail;

type PayoutCompletedInput = {
  email: string;
  sellerName: string;
  amount: number;
  currency: string;
  payoutId: string;
  orderReference?: string | null;
  completedAt: string;
  status: string;
};

export async function notifyPayoutCompleted(input: PayoutCompletedInput, deps: { send?: Send } = {}) {
  if (input.status !== "paid") return false;

  const email = input.email.trim();
  if (!email || !input.payoutId.trim()) return false;

  const dedupeKey = `${input.payoutId.trim()}:${email.toLowerCase()}`;
  if (!claimEmailNotification("payout_completed", dedupeKey)) return false;

  try {
    const { text, html } = renderPayoutCompletedEmail({
      ...input,
      dashboardUrl: "https://buymesho.app/seller/payouts",
    });

    await (deps.send ?? sendEmail)({
      sender: "transactional",
      to: { email, name: input.sellerName },
      subject: "Your BuyMesho payout has been completed",
      text,
      html,
    });

    markEmailNotificationSent("payout_completed", dedupeKey);
    return true;
  } catch (error) {
    releaseEmailNotification("payout_completed", dedupeKey);
    throw error;
  }
}

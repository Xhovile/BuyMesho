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

type NotificationDependencies = {
  send?: Send;
  notificationKey?: string;
  claim?: (key: string) => boolean;
  markSent?: (key: string) => void;
  release?: (key: string) => void;
};

export async function notifyPayoutCompleted(
  input: PayoutCompletedInput,
  deps: NotificationDependencies = {},
): Promise<boolean> {
  if (input.status !== "paid") return false;

  const email = input.email.trim();
  if (!email || !input.payoutId.trim()) return false;

  const key = deps.notificationKey ?? `${input.payoutId.trim()}:${email.toLowerCase()}`;
  const claim = deps.claim ?? ((dedupeKey: string) => claimEmailNotification("payout_completed", dedupeKey));
  const markSent = deps.markSent ?? ((dedupeKey: string) => markEmailNotificationSent("payout_completed", dedupeKey));
  const release = deps.release ?? ((dedupeKey: string) => releaseEmailNotification("payout_completed", dedupeKey));

  if (!claim(key)) return false;

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

    markSent(key);
    return true;
  } catch (error) {
    release(key);
    throw error;
  }
}

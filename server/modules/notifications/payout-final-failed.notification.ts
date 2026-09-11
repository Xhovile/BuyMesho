import { sendEmail } from "../email/email.service.js";
import { renderPayoutFailedEmail } from "../email/templates/payout-failed.js";
import { claimEmailNotification, markEmailNotificationSent, releaseEmailNotification } from "./email-delivery.repository.js";

type Send = typeof sendEmail;

type PayoutFinalFailedInput = {
  email: string;
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

type NotificationDependencies = {
  send?: Send;
  notificationKey?: string;
  claim?: (key: string) => boolean;
  markSent?: (key: string) => void;
  release?: (key: string) => void;
};

export async function notifyPayoutFinalFailed(
  input: PayoutFinalFailedInput,
  deps: NotificationDependencies = {},
): Promise<boolean> {
  if (input.attemptNo < 16 || !input.payoutId.trim()) return false;

  const email = input.email.trim();
  if (!email) return false;

  const key = deps.notificationKey ?? `${input.payoutId.trim()}:${email.toLowerCase()}`;
  const claim = deps.claim ?? ((dedupeKey: string) => claimEmailNotification("payout_final_failed", dedupeKey));
  const markSent = deps.markSent ?? ((dedupeKey: string) => markEmailNotificationSent("payout_final_failed", dedupeKey));
  const release = deps.release ?? ((dedupeKey: string) => releaseEmailNotification("payout_final_failed", dedupeKey));

  if (!claim(key)) return false;

  try {
    const { text, html } = renderPayoutFailedEmail({
      ...input,
      dashboardUrl: "https://buymesho.app/seller/payouts",
    });

    await (deps.send ?? sendEmail)({
      sender: "transactional",
      to: { email, name: input.sellerName },
      subject: "Your BuyMesho payout could not be completed",
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

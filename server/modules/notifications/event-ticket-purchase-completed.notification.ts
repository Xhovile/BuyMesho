import { sendEmail } from "../email/email.service.js";
import { renderEventTicketPurchaseCompletedEmail, type EventTicketPurchaseEmailData } from "../email/templates/event-ticket-purchase-completed.js";
import {
  claimEmailNotification,
  markEmailNotificationSent,
  releaseEmailNotification,
} from "./email-delivery.repository.js";

type Send = typeof sendEmail;
export type EventTicketPurchaseNotificationInput = EventTicketPurchaseEmailData & {
  email: string;
  orderStatus: string;
};

type NotificationDependencies = {
  send?: Send;
  notificationKey?: string;
  claim?: (key: string) => boolean;
  markSent?: (key: string) => void;
  release?: (key: string) => void;
};

const NOTIFICATION_TYPE = "event_ticket_purchase_completed";

export async function notifyEventTicketPurchaseCompleted(
  input: EventTicketPurchaseNotificationInput,
  deps: NotificationDependencies = {},
): Promise<boolean> {
  if (input.orderStatus !== "paid") return false;

  const email = input.email.trim();
  if (!email) return false;

  const key = deps.notificationKey ?? `${input.orderReference}:${email.toLowerCase()}`;
  const claim = deps.claim ?? ((dedupeKey: string) => claimEmailNotification(NOTIFICATION_TYPE, dedupeKey));
  const markSent = deps.markSent ?? ((dedupeKey: string) => markEmailNotificationSent(NOTIFICATION_TYPE, dedupeKey));
  const release = deps.release ?? ((dedupeKey: string) => releaseEmailNotification(NOTIFICATION_TYPE, dedupeKey));

  if (!claim(key)) return false;

  try {
    const { text, html } = renderEventTicketPurchaseCompletedEmail(input);
    await (deps.send ?? sendEmail)({
      sender: "transactional",
      to: { email, name: input.recipientName },
      subject: input.includePaymentDetails
        ? `BuyMesho event ticket purchase confirmed — ${input.eventName}`
        : `Your BuyMesho event ticket is ready — ${input.eventName}`,
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
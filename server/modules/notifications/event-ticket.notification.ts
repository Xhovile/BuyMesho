import { sendEmail } from "../email/email.service.js";
import {
  renderTicketDeliveryEmail,
  renderTicketPurchaseConfirmationEmail,
  type EventTicketEmailData,
} from "../email/templates/event-ticket.js";
import {
  claimEmailNotification,
  markEmailNotificationSent,
  releaseEmailNotification,
} from "./email-delivery.repository.js";

type Send = typeof sendEmail;
export type TicketEmailInput = EventTicketEmailData & { email: string; orderStatus: string };

type NotificationDependencies = {
  send?: Send;
  notificationKey?: string;
  claim?: (key: string) => boolean;
  markSent?: (key: string) => void;
  release?: (key: string) => void;
};

export async function notifyTicketPurchaseConfirmation(
  input: TicketEmailInput,
  deps: NotificationDependencies = {},
): Promise<boolean> {
  if (input.orderStatus !== "paid" && input.orderStatus !== "in_escrow") return false;

  const key = deps.notificationKey ?? input.orderReference;
  const claim = deps.claim ?? ((dedupeKey: string) => claimEmailNotification("ticket_purchase_confirmation", dedupeKey));
  const markSent = deps.markSent ?? ((dedupeKey: string) => markEmailNotificationSent("ticket_purchase_confirmation", dedupeKey));
  const release = deps.release ?? ((dedupeKey: string) => releaseEmailNotification("ticket_purchase_confirmation", dedupeKey));

  if (!claim(key)) return false;

  try {
    const { text, html } = renderTicketPurchaseConfirmationEmail(input);
    await (deps.send ?? sendEmail)({
      sender: "transactional",
      to: { email: input.email, name: input.buyerName },
      subject: "Your BuyMesho ticket purchase is confirmed",
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

export function notifyTicketDelivery(
  input: TicketEmailInput,
  deps: NotificationDependencies = {},
): Promise<boolean> {
  return deliverTicketNotification(
    input,
    "Your BuyMesho event ticket is ready",
    renderTicketDeliveryEmail,
    deps,
  );
}

async function deliverTicketNotification(
  input: TicketEmailInput,
  subject: string,
  render: (data: EventTicketEmailData) => { text: string; html: string },
  deps: NotificationDependencies,
): Promise<boolean> {
  if (input.orderStatus !== "paid" && input.orderStatus !== "in_escrow") return false;

  const key = deps.notificationKey ?? `${input.orderReference}:${input.email}`;
  const claim = deps.claim ?? ((dedupeKey: string) => claimEmailNotification("ticket_delivery", dedupeKey));
  const markSent = deps.markSent ?? ((dedupeKey: string) => markEmailNotificationSent("ticket_delivery", dedupeKey));
  const release = deps.release ?? ((dedupeKey: string) => releaseEmailNotification("ticket_delivery", dedupeKey));

  if (!claim(key)) return false;

  try {
    const { text, html } = render(input);
    await (deps.send ?? sendEmail)({
      sender: "transactional",
      to: { email: input.email, name: input.buyerName },
      subject,
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

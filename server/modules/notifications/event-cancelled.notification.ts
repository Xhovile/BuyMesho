import { sendEmail } from "../email/email.service.js";
import { renderEventCancelledEmail } from "../email/templates/event-cancelled.js";
import { claimEmailNotification, markEmailNotificationSent, releaseEmailNotification } from "./email-delivery.repository.js";

type EventCancelledInput = {
  email: string;
  recipientName?: string;
  eventId: string;
  eventTitle: string;
  eventDate?: string | null;
  startTime?: string | null;
  venue?: string | null;
  location?: string | null;
  reason?: string | null;
  tickets?: Array<{ ticketId: string; ticketType: string }>;
  eventUrl?: string;
};

type NotificationDependencies = {
  send?: typeof sendEmail;
  claim?: (key: string) => boolean;
  markSent?: (key: string) => void;
  release?: (key: string) => void;
};

export async function notifyEventCancelled(input: EventCancelledInput, deps: NotificationDependencies = {}): Promise<boolean> {
  const email = input.email.trim();
  const eventId = input.eventId.trim();
  const eventTitle = input.eventTitle.trim();
  if (!email || !eventId || !eventTitle) return false;

  const dedupeKey = `${eventId}:${email.toLowerCase()}`;
  const claim = deps.claim ?? ((key: string) => claimEmailNotification("event_cancelled", key));
  const markSent = deps.markSent ?? ((key: string) => markEmailNotificationSent("event_cancelled", key));
  const release = deps.release ?? ((key: string) => releaseEmailNotification("event_cancelled", key));

  if (!claim(dedupeKey)) return false;

  try {
    const eventUrl = input.eventUrl?.trim() || `https://buymesho.app/events/${encodeURIComponent(eventId)}`;
    const { text, html } = renderEventCancelledEmail({
      recipientName: input.recipientName?.trim() || "there",
      eventTitle,
      eventDate: input.eventDate ?? null,
      startTime: input.startTime ?? null,
      venue: input.venue ?? null,
      location: input.location ?? null,
      reason: input.reason ?? null,
      tickets: input.tickets ?? [],
      eventUrl,
    });

    await (deps.send ?? sendEmail)({
      sender: "transactional",
      to: { email, name: input.recipientName?.trim() || "there" },
      subject: `Event cancelled: ${eventTitle}`,
      text,
      html,
    });

    markSent(dedupeKey);
    return true;
  } catch (error) {
    release(dedupeKey);
    throw error;
  }
}

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

export async function notifyEventCancelled(input: EventCancelledInput, deps: { send?: typeof sendEmail } = {}): Promise<boolean> {
  const email = input.email.trim();
  const eventId = input.eventId.trim();
  if (!email || !eventId || !input.eventTitle.trim()) return false;

  const dedupeKey = `${eventId}:${email.toLowerCase()}`;
  if (!claimEmailNotification("event_cancelled", dedupeKey)) return false;

  try {
    const eventUrl = input.eventUrl?.trim() || `https://buymesho.app/events/${encodeURIComponent(eventId)}`;
    const { text, html } = renderEventCancelledEmail({
      recipientName: input.recipientName?.trim() || "there",
      eventTitle: input.eventTitle.trim(),
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
      subject: `Event cancelled: ${input.eventTitle.trim()}`,
      text,
      html,
    });

    markEmailNotificationSent("event_cancelled", dedupeKey);
    return true;
  } catch (error) {
    releaseEmailNotification("event_cancelled", dedupeKey);
    throw error;
  }
}

export type EventCancelledEmailInput = {
  recipientName: string;
  eventTitle: string;
  eventDate?: string | null;
  startTime?: string | null;
  venue?: string | null;
  location?: string | null;
  reason?: string | null;
  tickets: Array<{ ticketId: string; ticketType: string }>;
  eventUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEventCancelledEmail(input: EventCancelledEmailInput): { text: string; html: string } {
  const name = input.recipientName.trim() || "there";
  const detailLines = [
    input.eventDate?.trim() ? `Date: ${input.eventDate.trim()}` : null,
    input.startTime?.trim() ? `Time: ${input.startTime.trim()}` : null,
    input.venue?.trim() ? `Venue: ${input.venue.trim()}` : null,
    input.location?.trim() ? `Location: ${input.location.trim()}` : null,
  ].filter((value): value is string => Boolean(value));
  const reason = input.reason?.trim() || null;
  const ticketLines = input.tickets.map((ticket) => `${ticket.ticketType} — ${ticket.ticketId}`);

  const text = [
    `Hi ${name},`,
    "",
    `The event \"${input.eventTitle}\" has been cancelled.`,
    ...detailLines,
    reason ? `Reason: ${reason}` : null,
    "",
    ...(ticketLines.length ? ["Affected tickets:", ...ticketLines.map((line) => `- ${line}`), ""] : []),
    "Please keep this email for your records. BuyMesho will handle any applicable refund according to the order's refund status and process.",
    "",
    `Event details: ${input.eventUrl}`,
    "",
    "BuyMesho",
  ].filter((value): value is string => value !== null);

  const detailsHtml = detailLines.length
    ? `<ul>${detailLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
    : "";
  const reasonHtml = reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : "";
  const ticketsHtml = input.tickets.length
    ? `<h3>Affected tickets</h3><ul>${input.tickets
        .map((ticket) => `<li>${escapeHtml(ticket.ticketType)} — <strong>${escapeHtml(ticket.ticketId)}</strong></li>`)
        .join("")}</ul>`
    : "";

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#222">
    <p>Hi ${escapeHtml(name)},</p>
    <p>The event <strong>${escapeHtml(input.eventTitle)}</strong> has been cancelled.</p>
    ${detailsHtml}
    ${reasonHtml}
    ${ticketsHtml}
    <p>Please keep this email for your records. BuyMesho will handle any applicable refund according to the order's refund status and process.</p>
    <p><a href="${escapeHtml(input.eventUrl)}">View event details</a></p>
    <p>BuyMesho</p>
  </body></html>`;

  return { text: text.join("\n"), html };
}

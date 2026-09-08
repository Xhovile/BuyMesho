import { renderBuyMeshoEmail, renderDetailCard, renderNoteCard } from "./buymesho-email.js";

export type EventCancelledEmailInput = {
  recipientName:string; eventTitle:string; eventDate?:string|null; startTime?:string|null; venue?:string|null; location?:string|null; reason?:string|null;
  tickets:Array<{ticketId:string;ticketType:string}>; eventUrl:string;
};

export function renderEventCancelledEmail(input: EventCancelledEmailInput): {text:string;html:string} {
  const name = input.recipientName.trim() || "there";
  const location = `${input.venue?.trim() ?? ""}${input.location?.trim() ? `, ${input.location.trim()}` : ""}`;
  const detailRows:[string,string][] = [
    ["Event", input.eventTitle], ["Date", input.eventDate?.trim() ?? ""], ["Time", input.startTime?.trim() ?? ""], ["Venue", location], ["Affected tickets", String(input.tickets.length)],
  ];
  const ticketRows = input.tickets.map((ticket,index) => [`Ticket ${index + 1}`, `${ticket.ticketType} — ${ticket.ticketId}`] as [string,string]);
  const bodyHtml = [renderDetailCard(detailRows,"Event details"), input.reason?.trim() ? renderNoteCard("Cancellation reason", input.reason.trim()) : "", ticketRows.length ? renderDetailCard(ticketRows,"Affected tickets") : ""].join("");
  const bodyText = ["Event details", ...detailRows.filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`), input.reason?.trim() ? `Cancellation reason: ${input.reason.trim()}` : "", ticketRows.length ? ["Affected tickets", ...ticketRows.map(([k,v])=>`${k}: ${v}`)].join("\n") : ""].filter(Boolean).join("\n");
  return renderBuyMeshoEmail({
    recipientName:name,
    title:"Event cancelled",
    intro:`The event "${input.eventTitle}" has been cancelled.`,
    bodyHtml,
    bodyText,
    action:{label:"View event details",url:input.eventUrl},
    preheader:`Event cancelled — ${input.eventTitle}`,
    footerText:"Please keep this email for your records. BuyMesho will handle any applicable refund according to the order's refund status and process.",
  });
}

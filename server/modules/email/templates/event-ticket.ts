import { renderBuyMeshoEmail, renderDetailCard } from "./buymesho-email.js";

export type EventTicketEmailItem = {
  ticketId: string;
  ticketType: string;
  holderName?: string;
  holderEmail?: string;
  eventName?: string;
  eventDate?: string;
  startTime?: string;
  venue?: string;
  location?: string;
};

export type EventTicketEmailData = {
  buyerName: string;
  eventName: string;
  ticketType: string;
  quantity: number;
  orderReference: string;
  amount: number;
  currency: string;
  eventDate: string;
  startTime: string;
  venue: string;
  location: string;
  ticketId?: string;
  accessUrl: string;
  tickets?: EventTicketEmailItem[];
};

function details(data: EventTicketEmailData): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ["Event", data.eventName],
    ["Ticket", data.ticketType],
    ["Quantity", String(data.quantity)],
    ["Order reference", data.orderReference],
    ["Amount paid", `${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${data.currency}`],
    ["When", `${data.eventDate} ${data.startTime}`.trim()],
    ["Where", `${data.venue}${data.location ? `, ${data.location}` : ""}`],
  ];
  if (!data.tickets?.length && data.ticketId) rows.push(["Ticket ID", data.ticketId]);
  return rows;
}

function ticketRows(data: EventTicketEmailData): Array<[string, string]> {
  if (!data.tickets?.length) return [];
  return data.tickets.map((ticket, index) => [
    `Ticket ${index + 1}`,
    `${ticket.ticketId} — ${ticket.ticketType}${ticket.holderName ? ` — Holder: ${ticket.holderName}` : ""}`,
  ]);
}

function render(title: string, intro: string, data: EventTicketEmailData, action: string) {
  const rows = details(data);
  const tickets = ticketRows(data);
  const ticketCard = tickets.length ? renderDetailCard(tickets, "Tickets") : "";
  const bodyHtml = `${renderDetailCard(rows, "Order details")}${ticketCard}`;
  const bodyText = [
    "Order details",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(tickets.length ? ["", "Tickets", ...tickets.map(([label, value]) => `${label}: ${value}`)] : []),
  ].join("\n");

  return renderBuyMeshoEmail({
    recipientName: data.buyerName,
    title,
    intro,
    bodyHtml,
    bodyText,
    action: { label: action, url: data.accessUrl },
    preheader: intro,
  });
}

export function renderTicketPurchaseConfirmationEmail(data: EventTicketEmailData) {
  return render("Ticket purchase confirmed", "Your payment was successful and your ticket is ready.", data, "View your ticket");
}

export function renderTicketDeliveryEmail(data: EventTicketEmailData) {
  return render("Your event ticket is ready", "Your event pass has been issued and is ready to access.", data, "Access your ticket");
}

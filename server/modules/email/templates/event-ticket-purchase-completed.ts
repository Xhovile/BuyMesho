import { renderBuyMeshoEmail, renderDetailCard } from "./buymesho-email.js";

export type EventTicketPurchaseItem = {
  ticketId: string;
  ticketType: string;
  holderName?: string;
  holderEmail?: string;
  eventDate?: string;
  startTime?: string;
  venue?: string;
  location?: string;
  downloadUrl: string;
};

export type EventTicketPurchaseEmailData = {
  recipientName: string;
  eventManagerName: string;
  eventName: string;
  orderReference: string;
  amount: number;
  currency: string;
  ticketType: string;
  quantity: number;
  eventDate: string;
  startTime: string;
  venue: string;
  location: string;
  tickets: EventTicketPurchaseItem[];
  includePaymentDetails: boolean;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ticketLinks(tickets: EventTicketPurchaseItem[]) {
  if (!tickets.length) return "";

  return [
    `<div style="margin-top:20px;border:1px solid #e4e4e7;border-radius:16px;padding:16px;background:#ffffff">`,
    `<div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#71717a;margin-bottom:12px">Download tickets</div>`,
    ...tickets.map((ticket, index) => {
      const divider = index === 0 ? "" : "border-top:1px solid #f4f4f5;";
      const holder = ticket.holderName
        ? `<div style="margin-top:3px;font-size:12px;color:#71717a">Holder: ${escapeHtml(ticket.holderName)}</div>`
        : "";
      return [
        `<div style="padding:12px 0;${divider}">`,
        `<div style="font-size:14px;font-weight:700;color:#18181b">${escapeHtml(ticket.ticketType || "Event Ticket")} — ${escapeHtml(ticket.ticketId)}</div>`,
        holder,
        `<div style="margin-top:8px"><a href="${escapeHtml(ticket.downloadUrl)}" style="display:inline-block;padding:9px 13px;border-radius:10px;background:#f97316;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none">&#8595;&nbsp;Download Ticket PDF</a></div>`,
        "</div>",
      ].join("");
    }),
    "</div>",
  ].join("");
}

export function renderEventTicketPurchaseCompletedEmail(data: EventTicketPurchaseEmailData) {
  const orderRows: Array<[string, string]> = [
    ["Event", data.eventName],
    ["Event Manager", data.eventManagerName],
    ["Ticket", data.ticketType],
    ["Quantity", String(data.quantity)],
    ["When", `${data.eventDate} ${data.startTime}`.trim()],
    ["Where", `${data.venue}${data.location ? `, ${data.location}` : ""}`],
  ];

  if (data.includePaymentDetails) {
    orderRows.push(
      ["Payment reference", data.orderReference],
      ["Amount paid", `${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${data.currency}`],
    );
  }

  const ticketRows: Array<[string, string]> = data.tickets.map((ticket, index) => [
    `Ticket ${index + 1}`,
    `${ticket.ticketId} — ${ticket.ticketType || "General Admission"}${ticket.holderName ? ` — Holder: ${ticket.holderName}` : ""}`,
  ]);

  const bodyHtml = [
    renderDetailCard(orderRows, data.includePaymentDetails ? "Purchase details" : "Ticket details"),
    ticketRows.length ? renderDetailCard(ticketRows, "Your tickets") : "",
    ticketLinks(data.tickets),
  ].join("");

  const bodyText = [
    data.includePaymentDetails ? "Purchase details" : "Ticket details",
    ...orderRows.map(([label, value]) => `${label}: ${value}`),
    ticketRows.length ? ["", "Your tickets", ...ticketRows.map(([label, value]) => `${label}: ${value}`)].join("\\n") : "",
    data.tickets.length ? ["", "Download tickets", ...data.tickets.map((ticket, index) => `Ticket ${index + 1}: ${ticket.downloadUrl}`)].join("\\n") : "",
  ].filter(Boolean).join("\\n");

  const intro = data.includePaymentDetails
    ? `Your payment for ${data.eventName} has been confirmed. Your event ticket is ready to download.`
    : `Your event ticket for ${data.eventName} has been issued and is ready to download.`;

  return renderBuyMeshoEmail({
    recipientName: data.recipientName,
    title: data.includePaymentDetails ? "Event ticket purchase confirmed" : "Your event ticket is ready",
    intro,
    bodyHtml,
    bodyText,
    preheader: intro,
  });
}
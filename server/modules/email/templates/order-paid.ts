import { renderBuyMeshoEmail, renderDetailCard } from "./buymesho-email.js";

export function renderOrderPaidEmail(params: {
  recipientName: string;
  role: "buyer" | "seller";
  counterpartyName: string;
  orderId: string;
  totalAmount: number;
  currency: string;
  actionUrl: string;
  isEventOrder?: boolean;
  eventName?: string | null;
}) {
  const formattedTotal = `${params.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${params.currency}`;
  const isBuyer = params.role === "buyer";
  const isEventOrder = params.isEventOrder === true;
  const eventName = params.eventName?.trim() || "your event";

  const title = isEventOrder
    ? isBuyer
      ? "Event payment confirmed"
      : "You have a new event ticket purchase"
    : isBuyer
      ? "Payment confirmed"
      : "You have a new paid order";

  const intro = isEventOrder
    ? isBuyer
      ? `Your payment to ${params.counterpartyName} for ${eventName} has been confirmed and your BuyMesho event ticket purchase is now being processed.`
      : `${params.counterpartyName} has successfully paid for a ticket to your event, ${eventName}.`
    : isBuyer
      ? `Your payment to ${params.counterpartyName} has been confirmed and your BuyMesho order is now being processed.`
      : `${params.counterpartyName} has successfully paid for an order connected to your BuyMesho listing.`;

  const counterpartyLabel = isEventOrder
    ? isBuyer
      ? "Event creator"
      : "Buyer"
    : isBuyer
      ? "Seller"
      : "Buyer";

  const detailRows: Array<[string, string]> = isEventOrder
    ? [
        [counterpartyLabel, params.counterpartyName],
        ["Event", eventName],
        ["Payment reference", params.orderId],
        ["Amount", formattedTotal],
      ]
    : [
        [counterpartyLabel, params.counterpartyName],
        ["Order", params.orderId],
        ["Amount", formattedTotal],
      ];

  const card = renderDetailCard(
    detailRows,
    isEventOrder ? "Event payment details" : "Order details",
  );

  const bodyText = detailRows
    .map(([label, value]) => `${label}: ${value}`)
    .join("\\n");

  const { text, html } = renderBuyMeshoEmail({
    recipientName: params.recipientName,
    title,
    intro,
    bodyHtml: card,
    bodyText,
    action: { label: isEventOrder ? "View event" : "View order", url: params.actionUrl },
    preheader: intro,
  });

  return { text, html, currency: params.currency };
}

import { renderBuyMeshoEmail, renderDetailCard } from "./buymesho-email.js";

export function renderOrderPaidEmail(params: {
  recipientName: string;
  role: "buyer" | "seller";
  counterpartyName: string;
  orderId: string;
  totalAmount: number;
  currency: string;
  actionUrl: string;
}) {
  const formattedTotal = `${params.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${params.currency}`;
  const isBuyer = params.role === "buyer";
  const title = isBuyer ? "Payment confirmed" : "You have a new paid order";
  const intro = isBuyer
    ? `Your payment to ${params.counterpartyName} has been confirmed and your BuyMesho order is now being processed.`
    : `${params.counterpartyName} has successfully paid for an order connected to your BuyMesho listing.`;

  const card = renderDetailCard(
    [
      [isBuyer ? "Seller" : "Buyer", params.counterpartyName],
      ["Order", params.orderId],
      ["Amount", formattedTotal],
    ],
    "Order details",
  );

  const { text, html } = renderBuyMeshoEmail({
    recipientName: params.recipientName,
    title,
    intro,
    bodyHtml: card,
    bodyText: [
      `${isBuyer ? "Seller" : "Buyer"}: ${params.counterpartyName}`,
      `Order: ${params.orderId}`,
      `Amount: ${formattedTotal}`,
    ].join("\n"),
    action: { label: "View order", url: params.actionUrl },
    preheader: intro,
  });

  return { text, html, currency: params.currency };
}

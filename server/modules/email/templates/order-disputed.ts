import { renderBuyMeshoEmail, renderDetailCard, renderNoteCard } from "./buymesho-email.js";

export type OrderDisputedEmailData = {
  recipientName: string;
  role: "buyer" | "seller";
  orderId: string;
  counterpartyName: string;
  reason: string;
  actionUrl: string;
};

export function renderOrderDisputedEmail(data: OrderDisputedEmailData) {
  const intro = data.role === "buyer"
    ? "Your order dispute has been opened and BuyMesho is reviewing the case before the order is settled."
    : "A dispute has been opened for your order. BuyMesho is reviewing the case before the order is settled.";

  const bodyHtml = [
    renderDetailCard(
      [
        ["Order", data.orderId],
        [data.role === "buyer" ? "Seller" : "Buyer", data.counterpartyName],
        ["Reason", data.reason],
      ],
      "Dispute details",
    ),
  ].join("");

  const bodyText = [
    "Dispute details",
    `Order: ${data.orderId}`,
    `${data.role === "buyer" ? "Seller" : "Buyer"}: ${data.counterpartyName}`,
    `Reason: ${data.reason}`,
  ].join("\n");

  return renderBuyMeshoEmail({
    recipientName: data.recipientName,
    title: "Order dispute opened",
    intro,
    bodyHtml: `${bodyHtml}${renderNoteCard("Important", "BuyMesho is reviewing the dispute before the order is settled.")}`,
    bodyText: `${bodyText}\n\nBuyMesho is reviewing the dispute before the order is settled.`,
    action: { label: "View order", url: data.actionUrl },
    preheader: intro,
  });
}

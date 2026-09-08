import { renderBuyMeshoEmail, renderDetailCard } from "./buymesho-email.js";

export function renderOrderFulfilledEmail(params: { recipientName:string; orderId:string; totalAmount:number; currency:string; actionUrl:string; counterpartyName?:string|null; role:"buyer"|"seller"; }) {
  const amount = `${params.currency} ${params.totalAmount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const isBuyer = params.role === "buyer";
  const intro = isBuyer
    ? "You have successfully confirmed delivery of your order."
    : `${params.counterpartyName || "The buyer"} has confirmed delivery of the order.`;
  const body = renderDetailCard([
    ["Order", params.orderId],
    ["Total", amount],
    ...(isBuyer && params.counterpartyName ? [["Seller", params.counterpartyName] as [string,string]] : []),
  ], "Order details");
  return renderBuyMeshoEmail({
    recipientName: params.recipientName,
    title: "Order delivery confirmed",
    intro,
    bodyHtml: body,
    bodyText: `Order details\nOrder: ${params.orderId}\nTotal: ${amount}${isBuyer && params.counterpartyName ? `\nSeller: ${params.counterpartyName}` : ""}`,
    action: { label: isBuyer ? "View order" : "View payout information", url: params.actionUrl },
    preheader: "BuyMesho order delivery confirmed",
  });
}

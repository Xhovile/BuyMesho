import { renderBuyMeshoEmail, renderDetailCard } from "./buymesho-email.js";

export type OrderRefundedEmailData = { recipientName:string; role:"buyer"|"seller"; orderId:string; amount:number; currency:string; counterpartyName:string; reason:string; actionUrl:string; };

export function renderOrderRefundedEmail(data: OrderRefundedEmailData) {
  const amount = `${data.currency} ${data.amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const intro = data.role === "buyer"
    ? `Your BuyMesho order ${data.orderId} has been refunded.`
    : `Order ${data.orderId} has been refunded and the seller payout will not proceed.`;
  return renderBuyMeshoEmail({
    recipientName: data.recipientName,
    title: "Order refunded",
    intro,
    bodyHtml: renderDetailCard([["Order",data.orderId],["Amount",amount],["Counterparty",data.counterpartyName],["Refund reason",data.reason]],"Refund details"),
    bodyText: `Refund details\nOrder: ${data.orderId}\nAmount: ${amount}\nCounterparty: ${data.counterpartyName}\nRefund reason: ${data.reason}`,
    action: { label: "View order", url: data.actionUrl },
    preheader: `BuyMesho order ${data.orderId} has been refunded`,
  });
}

import { renderBuyMeshoEmail, renderDetailCard } from "./buymesho-email.js";

export function renderPayoutCompletedEmail(data:{sellerName:string;amount:number;currency:string;payoutId:string;orderReference?:string|null;orderTitle?:string|null;destination?:string|null;completedAt:string;dashboardUrl:string;}) {
  const amount = `${data.amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${data.currency}`;
  const itemSuffix = data.orderTitle ? ` for ${data.orderTitle}` : "";
  const destinationSuffix = data.destination ? ` to ${data.destination}` : "";
  const intro = `Your payout of ${amount}${itemSuffix} was successfully sent${destinationSuffix}.`;
  const details = renderDetailCard([
    ["Payout reference", data.payoutId],
    ...(data.orderReference ? [["Order reference", data.orderReference] as [string,string]] : []),
    ...(data.orderTitle ? [["Items", data.orderTitle] as [string,string]] : []),
    ["Amount", amount],
    ...(data.destination ? [["Sent to", data.destination] as [string,string]] : []),
    ["Completed", data.completedAt],
  ], "Payout details");
  const result = renderBuyMeshoEmail({
    recipientName: data.sellerName,
    title: "Payout completed",
    intro,
    bodyHtml: details,
    bodyText: `Payout details\nPayout reference: ${data.payoutId}\n${data.orderReference ? `Order reference: ${data.orderReference}\n` : ""}${data.orderTitle ? `Items: ${data.orderTitle}\n` : ""}Amount: ${amount}\n${data.destination ? `Sent to: ${data.destination}\n` : ""}Completed: ${data.completedAt}`,
    action: { label: "View payouts", url: data.dashboardUrl },
    preheader: `Payout completed — ${amount}${itemSuffix}`,
  });
  return result;
}

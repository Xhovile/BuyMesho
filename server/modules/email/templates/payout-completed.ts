import { renderBuyMeshoEmail, renderDetailCard } from "./buymesho-email.js";

export function renderPayoutCompletedEmail(data:{sellerName:string;amount:number;currency:string;payoutId:string;orderReference?:string|null;orderTitle?:string|null;destination?:string|null;completedAt:string;dashboardUrl:string;isEventPayout?:boolean;eventName?:string|null;}) {
  const amount = `${data.amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${data.currency}`;
  const isEventPayout = data.isEventPayout === true;
  const eventName = data.eventName?.trim() || "your event";
  const itemSuffix = data.orderTitle ? ` for ${data.orderTitle}` : "";
  const destinationSuffix = data.destination ? ` to ${data.destination}` : "";
  const intro = isEventPayout ? `Your payout of ${amount} for ${eventName} was successfully sent${destinationSuffix}.` : `Your payout of ${amount}${itemSuffix} was successfully sent${destinationSuffix}.`;
  const details = renderDetailCard([
    ["Payout reference", data.payoutId],
    ...(data.orderReference ? [[isEventPayout ? "Event payment reference" : "Order reference", data.orderReference] as [string,string]] : []),
    ...(isEventPayout ? [["Event", eventName] as [string,string]] : data.orderTitle ? [["Items", data.orderTitle] as [string,string]] : []),
    ["Amount", amount],
    ...(data.destination ? [["Sent to", data.destination] as [string,string]] : []),
    ["Completed", data.completedAt],
  ], isEventPayout ? "Event payout details" : "Payout details");
  const result = renderBuyMeshoEmail({
    recipientName: data.sellerName,
    title: isEventPayout ? "Event payout completed" : "Payout completed",
    intro,
    bodyHtml: details,
    bodyText: isEventPayout ? `Event payout details\nPayout reference: ${data.payoutId}\n${data.orderReference ? `Event payment reference: ${data.orderReference}\n` : ""}Event: ${eventName}\nAmount: ${amount}\n${data.destination ? `Sent to: ${data.destination}\n` : ""}Completed: ${data.completedAt}` : `Payout details\nPayout reference: ${data.payoutId}\n${data.orderReference ? `Order reference: ${data.orderReference}\n` : ""}${data.orderTitle ? `Items: ${data.orderTitle}\n` : ""}Amount: ${amount}\n${data.destination ? `Sent to: ${data.destination}\n` : ""}Completed: ${data.completedAt}`,
    action: { label: isEventPayout ? "View event payouts" : "View payouts", url: data.dashboardUrl },
    preheader: isEventPayout ? `Event payout completed — ${eventName}` : `Payout completed — ${amount}${itemSuffix}`,
  });
  return result;
}

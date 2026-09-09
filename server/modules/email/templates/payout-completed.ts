import { renderBuyMeshoEmail, renderDetailCard } from "./buymesho-email.js";

export function renderPayoutCompletedEmail(data:{sellerName:string;amount:number;currency:string;payoutId:string;orderReference?:string|null;completedAt:string;dashboardUrl:string;}) {
  const amount = `${data.amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${data.currency}`;
  const details = renderDetailCard([
    ["Payout reference", data.payoutId],
    ...(data.orderReference ? [["Order reference", data.orderReference] as [string,string]] : []),
    ["Amount", amount],
    ["Completed", data.completedAt],
  ], "Payout details");
  const result = renderBuyMeshoEmail({
    recipientName: data.sellerName,
    title: "Payout completed",
    intro: `Your payout of ${amount} has been completed.`,
    bodyHtml: details,
    bodyText: `Payout details\nPayout reference: ${data.payoutId}\n${data.orderReference ? `Order reference: ${data.orderReference}\n` : ""}Amount: ${amount}\nCompleted: ${data.completedAt}`,
    action: { label: "View payouts", url: data.dashboardUrl },
    preheader: `Payout completed — ${amount}`,
  });
  return result;
}

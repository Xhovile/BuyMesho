import { renderBuyMeshoEmail, renderDetailCard, renderNoteCard } from "./buymesho-email.js";

export type PayoutAdminFailedEmailData = {
  sellerName: string;
  amount: number;
  currency: string;
  payoutId: string;
  orderReference?: string | null;
  orderTitle?: string | null;
  destination?: string | null;
  attemptNo: number;
  failureReason?: string | null;
  failedAt: string;
  dashboardUrl: string;
};

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function renderPayoutAdminFailedEmail(data: PayoutAdminFailedEmailData) {
  const amount = formatAmount(data.amount, data.currency);
  const reason = data.failureReason?.trim() || "The payout could not be completed by the payment provider.";
  const details = renderDetailCard(
    [
      ["Payout reference", data.payoutId],
      ["Seller", data.sellerName],
      ...(data.orderReference ? [["Order reference", data.orderReference] as [string, string]] : []),
      ...(data.orderTitle ? [["Items", data.orderTitle] as [string, string]] : []),
      ["Amount", amount],
      ...(data.destination ? [["Destination", data.destination] as [string, string]] : []),
      ["Attempts", `${data.attemptNo}`],
      ["Failure reason", reason],
      ["Failed", data.failedAt],
    ],
    "Payout review details",
  );

  const note = renderNoteCard(
    "Action required",
    "The payout has reached the maximum automatic retry limit. Review the payout in the admin payout workspace and take the appropriate manual action.",
  );

  return renderBuyMeshoEmail({
    recipientName: "BuyMesho Admin",
    title: "Payout requires manual review",
    intro: `A payout for ${data.sellerName} has failed after ${data.attemptNo} attempts and now requires manual review.`,
    bodyHtml: `${details}${note}`,
    bodyText: [
      "Payout review details",
      `Payout reference: ${data.payoutId}`,
      `Seller: ${data.sellerName}`,
      data.orderReference ? `Order reference: ${data.orderReference}` : "",
      data.orderTitle ? `Items: ${data.orderTitle}` : "",
      `Amount: ${amount}`,
      data.destination ? `Destination: ${data.destination}` : "",
      `Attempts: ${data.attemptNo}`,
      `Failure reason: ${reason}`,
      `Failed: ${data.failedAt}`,
      "",
      "Action required",
      "The payout has reached the maximum automatic retry limit. Review the payout in the admin payout workspace and take the appropriate manual action.",
    ].filter(Boolean).join("\n"),
    action: { label: "Open Admin Payouts", url: data.dashboardUrl },
    preheader: `Payout ${data.payoutId} requires manual review after ${data.attemptNo} attempts`,
  });
}

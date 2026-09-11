import { renderBuyMeshoEmail, renderDetailCard, renderNoteCard } from "./buymesho-email.js";

export type PayoutFailedEmailData = {
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

export function renderPayoutFailedEmail(data: PayoutFailedEmailData) {
  const amount = formatAmount(data.amount, data.currency);
  const itemSuffix = data.orderTitle ? ` for ${data.orderTitle}` : "";
  const destinationSuffix = data.destination ? ` to ${data.destination}` : "";
  const intro = `We could not complete your payout of ${amount}${itemSuffix}${destinationSuffix} after ${data.attemptNo} attempts.`;
  const reason = data.failureReason?.trim() || "The payout could not be completed by the payment provider.";
  const note = renderNoteCard(
    "What happens next",
    "Your payout has reached the automatic retry limit and now requires manual review. Please review the payout details or contact BuyMesho support if you need assistance.",
  );
  const details = renderDetailCard(
    [
      ["Payout reference", data.payoutId],
      ...(data.orderReference ? [["Order reference", data.orderReference] as [string, string]] : []),
      ...(data.orderTitle ? [["Items", data.orderTitle] as [string, string]] : []),
      ["Amount", amount],
      ...(data.destination ? [["Sent to", data.destination] as [string, string]] : []),
      ["Attempts", String(data.attemptNo)],
      ["Failure reason", reason],
      ["Failed", data.failedAt],
    ],
    "Payout details",
  );

  return renderBuyMeshoEmail({
    recipientName: data.sellerName,
    title: "Payout could not be completed",
    intro,
    bodyHtml: `${details}${note}`,
    bodyText: [
      "Payout details",
      `Payout reference: ${data.payoutId}`,
      data.orderReference ? `Order reference: ${data.orderReference}` : "",
      data.orderTitle ? `Items: ${data.orderTitle}` : "",
      `Amount: ${amount}`,
      data.destination ? `Sent to: ${data.destination}` : "",
      `Attempts: ${data.attemptNo}`,
      `Failure reason: ${reason}`,
      `Failed: ${data.failedAt}`,
      "",
      "What happens next",
      "Your payout has reached the automatic retry limit and now requires manual review. Please review the payout details or contact BuyMesho support if you need assistance.",
    ].filter(Boolean).join("\n"),
    action: { label: "View payout", url: data.dashboardUrl },
    preheader: `Payout could not be completed after ${data.attemptNo} attempts${itemSuffix}`,
  });
}

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
  isEventPayout?: boolean;
  eventName?: string | null;
};

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function renderPayoutFailedEmail(data: PayoutFailedEmailData) {
  const amount = formatAmount(data.amount, data.currency);
  const isEventPayout = data.isEventPayout === true;
  const eventName = data.eventName?.trim() || "your event";
  const itemSuffix = data.orderTitle ? ` for ${data.orderTitle}` : "";
  const destinationSuffix = data.destination ? ` to ${data.destination}` : "";
  const intro = isEventPayout ? `We could not complete your payout of ${amount} for ${eventName}${destinationSuffix} after ${data.attemptNo} attempts.` : `We could not complete your payout of ${amount}${itemSuffix}${destinationSuffix} after ${data.attemptNo} attempts.`;
  const reason = data.failureReason?.trim() || "The payout could not be completed by the payment provider.";
  const note = renderNoteCard(
    "What happens next",
    "Your payout has reached the automatic retry limit and now requires manual review. Please review the payout details or contact BuyMesho support if you need assistance.",
  );
  const details = renderDetailCard(
    [
      ["Payout reference", data.payoutId],
      ...(data.orderReference ? [[isEventPayout ? "Event payment reference" : "Order reference", data.orderReference] as [string, string]] : []),
      ...(isEventPayout ? [["Event", eventName] as [string, string]] : data.orderTitle ? [["Items", data.orderTitle] as [string, string]] : []),
      ["Amount", amount],
      ...(data.destination ? [["Sent to", data.destination] as [string, string]] : []),
      ["Attempts", String(data.attemptNo)],
      ["Failure reason", reason],
      ["Failed", data.failedAt],
    ],
    isEventPayout ? "Event payout details" : "Payout details",
  );

  return renderBuyMeshoEmail({
    recipientName: data.sellerName,
    title: isEventPayout ? "Event payout could not be completed" : "Payout could not be completed",
    intro,
    bodyHtml: `${details}${note}`,
    bodyText: [
      "Payout details",
      `Payout reference: ${data.payoutId}`,
      data.orderReference ? `${isEventPayout ? "Event payment reference" : "Order reference"}: ${data.orderReference}` : "",
      isEventPayout ? `Event: ${eventName}` : (data.orderTitle ? `Items: ${data.orderTitle}` : ""),
      `Amount: ${amount}`,
      data.destination ? `Sent to: ${data.destination}` : "",
      `Attempts: ${data.attemptNo}`,
      `Failure reason: ${reason}`,
      `Failed: ${data.failedAt}`,
      "",
      "What happens next",
      "Your payout has reached the automatic retry limit and now requires manual review. Please review the payout details or contact BuyMesho support if you need assistance.",
    ].filter(Boolean).join("\n"),
    action: { label: isEventPayout ? "View event payout" : "View payout", url: data.dashboardUrl },
    preheader: isEventPayout ? `Event payout could not be completed — ${eventName}` : `Payout could not be completed after ${data.attemptNo} attempts${itemSuffix}`,
  });
}

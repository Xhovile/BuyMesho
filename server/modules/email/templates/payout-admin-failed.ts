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
  isEventPayout?: boolean;
  eventName?: string | null;
};

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function renderPayoutAdminFailedEmail(data: PayoutAdminFailedEmailData) {
  const amount = formatAmount(data.amount, data.currency);
  const isEventPayout = Boolean(data.isEventPayout);
  const reason = data.failureReason?.trim() || "The payout could not be completed by the payment provider.";
  const details = renderDetailCard(
    [
      [isEventPayout ? "Event payout reference" : "Payout reference", data.payoutId],
      [isEventPayout ? "Event Manager" : "Seller", data.sellerName],
      ...(isEventPayout
        ? data.eventName
          ? [["Event", data.eventName] as [string, string]]
          : []
        : data.orderReference
          ? [["Order reference", data.orderReference] as [string, string]]
          : []),
      ...(!isEventPayout && data.orderTitle ? [["Items", data.orderTitle] as [string, string]] : []),
      ["Amount", amount],
      ...(data.destination ? [["Destination", data.destination] as [string, string]] : []),
      ["Attempts", `${data.attemptNo}`],
      ["Failure reason", reason],
      ["Failed", data.failedAt],
    ],
    isEventPayout ? "Event payout review details" : "Payout review details",
  );

  const note = renderNoteCard(
    "Action required",
    "The payout has reached the maximum automatic retry limit. Review the payout in the admin payout workspace and take the appropriate manual action.",
  );

  return renderBuyMeshoEmail({
    recipientName: "BuyMesho Admin",
    title: isEventPayout ? "Event payout requires manual review" : "Payout requires manual review",
    intro: isEventPayout
      ? `An event payout for ${data.sellerName}${data.eventName ? ` (${data.eventName})` : ""} has failed after ${data.attemptNo} attempts and now requires manual review.`
      : `A payout for ${data.sellerName} has failed after ${data.attemptNo} attempts and now requires manual review.`,
    bodyHtml: `${details}${note}`,
    bodyText: [
      isEventPayout ? "Event payout review details" : "Payout review details",
      `${isEventPayout ? "Event payout reference" : "Payout reference"}: ${data.payoutId}`,
      `${isEventPayout ? "Event Manager" : "Seller"}: ${data.sellerName}`,
      ...(isEventPayout
        ? data.eventName ? [`Event: ${data.eventName}`] : []
        : [
            data.orderReference ? `Order reference: ${data.orderReference}` : "",
            data.orderTitle ? `Items: ${data.orderTitle}` : "",
          ]),
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
    preheader: `${isEventPayout ? "Event payout" : "Payout"} ${data.payoutId} requires manual review after ${data.attemptNo} attempts`,
  });
}

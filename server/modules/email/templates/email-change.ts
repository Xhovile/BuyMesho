import { renderBuyMeshoEmail, renderDetailCard, renderNoteCard, escapeEmailHtml } from "./buymesho-email.js";

export function renderEmailChangeEmail(params: { recipientName: string; newEmail: string; verificationLink: string }) {
  const body = [
    renderDetailCard([["New email address", params.newEmail]], "Account change"),
    renderNoteCard("Security notice", "Only confirm this change if you requested it. If you did not, contact BuyMesho Support."),
    `<p style="margin:0;font-size:14px;color:#6b7280;word-break:break-all;">Or copy this link: ${escapeEmailHtml(params.verificationLink)}</p>`,
  ].join("");
  return renderBuyMeshoEmail({
    recipientName: params.recipientName,
    title: "Confirm your new email",
    intro: "We received a request to change the email address on your BuyMesho account.",
    bodyHtml: body,
    bodyText: `Account change\nNew email address: ${params.newEmail}\n\nSecurity notice\nOnly confirm this change if you requested it.\n\nConfirmation link: ${params.verificationLink}`,
    action: { label: "Confirm email change", url: params.verificationLink },
    preheader: "Confirm your new BuyMesho email address",
  });
}

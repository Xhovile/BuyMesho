import { renderBuyMeshoEmail, renderDetailCard } from "./buymesho-email.js";

export function renderVerificationEmail(params: { recipientName: string; verificationLink: string }) {
  const body = renderDetailCard([["Security action", "Verify your BuyMesho email address"]], "Account security");
  return renderBuyMeshoEmail({
    recipientName: params.recipientName,
    title: "Verify your email",
    intro: "Please verify your email address for BuyMesho to complete your account setup.",
    bodyHtml: body,
    bodyText: "Account security\nSecurity action: Verify your BuyMesho email address",
    action: { label: "Verify email", url: params.verificationLink },
    preheader: "Verify your BuyMesho email address",
    footerText: "If you did not create this account, you can ignore this email.",
  });
}

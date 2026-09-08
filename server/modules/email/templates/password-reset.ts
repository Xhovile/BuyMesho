import { renderBuyMeshoEmail, renderDetailCard } from "./buymesho-email.js";

export function renderPasswordResetEmail(params: { recipientName: string; resetLink: string }) {
  const body = renderDetailCard([["Security action", "Reset your BuyMesho password"]], "Account security");
  return renderBuyMeshoEmail({
    recipientName: params.recipientName,
    title: "Reset your password",
    intro: "We received a request to reset your BuyMesho password. Use the button below to choose a new password.",
    bodyHtml: body,
    bodyText: "Account security\nSecurity action: Reset your BuyMesho password",
    action: { label: "Reset password", url: params.resetLink },
    preheader: "Reset your BuyMesho password",
    footerText: "If you did not request a password reset, you can ignore this email.",
  });
}

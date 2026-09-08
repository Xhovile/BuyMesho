import { renderBuyMeshoEmail, renderDetailCard } from "./buymesho-email.js";

export function renderSellerApplicationApprovedEmail(params: { recipientName: string; businessName: string; sellerDashboardUrl: string }) {
  return renderBuyMeshoEmail({
    recipientName: params.recipientName,
    title: "Your seller application is approved",
    intro: `Your application to sell as ${params.businessName} on BuyMesho has been approved.`,
    bodyHtml: renderDetailCard([["Business", params.businessName], ["Status", "Approved"]], "Seller application"),
    bodyText: `Seller application\nBusiness: ${params.businessName}\nStatus: Approved`,
    action: { label: "Open seller dashboard", url: params.sellerDashboardUrl },
    preheader: `Your seller application for ${params.businessName} was approved`,
    footerText: "You can now create listings and manage your seller activity from your seller dashboard.",
  });
}

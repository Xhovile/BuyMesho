import { renderBuyMeshoEmail, renderDetailCard, renderNoteCard } from "./buymesho-email.js";

export function renderSellerApplicationRejectedEmail(params: { recipientName: string; businessName: string; reviewNotes?: string | null; applicationUrl: string }) {
  const note = params.reviewNotes?.trim() || "";
  const body = [
    renderDetailCard([["Business", params.businessName], ["Status", "Not approved"]], "Seller application"),
    note ? renderNoteCard("Review notes", note) : "",
  ].join("");
  return renderBuyMeshoEmail({
    recipientName: params.recipientName,
    title: "Your seller application was not approved",
    intro: `Your seller application for ${params.businessName} was not approved at this time.`,
    bodyHtml: body,
    bodyText: `Seller application\nBusiness: ${params.businessName}\nStatus: Not approved${note ? `\n\nReview notes\n${note}` : "\n\nNo additional review notes were provided."}`,
    action: { label: "Open seller application", url: params.applicationUrl },
    preheader: `Seller application update for ${params.businessName}`,
    footerText: "You may review the seller application requirements and submit a new application when you are ready.",
  });
}

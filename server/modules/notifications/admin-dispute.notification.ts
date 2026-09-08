import { sendEmail } from "../email/email.service.js";
import { claimEmailNotification, markEmailNotificationSent, releaseEmailNotification } from "./email-delivery.repository.js";
import { getConfiguredAdminEmails } from "../../auth/adminAccess.js";
import { renderBuyMeshoEmail, renderDetailCard, renderNoteCard } from "../email/templates/buymesho-email.js";

function adminRecipients(): string[] { return getConfiguredAdminEmails(); }

async function sendAdminMail(subject: string, template: { text: string; html: string }, dedupeKey: string): Promise<void> {
  const recipients = adminRecipients();
  if (!recipients.length) { console.warn("Admin notification skipped because ADMIN_EMAILS is not configured."); return; }
  if (!claimEmailNotification("admin_dispute_notification", dedupeKey)) return;
  try {
    for (const recipient of recipients) {
      await sendEmail({ sender: "notifications", to: { email: recipient, name: "BuyMesho Admin" }, subject, text: template.text, html: template.html });
    }
    markEmailNotificationSent("admin_dispute_notification", dedupeKey);
  } catch (error) {
    releaseEmailNotification("admin_dispute_notification", dedupeKey);
    throw error;
  }
}

export async function notifyAdminSellerRefundRecorded(input: { caseId:string; orderId:string; buyerId:string; sellerId:string; amount:number; currency:string; refundMethod:string; transactionId:string; refundDate:string; destination?:string|null; note?:string|null; }): Promise<void> {
  const amount = `${input.amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${input.currency}`;
  const bodyHtml = `${renderDetailCard([["Order",input.orderId],["Dispute case",input.caseId],["Buyer",input.buyerId],["Seller",input.sellerId],["Refund amount",amount],["Refund method",input.refundMethod.replaceAll("_"," ")],["Transaction ID",input.transactionId],["Refund date",input.refundDate],["Refund destination",input.destination ?? ""]],"Refund details")}${input.note?.trim() ? renderNoteCard("Seller note",input.note.trim()) : ""}`;
  const template = renderBuyMeshoEmail({ recipientName:"BuyMesho Admin", title:"Seller refund submitted", intro:"A seller has submitted refund details for a disputed BuyMesho order. Review the recorded transaction in Admin Reports.", bodyHtml, bodyText:`Refund details\nOrder: ${input.orderId}\nDispute case: ${input.caseId}\nBuyer: ${input.buyerId}\nSeller: ${input.sellerId}\nRefund amount: ${amount}\nRefund method: ${input.refundMethod}\nTransaction ID: ${input.transactionId}\nRefund date: ${input.refundDate}${input.destination ? `\nRefund destination: ${input.destination}` : ""}${input.note?.trim() ? `\n\nSeller note\n${input.note.trim()}` : ""}`, action:{label:"Open Admin Reports",url:"https://buymesho.app/admin/disputes"}, preheader:"Seller refund submitted for a BuyMesho dispute" });
  await sendAdminMail("BuyMesho seller refund submitted",template,`${input.caseId}:seller_refund_admin:${input.transactionId}`);
}

export async function notifyAdminSellerResolutionRecorded(input: { caseId:string; orderId:string; buyerId:string; sellerId:string; resolution:"replacement"|"rejected"; reason:string; }): Promise<void> {
  const label = input.resolution === "replacement" ? "Send another item" : "Reject";
  const template = renderBuyMeshoEmail({ recipientName:"BuyMesho Admin", title:"Seller dispute resolution submitted", intro:"A seller has submitted a resolution for a disputed BuyMesho order. Review the case in Admin Reports.", bodyHtml:`${renderDetailCard([["Order",input.orderId],["Dispute case",input.caseId],["Buyer",input.buyerId],["Seller",input.sellerId],["Seller resolution",label]],"Resolution details")}${renderNoteCard("Seller explanation",input.reason)}`, bodyText:`Resolution details\nOrder: ${input.orderId}\nDispute case: ${input.caseId}\nBuyer: ${input.buyerId}\nSeller: ${input.sellerId}\nSeller resolution: ${label}\n\nSeller explanation\n${input.reason}`, action:{label:"Open Admin Reports",url:"https://buymesho.app/admin/disputes"}, preheader:`Seller ${label.toLowerCase()} submitted for a BuyMesho dispute` });
  await sendAdminMail("BuyMesho seller dispute resolution submitted",template,`${input.caseId}:seller_resolution_admin:${input.resolution}`);
}

export async function notifyAdminSupportRequest(input: { requestId:string; caseId:string; orderId:string; buyerId:string; sellerId:string; reason:string }): Promise<void> {
  const template = renderBuyMeshoEmail({ recipientName:"BuyMesho Admin", title:"Buyer requested admin assistance", intro:"A buyer has requested admin assistance after a dispute resolution. Review the case in the admin dispute workspace.", bodyHtml:`${renderDetailCard([["Support request",input.requestId],["Order",input.orderId],["Dispute case",input.caseId],["Buyer",input.buyerId],["Seller",input.sellerId]],"Support request")}${renderNoteCard("Reason",input.reason)}`, bodyText:`Support request\nSupport request: ${input.requestId}\nOrder: ${input.orderId}\nDispute case: ${input.caseId}\nBuyer: ${input.buyerId}\nSeller: ${input.sellerId}\n\nReason\n${input.reason}`, action:{label:"Open Admin Reports",url:"https://buymesho.app/admin/disputes"}, preheader:"A BuyMesho buyer requested admin assistance" });
  await sendAdminMail("BuyMesho buyer requested admin assistance",template,`${input.requestId}:support_admin`);
}

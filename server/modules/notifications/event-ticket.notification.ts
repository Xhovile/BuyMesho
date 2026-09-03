import { sendEmail } from "../email/email.service.js";
import { renderTicketDeliveryEmail, renderTicketPurchaseConfirmationEmail, type EventTicketEmailData } from "../email/templates/event-ticket.js";
type Send = typeof sendEmail;
export type TicketEmailInput = EventTicketEmailData & { email:string; orderStatus:string };
async function deliver(input:TicketEmailInput, subject:string, render:(data:EventTicketEmailData)=>{text:string;html:string}, send:Send){if(input.orderStatus!=="paid"&&input.orderStatus!=="in_escrow")return false;const {text,html}=render(input);await send({sender:"transactional",to:{email:input.email,name:input.buyerName},subject,text,html});return true;}
export function notifyTicketPurchaseConfirmation(input:TicketEmailInput,deps:{send?:Send}={}){return deliver(input,"Your BuyMesho ticket purchase is confirmed",renderTicketPurchaseConfirmationEmail,deps.send??sendEmail);}
export function notifyTicketDelivery(input:TicketEmailInput,deps:{send?:Send}={}){return deliver(input,"Your BuyMesho event ticket is ready",renderTicketDeliveryEmail,deps.send??sendEmail);}

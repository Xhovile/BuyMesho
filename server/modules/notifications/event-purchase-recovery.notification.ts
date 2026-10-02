import { query } from "../../postgres.js";
import { getPaymentDb } from "../../postgresCompat.js";
import type { StoredOrder } from "../orders/order.repository.js";
import { notifyEventTicketPurchaseCompleted } from "./event-ticket-purchase-completed.notification.js";
import { notifyOrderPaid } from "./order-paid.notification.js";
import { resolveNotificationRecipient } from "./email-recipient.js";

export async function notifyEventTicketPurchaseNotifications(order:StoredOrder|undefined):Promise<void>{
  if(!order)return;
  const db=getPaymentDb();
  const tickets=db.prepare(`SELECT id,code,ticket_title,ticket_type,holder_name,holder_email,event_title,event_date,start_time,venue,location FROM event_tickets WHERE order_id=? ORDER BY id ASC`).all(order.id) as Array<Record<string,unknown>>;
  if(!tickets.length)return;

  const ticketRows=tickets.map(ticket=>({
    ticketId:String(ticket.code??ticket.id),
    ticketType:String(ticket.ticket_type??'General Admission'),
    holderName:String(ticket.holder_name??'').trim(),
    holderEmail:String(ticket.holder_email??'').trim().toLowerCase(),
    eventName:String(ticket.event_title??'Event Ticket'),
    eventDate:String(ticket.event_date??''),
    startTime:String(ticket.start_time??''),
    venue:String(ticket.venue??''),
    location:String(ticket.location??''),
    downloadUrl:`https://buymesho.app/tickets?ticketId=${encodeURIComponent(String(ticket.code??ticket.id))}&download=1`,
  }));

  const first=ticketRows[0];
  const [buyerRecipient,eventManagerRecipient]=await Promise.all([
    resolveNotificationRecipient(order.buyerId),
    resolveNotificationRecipient(order.sellerId),
  ]);
  let eventManagerName=eventManagerRecipient.displayName?.trim()||'';
  try{
    const result=await query<{display_name?:string|null}>('SELECT display_name FROM event_creators WHERE uid = $1 LIMIT 1',[order.sellerId]);
    eventManagerName=result.rows[0]?.display_name?.trim()||eventManagerName;
  }catch(error){
    console.warn('[event-ticket] failed to resolve event manager display name',error);
  }
  eventManagerName=eventManagerName||'Event Manager';
  const buyerEmail=buyerRecipient.email?.trim().toLowerCase()??'';
  const buyerName=order.buyerDetails?.fullName?.trim()||buyerRecipient.displayName?.trim()||'there';

  const recipients=new Map<string,{name:string;tickets:typeof ticketRows;includePaymentDetails:boolean}>();
  if(buyerEmail){
    recipients.set(buyerEmail,{name:buyerName,tickets:ticketRows,includePaymentDetails:true});
  }

  for(const ticket of ticketRows){
    if(!ticket.holderEmail||ticket.holderEmail===buyerEmail)continue;
    const existing=recipients.get(ticket.holderEmail);
    if(existing){
      existing.tickets.push(ticket);
    }else{
      recipients.set(ticket.holderEmail,{name:ticket.holderName||'there',tickets:[ticket],includePaymentDetails:false});
    }
  }

  const eventName=first.eventName;
  const eventDate=first.eventDate;
  const startTime=first.startTime;
  const venue=first.venue;
  const location=first.location;
  const ticketType=ticketRows.every(ticket=>ticket.ticketType===first.ticketType)?first.ticketType:'Multiple ticket types';

  const entries=Array.from(recipients.entries());
  const results=await Promise.allSettled(entries.map(async ([email,recipient])=>{
    await notifyEventTicketPurchaseCompleted({
      email,
      recipientName:recipient.name,
      eventManagerName,
      eventName,
      orderReference:order.id,
      amount:order.total.amount,
      currency:order.total.currency||order.currency,
      ticketType,
      quantity:recipient.tickets.length,
      eventDate,
      startTime,
      venue,
      location,
      tickets:recipient.tickets,
      includePaymentDetails:recipient.includePaymentDetails,
      orderStatus:order.status,
    });
  }));
  results.forEach((result,index)=>{
    if(result.status==='rejected'){
      console.warn('[event-ticket] purchase confirmation email delivery failed',JSON.stringify({
        orderId:order.id,
        recipientEmail:entries[index]?.[0]??null,
        error:result.reason instanceof Error?result.reason.message:String(result.reason),
      }));
    }
  });
}

export async function recoverEventPurchaseNotifications(order:StoredOrder|undefined):Promise<void>{
  if(!order||order.source!=="event"||order.status!=="paid")return;
  await notifyOrderPaid(order);
  await notifyEventTicketPurchaseNotifications(order);
}

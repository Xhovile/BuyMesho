import assert from 'node:assert/strict';
import test from 'node:test';
import { query } from '../../../postgres.js';
import { applyVerifiedPayChanguPayment } from '../paychangu.flow.js';
import { paymentRepository } from '../payment.repository.js';
import { orderRepository } from '../../orders/order.repository.js';
import { escrowRepository } from '../../escrow/escrow.repository.js';
import { payoutService } from '../../payouts/payout.service.js';

const orderId='atomic-settlement-order-1';
const paymentReference='atomic-settlement-ref-1';

async function cleanup():Promise<void>{
  await query('DELETE FROM payouts WHERE order_id = $1',[orderId]);
  await query('DELETE FROM escrows WHERE order_id = $1',[orderId]);
  await query('DELETE FROM orders WHERE id = $1',[orderId]);
  await query('DELETE FROM payments WHERE reference = $1',[paymentReference]);
}

async function seedState():Promise<void>{
  await cleanup();
  const now=new Date().toISOString();
  await orderRepository.saveAsync({
    id:orderId,buyerId:'atomic-buyer-1',sellerId:'atomic-seller-1',source:'listing',status:'pending_payment',deliveryStatus:'action_required',
    currency:'MWK',subtotal:{amount:1000,currency:'MWK'},total:{amount:1000,currency:'MWK'},
    items:[{listingId:'atomic-listing-1',title:'Atomic Test Item',quantity:1,unitPrice:{amount:1000,currency:'MWK'}}],
    createdAt:now,updatedAt:now,paymentProvider:'paychangu',paymentReference,settlementRoute:'escrow',escrowId:null,buyerDetails:null,paidAt:null,fulfilledAt:null,
  });
  await paymentRepository.saveAsync({
    id:'atomic-payment-1',orderId,provider:'paychangu',method:'mobile_money',status:'pending',amount:{amount:1000,currency:'MWK'},reference:paymentReference,
    providerReference:null,checkoutUrl:null,paidAt:null,rawResponse:{},verified:false,createdAt:now,updatedAt:now,
  });
}

function verification(){return{verified:true,provider:'paychangu' as const,status:'success',reference:paymentReference,txRef:paymentReference,amount:{amount:1000,currency:'MWK'},currency:'MWK'} as const;}
const eventOrderId='event-direct-settlement-order-1';
const eventPaymentReference='event-direct-settlement-ref-1';
const eventId=998901;
const eventCreatorUid='event-direct-settlement-creator-1';
const eventDestinationId='event-direct-settlement-destination-1';

async function cleanupEventDirect():Promise<void>{
  await query('DELETE FROM payout_events WHERE payout_id IN (SELECT id FROM payouts WHERE order_id = $1)',[eventOrderId]);
  await query('DELETE FROM payout_attempts WHERE payout_id IN (SELECT id FROM payouts WHERE order_id = $1)',[eventOrderId]);
  await query('DELETE FROM payouts WHERE order_id = $1',[eventOrderId]);
  await query('DELETE FROM event_tickets WHERE order_id = $1',[eventOrderId]);
  await query('DELETE FROM orders WHERE id = $1',[eventOrderId]);
  await query('DELETE FROM payments WHERE reference = $1',[eventPaymentReference]);
  await query('DELETE FROM events WHERE id = $1',[eventId]);
  await query('DELETE FROM seller_payout_accounts WHERE id = $1',[eventDestinationId]);
  await query('DELETE FROM event_creators WHERE uid = $1',[eventCreatorUid]);
}

async function seedEventDirect():Promise<void>{
  await cleanupEventDirect();
  const now=new Date().toISOString();
  await query('INSERT INTO event_creators (uid,email,display_name,organization_name,organization_type,event_types,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$8)',[eventCreatorUid,'creator@example.com','Event Creator','Direct Settlement Org','events','concert','approved',now]);
  await query('INSERT INTO seller_payout_accounts (id,seller_uid,event_creator_uid,owner_type,owner_uid,destination_type,provider_name,provider_ref_id,currency,account_name,mobile_encrypted,masked_account,destination_fingerprint,is_default,verification_status,verification_attempts,is_active,verified_at,created_at,updated_at) VALUES ($1,NULL,$2,$3,$2,$4,$5,$6,$7,$8,$9,$10,$11,1,$12,0,1,$13,$13,$13)',[eventDestinationId,eventCreatorUid,'event_creator','mobile_money','Airtel Money','airtel_money','MWK','Event Creator','encrypted-mobile','******9999',`event-direct-fingerprint-${eventId}`,'verified',now]);
  await query('INSERT INTO events (id,creator_uid,event_type,event_title,organizer_name,event_date,start_time,venue,location,ticket_mode,ticket_price,description,spec_values,status,payout_destination_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)',[eventId,eventCreatorUid,'concert','Direct Settlement Test','Event Creator','2026-10-01','18:00','Test Venue','Lilongwe','paid',10000,'Direct settlement test','{}','published',eventDestinationId,now]);
  await query('INSERT INTO orders (id,buyer_id,seller_id,source,status,delivery_status,currency,subtotal_amount,subtotal_currency,total_amount,total_currency,payment_provider,settlement_route,payment_reference,items,placed_at,paid_at,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NULL,$16,$16)',[eventOrderId,'buyer-direct',eventCreatorUid,'event','pending_payment','action_required','MWK',10000,'MWK',10000,'MWK','paychangu','direct',eventPaymentReference,'[{"kind":"event_ticket","eventId":"998901","quantity":1,"unitPrice":{"amount":10000,"currency":"MWK"}}]',now]);
  await paymentRepository.saveAsync({id:'event-direct-payment-1',orderId:eventOrderId,provider:'paychangu',method:'mobile_money',status:'pending',amount:{amount:10000,currency:'MWK'},reference:eventPaymentReference,providerReference:null,checkoutUrl:null,paidAt:null,rawResponse:{},verified:false,createdAt:now,updatedAt:now});
}


test('verified payment settlement rolls back payment/order/escrow changes together',async()=>{
  await seedState();
  const originalCreateAsync=escrowRepository.createAsync;
  escrowRepository.createAsync=async()=>{throw new Error('simulated escrow failure');};
  try{
    await assert.rejects(()=>applyVerifiedPayChanguPayment(verification()),/simulated escrow failure/);
    assert.equal((await paymentRepository.findByReferenceAsync(paymentReference))?.status,'pending');
    assert.equal((await paymentRepository.findByReferenceAsync(paymentReference))?.verified,false);
    assert.equal((await orderRepository.findByIdAsync(orderId))?.status,'pending_payment');
    assert.equal(await escrowRepository.findByOrderIdAsync(orderId),undefined);
  }finally{
    escrowRepository.createAsync=originalCreateAsync;
    await cleanup();
  }
});

test('missing order does not mark payment captured and remains recoverable',async()=>{
  await cleanup();
  const now=new Date().toISOString();
  await paymentRepository.saveAsync({
    id:'atomic-payment-missing-order-1',orderId:'order-that-is-not-yet-visible',provider:'paychangu',method:'mobile_money',status:'pending',
    amount:{amount:1000,currency:'MWK'},reference:paymentReference,providerReference:null,checkoutUrl:null,paidAt:null,rawResponse:{},verified:false,createdAt:now,updatedAt:now,
  });
  try{
    const result=await applyVerifiedPayChanguPayment(verification());
    assert.equal(result.order,undefined);
    assert.equal(result.payment?.status,'pending');
    assert.equal(result.payment?.verified,false);
  }finally{await cleanup();}
});

test('verified event payment creates and immediately submits an escrow-free payout',async()=>{
  await seedEventDirect();
  const originalExecute=payoutService.executePayout;
  const calls:Array<{payoutId:string;actorType?:string;actorId?:string|null}>=[];
  payoutService.executePayout=async(input)=>{calls.push(input);return {} as any;};
  try{
    const result=await applyVerifiedPayChanguPayment({verified:true,provider:'paychangu',status:'successful',reference:eventPaymentReference,txRef:eventPaymentReference,amount:{amount:10000,currency:'MWK'},currency:'MWK'});
    assert.equal(result.order?.status,'paid');
    assert.equal(await escrowRepository.findByOrderIdAsync(eventOrderId),undefined);
    const payout=await query('SELECT id,status,owner_type,owner_uid,event_id,event_creator_uid,order_id,escrow_id,release_entry_id,destination_account_id FROM payouts WHERE order_id = $1 LIMIT 1',[eventOrderId]);
    assert.equal(payout.rows.length,1);
    assert.equal(payout.rows[0].status,'eligible');
    assert.equal(payout.rows[0].owner_type,'event_creator');
    assert.equal(payout.rows[0].owner_uid,eventCreatorUid);
    assert.equal(String(payout.rows[0].event_id),String(eventId));
    assert.equal(payout.rows[0].event_creator_uid,eventCreatorUid);
    assert.equal(payout.rows[0].escrow_id,null);
    assert.equal(payout.rows[0].release_entry_id,null);
    assert.equal(payout.rows[0].destination_account_id,eventDestinationId);
    assert.equal(calls.length,1);
    assert.equal(calls[0].payoutId,payout.rows[0].id);
    assert.equal(calls[0].actorType,'system');
  }finally{
    payoutService.executePayout=originalExecute;
    await cleanupEventDirect();
  }
});

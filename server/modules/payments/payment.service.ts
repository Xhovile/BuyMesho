import type { CreatePaymentRequest, PaymentResult, PaymentVerificationResult, RefundRequest, RefundResult, WebhookVerificationResult } from '../../../src/modules/payments/types.js';
import { ApiError } from '../../../src/shared/api/errors.js';
import { PaymentGatewayRegistry } from '../../../src/modules/payments/paymentGateway.js';
import { flutterwaveProvider } from '../../../src/modules/payments/providers/flutterwave.js';
import { paystackProvider } from '../../../src/modules/payments/providers/paystack.js';
import { paychanguProvider, normalizePaychanguStatus } from './paychangu.provider.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/order.repository.js';
import { applyVerifiedPayChanguPayment } from './paychangu.flow.js';
import { findPendingPayChanguWebhook, updatePaymentWebhookEventStatus } from '../../postgresCompat/webhooks.js';
import dotenv from 'dotenv';
dotenv.config();

export interface ServerPaymentConfig { paychanguEnabled?: boolean; paychanguSecretKey?: string; paychanguWebhookSecret?: string; paychanguBaseUrl?: string; paychanguWebhookUrl?: string; }
const REFUND_UNAVAILABLE_MESSAGE='Refunds are not available yet for this payment provider';
function readEnv(name:string):string|undefined{const value=process.env[name]?.trim();if(!value)return undefined;if(name==='PAYCHANGU_BASE_URL'&&value.includes('api/paychangu.com'))return value.replace('api.paychangu.com','api.paychangu.com');return value;}
function isTruthyFlag(value:string|undefined):boolean{return value==='1'||value==='true'||value==='yes'||value==='on';}
function validatePayChanguConfig(config:ServerPaymentConfig):void{if(!config.paychanguEnabled||process.env.NODE_ENV!=='production')return;const missing:string[]=[];if(!config.paychanguSecretKey)missing.push('PAYCHANGU_SECRET_KEY');if(!config.paychanguWebhookSecret)missing.push('PAYCHANGU_WEBHOOK_SECRET');if(!config.paychanguWebhookUrl)missing.push('PAYCHANGU_WEBHOOK_URL');if(missing.length)throw new Error(`Missing required PayChangu environment variables in production: ${missing.join(', ')}`);}
function normalizeCurrency(value:string|undefined):string{return String(value??'').trim().toUpperCase();}
function normalizeReference(value:string|undefined|null):string{return String(value??'').trim();}
function stripPayChanguPrefix(value:string):string{return value.replace(/^PAYCHANGU-/i,'');}
function equivalentPayChanguReferences(left:string|undefined|null,right:string|undefined|null):boolean{const a=normalizeReference(left);const b=normalizeReference(right);return Boolean(a&&b&&stripPayChanguPrefix(a)===stripPayChanguPrefix(b));}
function uniqueReferences(values:Array<string|undefined|null>):string[]{const seen=new Set<string>();const out:string[]=[];for(const value of values){const reference=normalizeReference(value);if(!reference||seen.has(reference))continue;seen.add(reference);out.push(reference);}return out;}
function buildReferenceCandidates(requestedReference:string,verifiedReference:string|undefined|null):string[]{return uniqueReferences([requestedReference,verifiedReference,stripPayChanguPrefix(requestedReference),verifiedReference?stripPayChanguPrefix(verifiedReference):null]);}
function paymentMatchesExpectedTotal(expected:{amount:number;currency:string},actual?:{amount:number;currency:string}):boolean{return Boolean(actual&&actual.amount===expected.amount&&normalizeCurrency(expected.currency)===normalizeCurrency(actual.currency));}
function parsePendingWebhookPayload(payload:string):PaymentVerificationResult|null{
  try{
    const parsed=JSON.parse(payload) as Record<string,unknown>;
    const data=(parsed.data&&typeof parsed.data==='object'&&!Array.isArray(parsed.data))?parsed.data as Record<string,unknown>:{};
    const transaction=(data.transaction&&typeof data.transaction==='object'&&!Array.isArray(data.transaction))?data.transaction as Record<string,unknown>:{};
    const txRef=String(parsed.tx_ref??data.tx_ref??transaction.tx_ref??parsed.reference??'').trim();
    const status=String(transaction.status??data.status??parsed.status??'').trim();
    const amountValue=transaction.amount??data.amount??parsed.amount;
    const amountNumber=typeof amountValue==='number'?amountValue:Number(amountValue);
    const currency=String(transaction.currency??data.currency??parsed.currency??'').trim().toUpperCase();
    if(!txRef||!status||!Number.isFinite(amountNumber)||amountNumber<=0||!currency)return null;
    const normalizedStatus=normalizePaychanguStatus(status);
    return {verified:normalizedStatus==='paid',provider:'paychangu',txRef,reference:txRef,status,currency,amount:{amount:Math.round(amountNumber),currency},checkoutUrl:null,rawResponse:parsed};
  }catch{return null;}
}
export function createServerPaymentConfigFromEnv():ServerPaymentConfig{const paychanguSecretKey=readEnv('PAYCHANGU_SECRET_KEY'),paychanguWebhookSecret=readEnv('PAYCHANGU_WEBHOOK_SECRET'),paychanguBaseUrl=readEnv('PAYCHANGU_BASE_URL'),paychanguWebhookUrl=readEnv('PAYCHANGU_WEBHOOK_URL');return{paychanguEnabled:isTruthyFlag(readEnv('PAYCHANGU_ENABLED'))||Boolean(paychanguSecretKey)||Boolean(paychanguWebhookSecret)||Boolean(paychanguBaseUrl)||Boolean(paychanguWebhookUrl),paychanguSecretKey,paychanguWebhookSecret,paychanguBaseUrl,paychanguWebhookUrl};}

export class ServerPaymentService{
  constructor(private readonly config:ServerPaymentConfig={},private readonly registry=ServerPaymentService.createDefaultRegistry()){validatePayChanguConfig(config);}
  private resolveConfig():ServerPaymentConfig{const envPayChanguSecretKey=readEnv('PAYCHANGU_SECRET_KEY'),envPayChanguWebhookSecret=readEnv('PAYCHANGU_WEBHOOK_SECRET'),envPayChanguBaseUrl=readEnv('PAYCHANGU_BASE_URL'),envPayChanguWebhookUrl=readEnv('PAYCHANGU_WEBHOOK_URL');return{paychanguSecretKey:envPayChanguSecretKey??this.config.paychanguSecretKey,paychanguWebhookSecret:envPayChanguWebhookSecret??this.config.paychanguWebhookSecret,paychanguBaseUrl:envPayChanguBaseUrl??this.config.paychanguBaseUrl,paychanguWebhookUrl:envPayChanguWebhookUrl??this.config.paychanguWebhookUrl};}
  static createDefaultRegistry():PaymentGatewayRegistry{const registry=new PaymentGatewayRegistry();registry.register(paystackProvider);registry.register(flutterwaveProvider);registry.register(paychanguProvider);return registry;}

  async createPayment(request:CreatePaymentRequest):Promise<PaymentResult>{
    const result=request.provider==='paychangu'?await paychanguProvider.createPayment(request,{...this.resolveConfig(),paychanguCallbackUrl:this.resolveConfig().paychanguWebhookUrl} as Parameters<typeof paychanguProvider.createPayment>[1]):await this.registry.get(request.provider).createPayment(request);
    const saved=await paymentRepository.saveAsync({...result,verified:false});
    if(result.provider==='paychangu'){
      const pending=findPendingPayChanguWebhook(result.reference);
      if(pending){
        const pendingVerification=parsePendingWebhookPayload(pending.payload);
        if(pendingVerification&&pendingVerification.verified&&pendingVerification.reference===result.reference){
          const order=await orderRepository.findByIdAsync(result.orderId);
          if(order&&paymentMatchesExpectedTotal(order.total,pendingVerification.amount)){
            try{
              await applyVerifiedPayChanguPayment(pendingVerification);
              updatePaymentWebhookEventStatus(pending.id,'processed',{processedAt:new Date().toISOString(),signatureValid:true});
            }catch{
              // Preserve the webhook audit row as retryable when settlement cannot yet be applied.
            }
          }
        }
      }
    }
    return saved;
  }

  async verifyPaychanguPayment(txRef:string):Promise<PaymentVerificationResult>{return this.verifyPaychanguPaymentInternal(txRef);}
  private async verifyPaychanguPaymentInternal(txRef:string):Promise<PaymentVerificationResult>{
    const requestedTxRef=normalizeReference(txRef);
    const verification=await paychanguProvider.verifyPayment(requestedTxRef,this.resolveConfig());
    const verifiedReference=normalizeReference(verification.reference)||normalizeReference(verification.txRef)||requestedTxRef;
    const referencesEquivalent=equivalentPayChanguReferences(requestedTxRef,verifiedReference);
    const referenceCandidates=buildReferenceCandidates(requestedTxRef,verifiedReference);

    const payment=await (async()=>{
      if(!referencesEquivalent)return undefined;
      for(const reference of referenceCandidates){
        const found=await paymentRepository.findByReferenceAsync(reference);
        if(found)return found;
      }
      return undefined;
    })();

    let strictVerified=verification.verified;
    let failureReason=verification.failureReason;

    if(!referencesEquivalent){
      strictVerified=false;
      failureReason='PayChangu verification reference does not match requested transaction reference';
    } else if(!payment){
      strictVerified=false;
      failureReason=failureReason??'Stored payment record not found for this reference';
    } else {
      const order=await orderRepository.findByIdAsync(payment.orderId);
      if(!order){
        strictVerified=false;
        failureReason=failureReason??'Associated order not found';
      } else if(order.paymentReference&&!equivalentPayChanguReferences(order.paymentReference,payment.reference)){
        strictVerified=false;
        failureReason=failureReason??'Order payment reference does not match the stored payment reference';
      } else if(!paymentMatchesExpectedTotal(order.total,verification.amount)){
        strictVerified=false;
        failureReason=failureReason??`Payment amount or currency does not exactly match order total for ${order.id}`;
      }
    }

    const canonicalReference=payment?.reference??requestedTxRef;
    const strictVerification:PaymentVerificationResult={...verification,verified:strictVerified,reference:canonicalReference,txRef:canonicalReference,orderId:payment?.orderId,failureReason};
    if(payment)await paymentRepository.updateByReferenceAsync(payment.reference,current=>({...current,verified:strictVerification.verified,verification:strictVerification}));
    if(strictVerification.verified&&payment){
      const currentOrder=await orderRepository.findByIdAsync(payment.orderId);
      if(currentOrder&&!['in_escrow','fulfilled','refunded','closed','disputed'].includes(currentOrder.status)){
        await applyVerifiedPayChanguPayment({...strictVerification,provider:'paychangu',reference:canonicalReference,txRef:canonicalReference,status:strictVerification.status??'captured'});
      }
    }
    return strictVerification;
  }

  async refund(request:RefundRequest):Promise<RefundResult>{const provider=this.registry.get(request.provider);if(!provider.capabilities.supportsRefunds)throw new ApiError(REFUND_UNAVAILABLE_MESSAGE,{message:REFUND_UNAVAILABLE_MESSAGE,code:'REFUNDS_UNAVAILABLE',status:501});return provider.refund(request);}
  async verifyWebhook(providerKey:Parameters<PaymentGatewayRegistry['get']>[0],signature:string|undefined,payload:string|Record<string,unknown>):Promise<WebhookVerificationResult>{return providerKey==='paychangu'?paychanguProvider.verifyWebhook(signature,payload,this.resolveConfig()):this.registry.get(providerKey).verifyWebhook(signature,payload);}
  async parseWebhook(providerKey:Parameters<PaymentGatewayRegistry['get']>[0],payload:unknown):Promise<WebhookVerificationResult>{return providerKey==='paychangu'?paychanguProvider.parseWebhook(payload):this.registry.get(providerKey).parseWebhook(payload);}
}

export const serverPaymentService=new ServerPaymentService({paychanguSecretKey:process.env.PAYCHANGU_SECRET_KEY,paychanguWebhookSecret:process.env.PAYCHANGU_WEBHOOK_SECRET,paychanguBaseUrl:process.env.PAYCHANGU_BASE_URL,paychanguWebhookUrl:process.env.PAYCHANGU_WEBHOOK_URL});
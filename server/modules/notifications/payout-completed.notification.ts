import { sendEmail } from "../email/email.service.js";
import { renderPayoutCompletedEmail } from "../email/templates/payout-completed.js";
type Send=typeof sendEmail;
export async function notifyPayoutCompleted(input:{email:string;sellerName:string;amount:number;currency:string;payoutId:string;orderReference?:string|null;completedAt:string;status:string},deps:{send?:Send}={}){if(input.status!=="paid")return false;const {text,html}=renderPayoutCompletedEmail({...input,dashboardUrl:"https://buymesho.app/seller/payouts"});await (deps.send??sendEmail)({sender:"transactional",to:{email:input.email,name:input.sellerName},subject:"Your BuyMesho payout has been completed",text,html});return true;}

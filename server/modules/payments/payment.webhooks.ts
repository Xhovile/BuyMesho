import type { PaymentVerificationResult, WebhookVerificationResult } from '../../../src/modules/payments/types.js';
import { serverPaymentService } from './payment.service.js';
import { applyVerifiedPayChanguPayment } from './paychangu.flow.js';
import { paymentRepository } from './payment.repository.js';
import { isAcceptedPaychanguEventType, isPaychanguSuccessStatus } from './paychangu.provider.js';

function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as unknown;
      return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {};
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export class PaymentWebhookHandler {
  async handlePaychanguWebhook(signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> {
    const result = await serverPaymentService.verifyWebhook('paychangu', signature, payload as string);
    if (!result.valid) throw new Error('Invalid PayChangu webhook signature');

    const body = asRecord(payload);
    const eventType = String(body.event_type ?? body.event ?? '').trim().toLowerCase();
    if (!isAcceptedPaychanguEventType(eventType)) {
      throw new Error(`Unsupported PayChangu event type: ${eventType || 'unknown'}`);
    }

    const reference = String(body.tx_ref ?? body.reference ?? '').trim();
    if (!reference) throw new Error('Webhook payload missing tx_ref/reference');

    const storedPayment = await paymentRepository.findByReference(reference);
    if (!storedPayment) throw new Error(`No payment found for reference ${reference}`);

    const status = String(body.status ?? body.payment_status ?? '').trim().toLowerCase();
    if (!isPaychanguSuccessStatus(status)) throw new Error(`PayChangu payment not successful (status: ${status || 'unknown'})`);

    const amount = toNumber(body.amount);
    const currency = String(body.currency ?? '').trim().toUpperCase();

    if (amount === undefined || amount <= 0) throw new Error('Webhook payload missing valid amount');
    if (Math.abs(amount - storedPayment.amount.amount) > 0.000001) throw new Error('Webhook amount does not match expected payment amount');
    if (currency && currency !== storedPayment.amount.currency.toUpperCase()) throw new Error('Webhook currency does not match expected payment currency');

    const verification: PaymentVerificationResult = {
      verified: true,
      provider: 'paychangu',
      txRef: reference,
      reference,
      status: 'paid',
      amount: { amount, currency: currency || storedPayment.amount.currency },
      currency: currency || storedPayment.amount.currency,
      rawResponse: body,
    };

    await applyVerifiedPayChanguPayment(verification);
    return result;
  }

  verify(providerKey: Parameters<typeof serverPaymentService.verifyWebhook>[0], signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> {
    return serverPaymentService.verifyWebhook(providerKey, signature, payload as string);
  }

  parse(providerKey: Parameters<typeof serverPaymentService.parseWebhook>[0], payload: unknown): Promise<WebhookVerificationResult> {
    return serverPaymentService.parseWebhook(providerKey, payload);
  }
}

export const paymentWebhookHandler = new PaymentWebhookHandler();

import type { WebhookVerificationResult } from '../../../src/modules/payments/types';
import { serverPaymentService } from './payment.service';
import { applyVerifiedPayChanguPayment } from './paychangu.flow';

const SUCCESS_EVENT_TYPES = new Set([
  'payment.success',
  'payment.successful',
  'charge.success',
  'charge.completed',
]);

const SUCCESS_STATUSES = new Set(['successful', 'success', 'completed', 'captured']);

function isPayChanguSuccessEvent(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const body = payload as Record<string, unknown>;

  const eventType = String(body.event_type ?? body.event ?? '').toLowerCase();
  if (eventType && !SUCCESS_EVENT_TYPES.has(eventType)) {
    return false;
  }

  const data = (body.data as Record<string, unknown> | undefined) ?? body;
  const status = String(data.status ?? '').toLowerCase();
  return SUCCESS_STATUSES.has(status);
}

export class PaymentWebhookHandler {
  async handlePaychanguWebhook(signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> {
    const result = await serverPaymentService.verifyWebhook('paychangu', signature, payload);

    if (!result.valid) {
      throw new Error('Invalid PayChangu webhook signature');
    }

    const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) as unknown : payload;

    if (isPayChanguSuccessEvent(parsedPayload)) {
      const body = parsedPayload as Record<string, unknown>;
      const data = (body.data as Record<string, unknown> | undefined) ?? body;
      const txRef = String(data.tx_ref ?? data.txRef ?? result.reference ?? '');
      const currency = String(data.currency ?? 'MWK');
      const rawAmount = data.amount;
      const amount = typeof rawAmount === 'number'
        ? { amount: rawAmount, currency }
        : undefined;

      applyVerifiedPayChanguPayment({
        verified: true,
        provider: 'paychangu',
        txRef,
        reference: txRef,
        status: String(data.status ?? 'captured'),
        currency,
        amount,
        rawResponse: body,
      });
    }

    return result;
  }

  verify(providerKey: Parameters<typeof serverPaymentService.verifyWebhook>[0], signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> {
    return serverPaymentService.verifyWebhook(providerKey, signature, payload);
  }

  parse(providerKey: Parameters<typeof serverPaymentService.parseWebhook>[0], payload: unknown): Promise<WebhookVerificationResult> {
    return serverPaymentService.parseWebhook(providerKey, payload);
  }
}

export const paymentWebhookHandler = new PaymentWebhookHandler();

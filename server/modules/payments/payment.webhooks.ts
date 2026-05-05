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
    const result = await serverPaymentService.verifyWebhook('paychangu', signature, payload as string);
    if (!result.valid) throw new Error('Invalid PayChangu webhook signature');

    const body = asRecord(payload);
    const eventType = String(body.event_type ?? body.event ?? '').trim().toLowerCase();
    if (!isAcceptedPaychanguEventType(eventType)) {
      throw new Error(`Unsupported PayChangu event type: ${eventType || 'unknown'}`);
    }

    let parsedPayload: unknown;
    if (typeof payload === 'string') {
      try {
        parsedPayload = JSON.parse(payload) as unknown;
      } catch {
        throw new Error('Malformed webhook payload: invalid JSON');
      }
    } else {
      parsedPayload = payload;
    }

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
    return serverPaymentService.verifyWebhook(providerKey, signature, payload as string);
  }

  parse(providerKey: Parameters<typeof serverPaymentService.parseWebhook>[0], payload: unknown): Promise<WebhookVerificationResult> {
    return serverPaymentService.parseWebhook(providerKey, payload);
  }
}

export const paymentWebhookHandler = new PaymentWebhookHandler();

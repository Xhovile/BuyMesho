import type { WebhookVerificationResult } from '../../../src/modules/payments/types';
import { serverPaymentService } from './payment.service';
import { applyVerifiedPayChanguPayment } from './paychangu.flow';
import { paymentRepository } from './payment.repository';
import { isAcceptedPaychanguEventType, isPaychanguSuccessStatus, paychanguWebhookSpec } from './paychangu.provider';

const processedWebhookKeys = new Set<string>();

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

export class PaymentWebhookHandler {
  async handlePaychanguWebhook(signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> {
    const result = await serverPaymentService.verifyWebhook('paychangu', signature, payload);

    if (!result.valid) {
      throw new Error('Invalid PayChangu webhook signature');
    }

    const body = asRecord(result.payload);
    const eventType = String(body.event_type ?? body.event ?? result.eventType ?? '').trim().toLowerCase();
    if (!isAcceptedPaychanguEventType(eventType)) {
      throw new Error(`PayChangu webhook rejected: unsupported event type '${eventType || 'unknown'}'. Accepted: ${paychanguWebhookSpec.acceptedEventTypes.join(', ')}`);
    }

    const status = String(body.status ?? (body.data as Record<string, unknown> | undefined)?.status ?? '').trim().toLowerCase();
    if (!isPaychanguSuccessStatus(status)) {
      throw new Error(`PayChangu webhook rejected: status '${status || 'unknown'}' is not a successful payment status.`);
    }

    const reference = String(body.tx_ref ?? body.reference ?? result.reference ?? '').trim();
    if (!reference) {
      throw new Error('PayChangu webhook rejected: missing tx_ref/reference.');
    }

    const storedPayment = paymentRepository.findByReference(reference);
    if (!storedPayment) {
      throw new Error(`PayChangu webhook rejected: no stored payment exists for reference '${reference}'.`);
    }

    const amountValue = Number(body.amount ?? (body.data as Record<string, unknown> | undefined)?.amount ?? Number.NaN);
    if (!Number.isFinite(amountValue) || amountValue !== storedPayment.amount.amount) {
      throw new Error(`PayChangu webhook rejected: amount mismatch for reference '${reference}'.`);
    }

    const currency = String(body.currency ?? (body.data as Record<string, unknown> | undefined)?.currency ?? '').trim().toUpperCase();
    if (!currency || currency !== storedPayment.amount.currency.toUpperCase()) {
      throw new Error(`PayChangu webhook rejected: currency mismatch for reference '${reference}'.`);
    }

    const idempotencyKey = String(
      body.idempotency_key
      ?? body.idempotencyKey
      ?? body.event_id
      ?? body.eventId
      ?? body.id
      ?? `${eventType}:${reference}:${amountValue}:${currency}`,
    );
    if (processedWebhookKeys.has(idempotencyKey)) {
      throw new Error(`PayChangu webhook rejected: replay detected for idempotency key '${idempotencyKey}'.`);
    }
    processedWebhookKeys.add(idempotencyKey);

    applyVerifiedPayChanguPayment({
      ...result,
      verified: result.valid,
    });

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

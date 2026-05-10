import type { WebhookVerificationResult } from '../../../src/modules/payments/types.js';
import { serverPaymentService } from './payment.service.js';
import { applyVerifiedPayChanguPayment } from './paychangu.flow.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/order.repository.js';
import { isAcceptedPaychanguEventType } from './paychangu.provider.js';
import { getPaymentDb } from '../../sqlite.js';

function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as unknown;
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  return typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
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

function extractTxRef(payload: unknown, fallback?: string): string {
  const body = asRecord(payload);
  const data = (body.data as Record<string, unknown> | undefined) ?? body;

  return String(
    data.tx_ref ??
    data.txRef ??
    body.tx_ref ??
    body.txRef ??
    fallback ??
    ''
  ).trim();
}

function logWebhookEvent(params: {
  signatureValid: boolean;
  eventType?: string;
  reference?: string;
  payload: unknown;
}): void {
  try {
    const db = getPaymentDb();
    const rawPayload = typeof params.payload === 'string'
      ? params.payload
      : JSON.stringify(params.payload ?? {});

    db.prepare(
      `INSERT INTO payment_webhook_events
       (provider, reference, event_type, signature_valid, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      'paychangu',
      params.reference ?? null,
      params.eventType ?? null,
      params.signatureValid ? 1 : 0,
      rawPayload,
      new Date().toISOString(),
    );
  } catch (error) {
    console.warn('[webhook] failed to store PayChangu webhook event', error);
  }
}

export class PaymentWebhookHandler {
  async handlePaychanguWebhook(
    signature: string | undefined,
    payload: unknown
  ): Promise<WebhookVerificationResult> {
    const body = asRecord(payload);
    const eventType = String(body.event_type ?? body.event ?? '').trim().toLowerCase() || undefined;
    const reference = String(body.tx_ref ?? body.txRef ?? body.reference ?? '').trim() || undefined;

    const result = await serverPaymentService.verifyWebhook('paychangu', signature, payload as string);

    logWebhookEvent({
      signatureValid: result.valid,
      eventType,
      reference: reference ?? result.reference ?? undefined,
      payload,
    });

    if (!result.valid) {
      throw new Error('Invalid PayChangu webhook signature');
    }

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

    if (!isPayChanguSuccessEvent(parsedPayload)) {
      return result;
    }

    const txRef = extractTxRef(parsedPayload, result.reference);
    if (!txRef) {
      throw new Error('Missing PayChangu tx_ref in webhook payload');
    }

    const payment = paymentRepository.findByReference(txRef);
    if (!payment) {
      throw new Error(`No stored payment found for PayChangu reference: ${txRef}`);
    }

    const order = orderRepository.findByPaymentReference(txRef) ?? orderRepository.findById(payment.orderId);
    if (!order) {
      throw new Error(`No stored order found for PayChangu payment reference: ${txRef}`);
    }

    if (order.paymentReference && order.paymentReference !== txRef) {
      throw new Error(`Webhook reference does not match the order payment reference for order ${order.id}`);
    }

    const data = (parsedPayload as Record<string, unknown>).data as Record<string, unknown> | undefined;
    const webhookCurrency = String(data?.currency ?? order.currency ?? 'MWK');
    const rawAmount = data?.amount;
    const amount = typeof rawAmount === 'number'
      ? { amount: rawAmount, currency: webhookCurrency }
      : undefined;

    if (
      amount &&
      (amount.amount !== order.total.amount ||
        amount.currency.toUpperCase() !== order.total.currency.toUpperCase())
    ) {
      throw new Error(`Webhook amount does not match order total for order ${order.id}`);
    }

    applyVerifiedPayChanguPayment({
      verified: true,
      provider: 'paychangu',
      txRef,
      reference: txRef,
      status: String(data?.status ?? 'captured'),
      currency: webhookCurrency,
      amount,
      rawResponse: asRecord(parsedPayload),
    });

    return result;
  }

  verify(
    providerKey: Parameters<typeof serverPaymentService.verifyWebhook>[0],
    signature: string | undefined,
    payload: unknown
  ): Promise<WebhookVerificationResult> {
    return serverPaymentService.verifyWebhook(providerKey, signature, payload as string);
  }

  parse(
    providerKey: Parameters<typeof serverPaymentService.parseWebhook>[0],
    payload: unknown
  ): Promise<WebhookVerificationResult> {
    return serverPaymentService.parseWebhook(providerKey, payload);
  }
}

export const paymentWebhookHandler = new PaymentWebhookHandler();

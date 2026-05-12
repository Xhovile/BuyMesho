import type { WebhookVerificationResult } from '../../../src/modules/payments/types.js';
import { serverPaymentService } from './payment.service.js';
import { applyVerifiedPayChanguPayment } from './paychangu.flow.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/order.repository.js';
import { isAcceptedPaychanguEventType, isPaychanguSuccessStatus } from './paychangu.provider.js';
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

function asOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asTrimmedString(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text ? text : undefined;
}

function asAmount(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function getPayChanguEventDetails(payload: unknown): {
  eventType?: string;
  status?: string;
  txRef?: string;
  data?: Record<string, unknown>;
  raw: Record<string, unknown>;
} {
  const raw = asRecord(payload);
  const data = asOptionalRecord(raw.data) ?? raw;

  return {
    eventType: asTrimmedString(raw.event_type ?? raw.event),
    status: asTrimmedString(
      data.status ??
      raw.status
    ),
    txRef: asTrimmedString(
      data.tx_ref ??
      data.txRef ??
      data.reference ??
      raw.tx_ref ??
      raw.txRef ??
      raw.reference
    ),
    data,
    raw,
  };
}

function extractTxRef(payload: unknown, fallback?: string): string {
  const details = getPayChanguEventDetails(payload);
  return (details.txRef ?? fallback ?? '').trim();
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

function shouldProcessWebhook(payload: unknown): boolean {
  const { status } = getPayChanguEventDetails(payload);

  // The important gate is the provider status, not the exact event name.
  // If the webhook is signed and the provider status is successful, the order
  // should move forward.
  return Boolean(status && isPayChanguSuccessStatus(status));
}

function isDuplicateCapture(txRef: string): boolean {
  const payment = paymentRepository.findByReference(txRef);
  if (!payment || payment.status !== 'captured') {
    return false;
  }

  const order =
    orderRepository.findByPaymentReference(txRef) ??
    orderRepository.findById(payment.orderId);

  return Boolean(order && order.status === 'in_escrow');
}

export class PaymentWebhookHandler {
  async handlePaychanguWebhook(
    signature: string | undefined,
    payload: unknown
  ): Promise<WebhookVerificationResult> {
    const details = getPayChanguEventDetails(payload);
    const eventType = details.eventType?.toLowerCase() || undefined;
    const reference = details.txRef;

    const verificationPayload = typeof payload === 'string' ? payload : payload;
    const result = await serverPaymentService.verifyWebhook(
      'paychangu',
      signature,
      verificationPayload as string
    );

    logWebhookEvent({
      signatureValid: result.valid,
      eventType,
      reference: reference ?? result.reference ?? undefined,
      payload,
    });

    if (!result.valid) {
      throw new Error('Invalid PayChangu webhook signature');
    }

    if (!details.status || !isPayChanguSuccessStatus(details.status)) {
      if (eventType && !isAcceptedPaychanguEventType(eventType)) {
        console.info('[webhook] ignoring non-success PayChangu event', {
          eventType,
          status: details.status ?? 'unknown',
          reference: reference ?? result.reference ?? 'unknown',
        });
      }
      return result;
    }

    if (eventType && !isAcceptedPaychanguEventType(eventType)) {
      console.info('[webhook] proceeding with successful PayChangu event that uses an unrecognized event type', {
        eventType,
        status: details.status,
        reference: reference ?? result.reference ?? 'unknown',
      });
    }

    const parsedPayload = typeof payload === 'string'
      ? (() => {
          try {
            return JSON.parse(payload) as unknown;
          } catch {
            throw new Error('Malformed webhook payload: invalid JSON');
          }
        })()
      : payload;

    // Do not block progression on event name. The success status is enough.
    if (!shouldProcessWebhook(parsedPayload)) {
      console.info('[webhook] ignoring PayChangu webhook that does not have a successful status', {
        eventType,
        status: details.status ?? 'unknown',
        reference: reference ?? result.reference ?? 'unknown',
      });
      return result;
    }

    const txRef = extractTxRef(parsedPayload, result.reference);
    if (!txRef) {
      throw new Error('Missing PayChangu tx_ref in webhook payload');
    }

    if (isDuplicateCapture(txRef)) {
      console.info('[webhook] skipping duplicate PayChangu capture replay', {
        txRef,
        eventType: eventType ?? 'unknown',
        status: details.status ?? 'unknown',
      });
      return result;
    }

    const payment = paymentRepository.findByReference(txRef);
    if (!payment) {
      throw new Error(`No stored payment found for PayChangu reference: ${txRef}`);
    }

    const order =
      orderRepository.findByPaymentReference(txRef) ??
      orderRepository.findById(payment.orderId);

    if (!order) {
      throw new Error(`No stored order found for PayChangu payment reference: ${txRef}`);
    }

    if (order.paymentReference && order.paymentReference !== txRef) {
      throw new Error(`Webhook reference does not match the order payment reference for order ${order.id}`);
    }

    const data =
      asOptionalRecord((parsedPayload as Record<string, unknown>).data) ??
      asOptionalRecord(parsedPayload) ??
      undefined;

    const webhookCurrency = String(data?.currency ?? order.currency ?? 'MWK');
    const rawAmount = data?.amount;
    const parsedAmount = asAmount(rawAmount);
    const amount = typeof parsedAmount === 'number'
      ? { amount: parsedAmount, currency: webhookCurrency }
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
      status: String(data?.status ?? details.status ?? 'captured'),
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

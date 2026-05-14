import type { WebhookVerificationResult } from '../../../src/modules/payments/types.js';
import { serverPaymentService } from './payment.service.js';
import { applyVerifiedPayChanguPayment } from './paychangu.flow.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/order.repository.js';
import {
  isAcceptedPaychanguEventType,
} from './paychangu.provider.js';
import { getPaymentDb } from '../../sqlite.js';

type PlainRecord = Record<string, unknown>;

function asRecord(payload: unknown): PlainRecord {
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as unknown;
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as PlainRecord)
        : {};
    } catch {
      return {};
    }
  }

  return typeof payload === 'object' && payload !== null
    ? (payload as PlainRecord)
    : {};
}

function asOptionalRecord(value: unknown): PlainRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as PlainRecord)
    : undefined;
}

function asTrimmedString(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text ? text : undefined;
}

function normalizeRawPayload(payload: unknown): string {
  if (typeof payload === 'string') {
    return payload;
  }

  if (Buffer.isBuffer(payload)) {
    return payload.toString('utf8');
  }

  return '';
}

function getPayChanguEventDetails(payload: unknown): {
  eventType?: string;
  status?: string;
  txRef?: string;
  data?: PlainRecord;
  raw: PlainRecord;
} {
  const raw = asRecord(payload);
  const data = asOptionalRecord(raw.data) ?? raw;

  return {
    eventType: asTrimmedString(raw.event_type ?? raw.event),
    status: asTrimmedString(data.status ?? raw.status),
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
    const rawPayload =
      typeof params.payload === 'string'
        ? params.payload
        : Buffer.isBuffer(params.payload)
          ? params.payload.toString('utf8')
          : JSON.stringify(params.payload ?? {});

    db.prepare(
      `
      INSERT INTO payment_webhook_events
        (provider, reference, event_type, signature_valid, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      `
    ).run(
      'paychangu',
      params.reference ?? null,
      params.eventType ?? null,
      params.signatureValid ? 1 : 0,
      rawPayload,
      new Date().toISOString()
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
    const details = getPayChanguEventDetails(payload);
    const eventType = details.eventType?.toLowerCase() || undefined;
    const reference = details.txRef;
    const rawPayload = normalizeRawPayload(payload);

    if (!rawPayload) {
      throw new Error('Missing raw webhook body');
    }

    const result = await serverPaymentService.verifyWebhook(
      'paychangu',
      signature,
      rawPayload
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

    const parsedPayload =
      typeof payload === 'string'
        ? (() => {
            try {
              return JSON.parse(payload) as unknown;
            } catch {
              throw new Error('Malformed webhook payload: invalid JSON');
            }
          })()
        : payload;

    if (eventType && !isAcceptedPaychanguEventType(eventType)) {
      console.info(
        '[webhook] proceeding with PayChangu event that uses an unrecognized event type',
        {
          eventType,
          status: details.status ?? 'unknown',
          reference: reference ?? result.reference ?? 'unknown',
        }
      );
    }

    const txRef = extractTxRef(parsedPayload, result.reference);
    if (!txRef) {
      throw new Error('Missing PayChangu tx_ref in webhook payload');
    }

    const verification = await serverPaymentService.verifyPaychanguPayment(txRef);

    if (!verification.verified) {
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
      throw new Error(
        `Webhook reference does not match the order payment reference for order ${order.id}`
      );
    }

    applyVerifiedPayChanguPayment({
      ...verification,
      verified: true,
      provider: 'paychangu',
      txRef,
      reference: txRef,
      status: verification.status ?? 'captured',
      currency: verification.currency ?? order.currency ?? 'MWK',
      amount: verification.amount ?? {
        amount: order.total.amount,
        currency: order.total.currency,
      },
      rawResponse: asRecord(payload),
    });

    return result;
  }

  verify(
    providerKey: string,
    signature: string | undefined,
    payload: unknown
  ): Promise<WebhookVerificationResult> {
    const rawPayload = normalizeRawPayload(payload);
    return serverPaymentService.verifyWebhook(providerKey, signature, rawPayload);
  }

  parse(providerKey: string, payload: unknown): Promise<unknown> {
    return serverPaymentService.parseWebhook(providerKey, payload);
  }
}

export const paymentWebhookHandler = new PaymentWebhookHandler();

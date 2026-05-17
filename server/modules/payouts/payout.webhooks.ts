import { createHash } from 'crypto';
import {
  insertPaymentWebhookEvent,
  recordPaymentWebhookDuplicateAttempt,
  updatePaymentWebhookEventStatus,
  getPaymentDb,
} from '../../sqlite.js';
import {
  normalizePaychanguPayoutStatus,
  verifyPayChanguPayoutWebhook,
} from './paychangu.payout.js';
import { payoutService } from './payout.service.js';

type PlainRecord = Record<string, unknown>;

function asRecord(value: unknown): PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as PlainRecord)
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
  if (typeof payload === 'string') return payload;
  if (Buffer.isBuffer(payload)) return payload.toString('utf8');
  return '';
}

function parseRawWebhookPayload(rawPayload: string): unknown {
  return JSON.parse(rawPayload) as unknown;
}

function hashPayload(rawPayload: string): string {
  return createHash('sha256').update(rawPayload).digest('hex');
}

function getPayoutWebhookDetails(payload: unknown): {
  eventType?: string;
  status?: string;
  payoutId?: string;
  chargeId?: string;
  providerReference?: string;
  transactionId?: string;
  providerEventId?: string;
  raw: PlainRecord;
} {
  const raw = asRecord(payload);
  const data = asOptionalRecord(raw.data) ?? raw;
  const transaction = asOptionalRecord(data.transaction) ?? data;

  return {
    eventType: asTrimmedString(
      raw.event_type ?? raw.eventType ?? raw.event ?? raw.type ??
      data.event_type ?? data.eventType ?? data.event ?? data.type,
    )?.toLowerCase(),
    status: asTrimmedString(
      transaction.status ?? data.status ?? raw.status,
    ),
    payoutId: asTrimmedString(
      transaction.payout_reference ?? transaction.payout_id ?? transaction.payoutId ??
      data.payout_reference ?? data.payout_id ?? data.payoutId ??
      raw.payout_reference ?? raw.payout_id ?? raw.payoutId,
    ),
    chargeId: asTrimmedString(
      transaction.charge_id ?? transaction.chargeId ?? transaction.tx_ref ?? transaction.txRef ?? transaction.reference ??
      data.charge_id ?? data.chargeId ?? data.tx_ref ?? data.txRef ?? data.reference ??
      raw.charge_id ?? raw.chargeId ?? raw.tx_ref ?? raw.txRef ?? raw.reference,
    ),
    providerReference: asTrimmedString(
      transaction.reference ?? transaction.ref_id ?? transaction.refId ??
      data.reference ?? data.ref_id ?? data.refId ??
      raw.reference ?? raw.ref_id ?? raw.refId,
    ),
    transactionId: asTrimmedString(
      transaction.transaction_id ?? transaction.transactionId ?? transaction.id ??
      data.transaction_id ?? data.transactionId ?? data.id ??
      raw.transaction_id ?? raw.transactionId,
    ),
    providerEventId: asTrimmedString(
      raw.event_id ?? raw.eventId ?? raw.provider_event_id ?? raw.providerEventId ??
      data.event_id ?? data.eventId ?? data.provider_event_id ?? data.providerEventId ??
      transaction.event_id ?? transaction.eventId ?? raw.id ?? data.id ?? transaction.id,
    ),
    raw,
  };
}

function payoutIdFromChargeId(chargeId: string | undefined): string | undefined {
  const text = String(chargeId ?? '').trim();
  const match = text.match(/^BM-PO-(.+)-A\d+$/i);
  return match?.[1];
}

function findPayoutRecord(payoutId: string | undefined, chargeId: string | undefined) {
  const db = getPaymentDb();
  if (payoutId) {
    const byId = db.prepare(`SELECT id, seller_id, status FROM payouts WHERE id = ? LIMIT 1`).get(payoutId) as
      | { id: string; seller_id: string; status: string }
      | undefined;
    if (byId) return byId;
  }

  if (chargeId) {
    const byCharge = db.prepare(`SELECT id, seller_id, status FROM payouts WHERE provider_charge_id = ? LIMIT 1`).get(chargeId) as
      | { id: string; seller_id: string; status: string }
      | undefined;
    if (byCharge) return byCharge;
  }

  return undefined;
}

function addPayoutEventIfFound(
  payout:
    | {
        id: string;
        seller_id: string;
      }
    | undefined,
  eventType: string,
  note: string,
  payload?: Record<string, unknown>,
): void {
  if (!payout) return;
  const db = getPaymentDb();
  db.prepare(
    `INSERT INTO payout_events (
      payout_id, seller_id, event_type, actor_type, actor_id, note, payload, created_at
    ) VALUES (?, ?, ?, 'system', NULL, ?, ?, ?)`,
  ).run(
    payout.id,
    payout.seller_id,
    eventType,
    note,
    payload ? JSON.stringify(payload) : null,
    new Date().toISOString(),
  );
}

export class PayoutWebhookHandler {
  async handlePaychanguWebhook(
    signature: string | undefined,
    payload: unknown,
  ) {
    const rawPayload = normalizeRawPayload(payload);
    if (!rawPayload) {
      throw new Error('Missing raw webhook body');
    }

    const payloadHash = hashPayload(rawPayload);
    const createdAt = new Date().toISOString();
    const parsedPayload = parseRawWebhookPayload(rawPayload);
    const details = getPayoutWebhookDetails(parsedPayload);
    const payout = findPayoutRecord(
      details.payoutId ?? payoutIdFromChargeId(details.chargeId),
      details.chargeId,
    );

    const auditEvent = {
      provider: 'paychangu_payout',
      providerEventId: details.providerEventId ?? details.chargeId ?? details.payoutId ?? null,
      reference: details.chargeId ?? details.payoutId ?? null,
      txRef: details.chargeId ?? null,
      eventType: details.eventType ?? 'unknown',
      payloadHash,
      processingStatus: 'received',
      signatureValid: false,
      payload: rawPayload,
      error: null,
      createdAt,
    };

    const insertResult = insertPaymentWebhookEvent(auditEvent);

    if ('duplicate' in insertResult) {
      recordPaymentWebhookDuplicateAttempt(auditEvent, insertResult.existingId);
      addPayoutEventIfFound(payout, 'payout_webhook_duplicate', 'Duplicate webhook ignored', {
        chargeId: details.chargeId ?? null,
        providerEventId: details.providerEventId ?? null,
        eventType: details.eventType ?? null,
      });
      return {
        valid: true,
        provider: 'paychangu',
        eventType: details.eventType,
        reference: details.chargeId,
        payload: parsedPayload,
      };
    }

    const eventId = insertResult.id;
    const verification = await verifyPayChanguPayoutWebhook(signature, rawPayload);

    if (!verification.valid) {
      addPayoutEventIfFound(payout, 'payout_webhook_rejected', 'Rejected webhook due to invalid signature', {
        chargeId: details.chargeId ?? null,
        providerEventId: details.providerEventId ?? null,
        eventType: details.eventType ?? null,
      });
      updatePaymentWebhookEventStatus(eventId, 'rejected', {
        processedAt: new Date().toISOString(),
        error: 'Invalid PayChangu payout webhook signature',
        signatureValid: false,
      });
      throw new Error('Invalid PayChangu payout webhook signature');
    }

    if (!payout) {
      updatePaymentWebhookEventStatus(eventId, 'ignored', {
        processedAt: new Date().toISOString(),
        signatureValid: true,
        error: 'No matching payout found',
      });
      return verification;
    }

    const normalizedStatus = normalizePaychanguPayoutStatus(details.status);
    const now = new Date().toISOString();

    if (normalizedStatus === 'paid') {
      payoutService.markPaid(payout.id, 'provider-webhook', 'Reconciled from provider callback');
      addPayoutEventIfFound(payout, 'payout_reconciled', 'Reconciled from provider callback', {
        chargeId: details.chargeId ?? null,
        providerReference: details.providerReference ?? null,
        providerTransactionId: details.transactionId ?? null,
        providerEventId: details.providerEventId ?? null,
        status: normalizedStatus,
      });
    } else if (normalizedStatus === 'failed') {
      payoutService.markFailed(payout.id, 'provider-webhook', 'Provider callback reported payout failure');
      addPayoutEventIfFound(payout, 'payout_reconciled', 'Reconciled from provider callback', {
        chargeId: details.chargeId ?? null,
        providerReference: details.providerReference ?? null,
        providerTransactionId: details.transactionId ?? null,
        providerEventId: details.providerEventId ?? null,
        status: normalizedStatus,
      });
    } else {
      addPayoutEventIfFound(payout, 'payout_reconciled', 'Reconciled from provider callback', {
        chargeId: details.chargeId ?? null,
        providerReference: details.providerReference ?? null,
        providerTransactionId: details.transactionId ?? null,
        providerEventId: details.providerEventId ?? null,
        status: normalizedStatus,
      });
    }

    getPaymentDb().prepare(
      `UPDATE payouts
       SET provider_status = COALESCE(?, provider_status),
           provider_ref_id = COALESCE(?, provider_ref_id),
           provider_transaction_id = COALESCE(?, provider_transaction_id),
            raw_response = COALESCE(?, raw_response),
            updated_at = ?
        WHERE id = ?`,
    ).run(
      normalizedStatus,
      details.providerReference ?? null,
      details.transactionId ?? null,
      JSON.stringify(asRecord(parsedPayload)),
      now,
      payout.id,
    );

    updatePaymentWebhookEventStatus(eventId, 'processed', {
      processedAt: now,
      signatureValid: true,
    });

    return verification;
  }
}

export const payoutWebhookHandler = new PayoutWebhookHandler();

import { randomUUID } from "node:crypto";
import { getPaymentDb } from "../postgresCompat.js";

export type PaymentWebhookProcessingStatus =
  | "received"
  | "processed"
  | "ignored"
  | "failed"
  | "rejected"
  | "duplicate";

export interface InsertPaymentWebhookEventInput {
  provider: string;
  providerEventId?: string | null;
  reference?: string | null;
  txRef?: string | null;
  eventType?: string | null;
  payloadHash?: string | null;
  processingStatus: PaymentWebhookProcessingStatus | string;
  signatureValid: boolean;
  payload?: string | null;
  error?: string | null;
  createdAt: string;
}

export type InsertPaymentWebhookEventResult =
  | { inserted: true; id: number }
  | { inserted: false; duplicate: true; existingId?: number };

export interface FindPaymentWebhookDuplicateInput {
  provider: string;
  providerEventId?: string | null;
  reference?: string | null;
  txRef?: string | null;
  eventType?: string | null;
  payloadHash?: string | null;
}

export interface RecordPaymentWebhookDuplicateAttemptInput
  extends FindPaymentWebhookDuplicateInput {
  payload?: string | null;
  createdAt?: string | null;
}

export interface UpdatePaymentWebhookEventStatusOptions {
  processedAt?: string | null;
  error?: string | null;
  signatureValid?: boolean | null;
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function buildEventId(input: {
  providerEventId?: string | null;
  reference?: string | null;
  txRef?: string | null;
  eventType?: string | null;
  payloadHash?: string | null;
}): string {
  const providerEventId = normalizeOptionalText(input.providerEventId);
  if (providerEventId) return providerEventId;

  const payloadHash = normalizeOptionalText(input.payloadHash);
  if (payloadHash) return `internal:${payloadHash}`;

  const reference = normalizeOptionalText(input.reference);
  const txRef = normalizeOptionalText(input.txRef);
  const eventType = normalizeOptionalText(input.eventType);
  const identity = [reference, txRef, eventType].filter(Boolean).join(":");
  return identity ? `internal:${identity}` : `internal:${randomUUID()}`;
}

function isPaymentWebhookUniqueConstraintFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const err = error as { code?: unknown; message?: unknown };
  if (
    err.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    err.code === "SQLITE_CONSTRAINT" ||
    err.code === "23505"
  ) {
    return true;
  }

  const message = String(err.message ?? "");
  return (
    message.includes("23505") ||
    message.includes("duplicate key") ||
    message.includes("unique constraint") ||
    message.includes("UNIQUE constraint failed") ||
    message.includes("idx_payment_webhook_events_provider_event_id") ||
    message.includes("idx_payment_webhook_events_provider_event_id_active") ||
    message.includes("idx_payment_webhook_events_dedupe") ||
    message.includes("idx_payment_webhook_events_dedupe_active") ||
    message.includes("idx_payment_webhook_events_reference_event_active") ||
    message.includes("payment_webhook_events.provider") ||
    message.includes("payment_webhook_events.tx_ref") ||
    message.includes("payment_webhook_events_provider_event_id_key") ||
    message.includes("payment_webhook_events")
  );
}

export function findPendingPayChanguWebhook(reference: string): { id: number; payload: string } | null {
  const normalizedReference = normalizeOptionalText(reference);
  if (!normalizedReference) return null;

  const row = getPaymentDb()
    .prepare(
      `SELECT id, payload
       FROM payment_webhook_events
       WHERE provider = 'paychangu'
         AND (reference = ? OR tx_ref = ?)
         AND signature_valid = 1
         AND processing_status IN ('received', 'failed', 'ignored')
         AND payload IS NOT NULL
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    .get(normalizedReference, normalizedReference) as { id?: number; payload?: string | null } | undefined;

  if (!row?.id || !row.payload) return null;
  return { id: Number(row.id), payload: String(row.payload) };
}

export function findPaymentWebhookDuplicate(
  input: FindPaymentWebhookDuplicateInput,
): { id: number } | null {
  const db = getPaymentDb();
  const provider = normalizeOptionalText(input.provider);
  const providerEventId = normalizeOptionalText(input.providerEventId);
  const reference = normalizeOptionalText(input.reference);
  const txRef = normalizeOptionalText(input.txRef);
  const eventType = normalizeOptionalText(input.eventType);
  const payloadHash = normalizeOptionalText(input.payloadHash);

  if (!provider) return null;

  if (providerEventId) {
    const row = db
      .prepare(
        `SELECT id FROM payment_webhook_events
         WHERE provider = ? AND provider_event_id = ?
         LIMIT 1`,
      )
      .get(provider, providerEventId) as { id: number } | undefined;
    if (row) return row;
  }

  if (reference && eventType) {
    const row = db
      .prepare(
        `SELECT id FROM payment_webhook_events
         WHERE provider = ? AND reference = ? AND event_type = ?
         LIMIT 1`,
      )
      .get(provider, reference, eventType) as { id: number } | undefined;
    if (row) return row;
  }

  if (txRef && eventType && payloadHash) {
    const row = db
      .prepare(
        `SELECT id FROM payment_webhook_events
         WHERE provider = ? AND tx_ref = ? AND event_type = ? AND payload_hash = ?
         LIMIT 1`,
      )
      .get(provider, txRef, eventType, payloadHash) as
      | { id: number }
      | undefined;
    if (row) return row;
  }

  return null;
}

export function getPaymentWebhookEventStatus(id: number): PaymentWebhookProcessingStatus | string | null {
  const row = getPaymentDb()
    .prepare(
      `SELECT processing_status
       FROM payment_webhook_events
       WHERE id = ?
       LIMIT 1`,
    )
    .get(id) as { processing_status?: string | null } | undefined;

  return row?.processing_status ?? null;
}

export function insertPaymentWebhookEvent(
  input: InsertPaymentWebhookEventInput,
): InsertPaymentWebhookEventResult {
  const db = getPaymentDb();
  const normalized = {
    provider: normalizeOptionalText(input.provider),
    providerEventId: normalizeOptionalText(input.providerEventId),
    reference: normalizeOptionalText(input.reference),
    txRef: normalizeOptionalText(input.txRef),
    eventType: normalizeOptionalText(input.eventType),
    payloadHash: normalizeOptionalText(input.payloadHash),
    processingStatus:
      normalizeOptionalText(input.processingStatus) ?? "received",
    payload: input.payload ?? null,
    error: normalizeOptionalText(input.error),
  };
  const eventId = buildEventId(normalized);

  if (!normalized.provider) {
    throw new Error("payment webhook provider is required");
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO payment_webhook_events (
           event_id, provider, provider_event_id, reference, tx_ref, event_type, payload_hash,
           processing_status, error, signature_valid, payload, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        eventId,
        normalized.provider,
        normalized.providerEventId,
        normalized.reference,
        normalized.txRef,
        normalized.eventType,
        normalized.payloadHash,
        normalized.processingStatus,
        normalized.error,
        input.signatureValid ? 1 : 0,
        normalized.payload,
        input.createdAt,
      );

    return { inserted: true, id: Number(result.lastInsertRowid) };
  } catch (error) {
    if (!isPaymentWebhookUniqueConstraintFailure(error)) {
      throw error;
    }

    const existing = findPaymentWebhookDuplicate({
      provider: normalized.provider,
      providerEventId: normalized.providerEventId,
      reference: normalized.reference,
      txRef: normalized.txRef,
      eventType: normalized.eventType,
      payloadHash: normalized.payloadHash,
    });

    if (existing) {
      const existingStatus = getPaymentWebhookEventStatus(existing.id);

      if (existingStatus !== "processed") {
        db.prepare(
          `UPDATE payment_webhook_events
           SET processing_status = 'received',
               processed_at = NULL,
               error = NULL,
               signature_valid = ?
           WHERE id = ?`,
        ).run(input.signatureValid ? 1 : 0, existing.id);

        return { inserted: true, id: existing.id };
      }

      return {
        inserted: false,
        duplicate: true,
        existingId: existing.id,
      };
    }

    return {
      inserted: false,
      duplicate: true,
    };
  }
}

export function recordPaymentWebhookDuplicateAttempt(
  input: RecordPaymentWebhookDuplicateAttemptInput,
  existingId?: number,
): number | null {
  const db = getPaymentDb();
  const provider = normalizeOptionalText(input.provider);

  if (!provider) {
    throw new Error("payment webhook provider is required");
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO payment_webhook_events (
           event_id, provider, provider_event_id, reference, tx_ref, event_type, payload_hash,
           processing_status, processed_at, error, signature_valid, payload, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'duplicate', ?, ?, 0, ?, ?)`,
      )
      .run(
        `duplicate:${existingId ?? "unknown"}:${randomUUID()}`,
        provider,
        normalizeOptionalText(input.providerEventId),
        normalizeOptionalText(input.reference ?? input.txRef),
        normalizeOptionalText(input.txRef),
        normalizeOptionalText(input.eventType),
        normalizeOptionalText(input.payloadHash),
        new Date().toISOString(),
        existingId
          ? `Duplicate PayChangu webhook event; existing event id ${existingId}`
          : "Duplicate PayChangu webhook event",
        input.payload ?? null,
        input.createdAt ?? new Date().toISOString(),
      );

    return Number(result.lastInsertRowid);
  } catch (error) {
    if (isPaymentWebhookUniqueConstraintFailure(error)) {
      return null;
    }
    throw error;
  }
}

export function updatePaymentWebhookEventStatus(
  id: number,
  status: PaymentWebhookProcessingStatus | string,
  options: UpdatePaymentWebhookEventStatusOptions = {},
): void {
  const db = getPaymentDb();
  const processedAt = options.processedAt ?? null;
  const error = normalizeOptionalText(options.error);

  db.prepare(
    `UPDATE payment_webhook_events
     SET processing_status = ?,
         processed_at = ?,
         error = ?,
         signature_valid = COALESCE(?, signature_valid)
     WHERE id = ?`,
  ).run(
    status,
    processedAt,
    error,
    options.signatureValid === undefined ? null : options.signatureValid ? 1 : 0,
    id,
  );
}

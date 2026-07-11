import { getPaymentDb } from "../db.js";

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

function isPaymentWebhookUniqueConstraintFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const err = error as { code?: unknown; message?: unknown };
  if (
    err.code !== "SQLITE_CONSTRAINT_UNIQUE" &&
    err.code !== "SQLITE_CONSTRAINT"
  ) {
    return false;
  }

  const message = String(err.message ?? "");
  return (
    message.includes("idx_payment_webhook_events_provider_event_id") ||
    message.includes("idx_payment_webhook_events_provider_event_id_active") ||
    message.includes("idx_payment_webhook_events_dedupe") ||
    message.includes("idx_payment_webhook_events_dedupe_active") ||
    message.includes("idx_payment_webhook_events_reference_event_active") ||
    message.includes("payment_webhook_events.provider") ||
    message.includes("payment_webhook_events.tx_ref")
  );
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

  if (!normalized.provider) {
    throw new Error("payment webhook provider is required");
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO payment_webhook_events (
           provider, provider_event_id, reference, tx_ref, event_type, payload_hash,
           processing_status, error, signature_valid, payload, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
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

    return {
      inserted: false,
      duplicate: true,
      ...(existing ? { existingId: existing.id } : {}),
    };
  }
}

export function recordPaymentWebhookDuplicateAttempt(
  input: InsertPaymentWebhookEventInput,
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
           provider, provider_event_id, reference, tx_ref, event_type, payload_hash,
           processing_status, processed_at, error, signature_valid, payload, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, 'duplicate', ?, ?, 0, ?, ?)`,
      )
      .run(
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
        input.createdAt,
      );

    return Number(result.lastInsertRowid);
  } catch (error) {
    if (!isPaymentWebhookUniqueConstraintFailure(error)) {
      throw error;
    }

    return null;
  }
}

export function updatePaymentWebhookEventStatus(
  id: number,
  status: PaymentWebhookProcessingStatus | string,
  options: UpdatePaymentWebhookEventStatusOptions = {},
): void {
  const db = getPaymentDb();
  db.prepare(
    `UPDATE payment_webhook_events
     SET processing_status = ?,
         processed_at = COALESCE(?, processed_at),
         error = ?,
         signature_valid = COALESCE(?, signature_valid)
     WHERE id = ?`,
  ).run(
    normalizeOptionalText(status) ?? "received",
    options.processedAt ?? null,
    normalizeOptionalText(options.error),
    options.signatureValid === undefined || options.signatureValid === null
      ? null
      : options.signatureValid
        ? 1
        : 0,
    id,
  );
}

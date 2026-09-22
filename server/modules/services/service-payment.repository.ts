import { randomUUID } from "node:crypto";
import { ensureStudioDatabaseSchema, studioQuery } from "./studio.database.js";

export type ServicePaymentType = "graphic_design" | "website_development" | "both";
export type ServicePaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type ServicePaymentMode = "deposit" | "full" | "balance";

export interface ServicePaymentReference {
  kind: "image" | "video";
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  publicId: string | null;
  resourceType: "image" | "video" | null;
}

export function parseReferenceMedia(value: unknown): ServicePaymentReference[] {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const kind = row.kind === "video" ? "video" : row.kind === "image" ? "image" : null;
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!kind || !url) return [];
    return [{
      kind,
      url,
      originalName: typeof row.originalName === "string" ? row.originalName : "Reference file",
      mimeType: typeof row.mimeType === "string" ? row.mimeType : "",
      sizeBytes: Number(row.sizeBytes ?? 0),
      publicId: typeof row.publicId === "string" && row.publicId.trim() ? row.publicId : null,
      resourceType:
        row.resourceType === "video" ? "video" : row.resourceType === "image" ? "image" : null,
    }];
  });
}

export interface ServicePaymentRecord {
  id: string;
  serviceType: ServicePaymentType;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  description: string;
  amount: number;
  currency: string;
  status: ServicePaymentStatus;
  paymentMode: ServicePaymentMode | null;
  projectTotal: number | null;
  projectReference: string | null;
  graphicId: string | null;
  referenceMedia: ServicePaymentReference[];
  providerReference: string | null;
  paymentReference: string | null;
  checkoutUrl: string | null;
  idempotencyKey: string | null;
  idempotencyRequestHash: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  successNotificationStatus: "pending" | "sending" | "sent" | "failed";
  successNotificationSentAt: string | null;
  successNotificationError: string | null;
}

export function rowToRecord(row: Record<string, unknown>): ServicePaymentRecord {
  return {
    id: String(row.id),
    serviceType: row.service_type as ServicePaymentType,
    customerName: String(row.customer_name ?? ""),
    customerPhone: String(row.customer_phone ?? ""),
    customerEmail: row.customer_email ? String(row.customer_email) : null,
    description: String(row.description ?? ""),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "MWK"),
    status: row.status as ServicePaymentStatus,
    paymentMode: row.payment_mode ? (row.payment_mode as ServicePaymentMode) : null,
    projectTotal:
      row.project_total === null || row.project_total === undefined
        ? null
        : Number(row.project_total),
    projectReference: row.project_reference ? String(row.project_reference) : null,
    graphicId: row.graphic_id ? String(row.graphic_id) : null,
    referenceMedia: parseReferenceMedia(row.reference_media),
    providerReference: row.provider_reference ? String(row.provider_reference) : null,
    paymentReference: row.payment_reference ? String(row.payment_reference) : null,
    checkoutUrl: row.checkout_url ? String(row.checkout_url) : null,
    idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : null,
    idempotencyRequestHash: row.idempotency_request_hash
      ? String(row.idempotency_request_hash)
      : null,
    paidAt: row.paid_at ? String(row.paid_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    successNotificationStatus:
      row.success_notification_status === "sent"
        ? "sent"
        : row.success_notification_status === "sending"
          ? "sending"
          : row.success_notification_status === "failed"
            ? "failed"
            : "pending",
    successNotificationSentAt: row.success_notification_sent_at
      ? String(row.success_notification_sent_at)
      : null,
    successNotificationError: row.success_notification_error
      ? String(row.success_notification_error)
      : null,
  };
}

export class ServicePaymentRepository {
  private async ready(): Promise<void> {
    await ensureStudioDatabaseSchema();
  }

  async create(input: {
    serviceType: ServicePaymentType;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    description: string;
    amount: number;
    currency: string;
    paymentMode?: ServicePaymentMode | null;
    projectTotal?: number | null;
    projectReference?: string | null;
    graphicId?: string | null;
    idempotencyKey?: string | null;
    idempotencyRequestHash?: string | null;
  }): Promise<ServicePaymentRecord> {
    await this.ready();

    const now = new Date().toISOString();
    const record: ServicePaymentRecord = {
      id: `svc_${randomUUID()}`,
      serviceType: input.serviceType,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || null,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      status: "pending",
      paymentMode: input.paymentMode ?? null,
      projectTotal: input.projectTotal ?? null,
      projectReference: input.projectReference || null,
      graphicId: input.graphicId || null,
      referenceMedia: [],
      providerReference: null,
      paymentReference: null,
      checkoutUrl: null,
      idempotencyKey: input.idempotencyKey || null,
      idempotencyRequestHash: input.idempotencyRequestHash || null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
      successNotificationStatus: "pending",
      successNotificationSentAt: null,
      successNotificationError: null,
    };

    const result = await studioQuery(
      `
        INSERT INTO service_payments (
          id, service_type, customer_name, customer_phone, customer_email,
          description, amount, currency, status, payment_mode, project_total,
          project_reference, graphic_id, reference_media, provider_reference, payment_reference,
          checkout_url, idempotency_key, idempotency_request_hash, paid_at, created_at, updated_at,
          success_notification_status, success_notification_sent_at, success_notification_error
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id
      `,
      [
        record.id,
        record.serviceType,
        record.customerName,
        record.customerPhone,
        record.customerEmail,
        record.description,
        record.amount,
        record.currency,
        record.status,
        record.paymentMode,
        record.projectTotal,
        record.projectReference,
        record.graphicId,
        JSON.stringify(record.referenceMedia),
        record.providerReference,
        record.paymentReference,
        record.checkoutUrl,
        record.idempotencyKey,
        record.idempotencyRequestHash,
        record.paidAt,
        record.createdAt,
        record.updatedAt,
        record.successNotificationStatus,
        record.successNotificationSentAt,
        record.successNotificationError,
      ],
    );

    if (result.rowCount === 0 && record.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(record.idempotencyKey);
      if (existing) return existing;
    }

    return record;
  }

  async updateReferenceMedia(
    id: string,
    referenceMedia: ServicePaymentReference[],
  ): Promise<ServicePaymentRecord | undefined> {
    await this.ready();
    const now = new Date().toISOString();
    await studioQuery(
      `
        UPDATE service_payments
        SET reference_media = $1::jsonb, updated_at = $2
        WHERE id = $3
      `,
      [JSON.stringify(referenceMedia.slice(0, 5)), now, id],
    );
    return this.findById(id);
  }

  async findByIdempotencyKey(key: string): Promise<ServicePaymentRecord | undefined> {
    await this.ready();
    const result = await studioQuery(
      "SELECT * FROM service_payments WHERE idempotency_key = $1 LIMIT 1",
      [key],
    );
    return result.rows[0] ? rowToRecord(result.rows[0]) : undefined;
  }

  async findById(id: string): Promise<ServicePaymentRecord | undefined> {
    await this.ready();
    const result = await studioQuery(
      "SELECT * FROM service_payments WHERE id = $1 LIMIT 1",
      [id],
    );
    return result.rows[0] ? rowToRecord(result.rows[0]) : undefined;
  }

  async findByReference(reference: string): Promise<ServicePaymentRecord | undefined> {
    await this.ready();
    const result = await studioQuery(
      "SELECT * FROM service_payments WHERE payment_reference = $1 LIMIT 1",
      [reference],
    );
    return result.rows[0] ? rowToRecord(result.rows[0]) : undefined;
  }

  async attachPayment(input: {
    id: string;
    providerReference?: string | null;
    reference: string;
    checkoutUrl?: string | null;
  }): Promise<ServicePaymentRecord | undefined> {
    await this.ready();
    const now = new Date().toISOString();
    await studioQuery(
      `
        UPDATE service_payments
        SET payment_reference = $1,
            provider_reference = $2,
            checkout_url = $3,
            updated_at = $4
        WHERE id = $5
      `,
      [input.reference, input.providerReference || null, input.checkoutUrl || null, now, input.id],
    );
    return this.findById(input.id);
  }

  async markPaid(
    reference: string,
    paidAt = new Date().toISOString(),
  ): Promise<ServicePaymentRecord | undefined> {
    await this.ready();
    const now = new Date().toISOString();
    await studioQuery(
      `
        UPDATE service_payments
        SET status = 'paid', paid_at = COALESCE(paid_at, $1), updated_at = $2
        WHERE payment_reference = $3
          AND status IN ('pending', 'failed', 'paid')
      `,
      [paidAt, now, reference],
    );
    return this.findByReference(reference);
  }

  async markFailedById(id: string): Promise<ServicePaymentRecord | undefined> {
    await this.ready();
    const now = new Date().toISOString();
    await studioQuery(
      "UPDATE service_payments SET status = 'failed', updated_at = $1 WHERE id = $2 AND status IN ('pending', 'failed')",
      [now, id],
    );
    return this.findById(id);
  }

  async markFailed(reference: string): Promise<ServicePaymentRecord | undefined> {
    await this.ready();
    const now = new Date().toISOString();
    await studioQuery(
      "UPDATE service_payments SET status = 'failed', updated_at = $1 WHERE payment_reference = $2 AND status IN ('pending', 'failed')",
      [now, reference],
    );
    return this.findByReference(reference);
  }

  async markRefunded(reference: string): Promise<ServicePaymentRecord | undefined> {
    await this.ready();
    const now = new Date().toISOString();
    await studioQuery(
      "UPDATE service_payments SET status = 'refunded', paid_at = NULL, updated_at = $1 WHERE payment_reference = $2 AND status IN ('paid', 'refunded')",
      [now, reference],
    );
    return this.findByReference(reference);
  }

  async claimSuccessNotification(reference: string): Promise<ServicePaymentRecord | undefined> {
    await this.ready();
    const now = new Date().toISOString();

    const result = await studioQuery(
      `
        UPDATE service_payments
        SET success_notification_status = 'sending',
            success_notification_error = NULL,
            updated_at = $1
        WHERE payment_reference = $2
          AND status = 'paid'
          AND (
            success_notification_status IN ('pending', 'failed')
            OR (
              success_notification_status = 'sending'
              AND updated_at < CURRENT_TIMESTAMP - INTERVAL '10 minutes'
            )
          )
        RETURNING *
      `,
      [now, reference],
    );

    return result.rows[0] ? rowToRecord(result.rows[0]) : undefined;
  }

  async markSuccessNotificationSent(
    reference: string,
    sentAt = new Date().toISOString(),
  ): Promise<void> {
    await this.ready();
    await studioQuery(
      `
        UPDATE service_payments
        SET success_notification_status = 'sent',
            success_notification_sent_at = $1,
            success_notification_error = NULL,
            updated_at = $1
        WHERE payment_reference = $2
      `,
      [sentAt, reference],
    );
  }

  async markSuccessNotificationFailed(
    reference: string,
    error: string,
  ): Promise<void> {
    await this.ready();
    await studioQuery(
      `
        UPDATE service_payments
        SET success_notification_status = 'failed',
            success_notification_error = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE payment_reference = $2
      `,
      [error.slice(0, 2000), reference],
    );
  }

  async recordWebhookEvent(input: {
    providerEventId?: string | null;
    paymentReference?: string | null;
    eventType?: string | null;
    payloadHash: string;
    signatureValid: boolean;
  }): Promise<{ inserted: boolean; id: number }> {
    await this.ready();

    const result = await studioQuery<{ id: number }>(
      `
        INSERT INTO service_payment_webhook_events (
          provider_event_id, payment_reference, event_type, payload_hash,
          signature_valid
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        RETURNING id
      `,
      [
        input.providerEventId || null,
        input.paymentReference || null,
        input.eventType || null,
        input.payloadHash,
        input.signatureValid,
      ],
    );

    if (result.rows[0]) {
      return { inserted: true, id: Number(result.rows[0].id) };
    }

    const existing = await studioQuery<{ id: number }>(
      `
        SELECT id
        FROM service_payment_webhook_events
        WHERE (provider_event_id IS NOT NULL AND provider_event_id = $1)
           OR (payment_reference = $2 AND event_type = $3 AND payload_hash = $4)
        ORDER BY id DESC
        LIMIT 1
      `,
      [
        input.providerEventId || null,
        input.paymentReference || null,
        input.eventType || null,
        input.payloadHash,
      ],
    );

    return {
      inserted: false,
      id: Number(existing.rows[0]?.id ?? 0),
    };
  }

  async updateWebhookEvent(
    id: number,
    status: "received" | "processed" | "ignored" | "failed",
    error?: string | null,
  ): Promise<void> {
    await this.ready();
    await studioQuery(
      `
        UPDATE service_payment_webhook_events
        SET status = $1, error = $2,
            processed_at = CASE WHEN $1 IN ('processed', 'ignored', 'failed') THEN CURRENT_TIMESTAMP ELSE processed_at END
        WHERE id = $3
      `,
      [status, error || null, id],
    );
  }
}

export const servicePaymentRepository = new ServicePaymentRepository();

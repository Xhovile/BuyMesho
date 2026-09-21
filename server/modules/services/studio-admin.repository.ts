import { ensureStudioDatabaseSchema, studioQuery } from "./studio.database.js";
import type { ServicePaymentRecord } from "./service-payment.repository.js";

export type StudioAdminCustomer = {
  customerPhone: string;
  customerName: string;
  customerEmail: string | null;
  paymentCount: number;
  paidCount: number;
  paidAmount: number;
  projectCount: number;
  lastActivityAt: string;
};

export type StudioAdminProject = {
  projectReference: string;
  customerName: string;
  customerPhone: string;
  paymentCount: number;
  paidAmount: number;
  lastActivityAt: string;
  latestStatus: string;
};

export type StudioAdminWebhook = {
  id: number;
  providerEventId: string | null;
  paymentReference: string | null;
  eventType: string | null;
  payloadHash: string;
  status: string;
  signatureValid: boolean;
  error: string | null;
  createdAt: string;
  processedAt: string | null;
};

export type StudioAdminSnapshot = {
  summary: {
    totalPayments: number;
    paidPayments: number;
    pendingPayments: number;
    failedPayments: number;
    refundedPayments: number;
    paidRevenue: number;
    todayPaidPayments: number;
    todayPaidRevenue: number;
    customerCount: number;
    projectCount: number;
    notificationPending: number;
    notificationFailed: number;
    webhookReceived: number;
    webhookFailed: number;
    lastPaymentAt: string | null;
    lastWebhookAt: string | null;
  };
  payments: ServicePaymentRecord[];
  customers: StudioAdminCustomer[];
  projects: StudioAdminProject[];
  notifications: ServicePaymentRecord[];
  webhooks: StudioAdminWebhook[];
  system: {
    databaseConnected: boolean;
    databaseCheckedAt: string | null;
    paychanguConfigured: boolean;
    webhookSecretConfigured: boolean;
    brevoConfigured: boolean;
    notificationEmail: string;
    environment: string;
  };
};

function toBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.min(250, Math.max(25, Math.trunc(value)));
}

function rowToWebhook(row: Record<string, unknown>): StudioAdminWebhook {
  return {
    id: Number(row.id ?? 0),
    providerEventId: row.provider_event_id ? String(row.provider_event_id) : null,
    paymentReference: row.payment_reference ? String(row.payment_reference) : null,
    eventType: row.event_type ? String(row.event_type) : null,
    payloadHash: String(row.payload_hash ?? ""),
    status: String(row.status ?? "received"),
    signatureValid: toBoolean(row.signature_valid),
    error: row.error ? String(row.error) : null,
    createdAt: String(row.created_at ?? ""),
    processedAt: row.processed_at ? String(row.processed_at) : null,
  };
}

function rowToPayment(row: Record<string, unknown>): ServicePaymentRecord {
  return {
    id: String(row.id),
    serviceType: row.service_type as ServicePaymentRecord["serviceType"],
    customerName: String(row.customer_name ?? ""),
    customerPhone: String(row.customer_phone ?? ""),
    customerEmail: row.customer_email ? String(row.customer_email) : null,
    description: String(row.description ?? ""),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "MWK"),
    status: row.status as ServicePaymentRecord["status"],
    paymentMode: row.payment_mode
      ? (row.payment_mode as ServicePaymentRecord["paymentMode"])
      : null,
    projectTotal:
      row.project_total === null || row.project_total === undefined
        ? null
        : Number(row.project_total),
    projectReference: row.project_reference ? String(row.project_reference) : null,
    graphicId: row.graphic_id ? String(row.graphic_id) : null,
    providerReference: row.provider_reference
      ? String(row.provider_reference)
      : null,
    paymentReference: row.payment_reference
      ? String(row.payment_reference)
      : null,
    paidAt: row.paid_at ? String(row.paid_at) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
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

export async function getStudioAdminSnapshot(
  requestedLimit = 100,
): Promise<StudioAdminSnapshot> {
  const limit = clampLimit(requestedLimit);
  await ensureStudioDatabaseSchema();

  const [
    summaryResult,
    paymentResult,
    customerResult,
    projectResult,
    notificationResult,
    webhookResult,
    databaseResult,
  ] = await Promise.all([
    studioQuery<Record<string, unknown>>(`
      SELECT
        COUNT(*) AS total_payments,
        COUNT(*) FILTER (WHERE status = 'paid') AS paid_payments,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_payments,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed_payments,
        COUNT(*) FILTER (WHERE status = 'refunded') AS refunded_payments,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS paid_revenue,
        COUNT(*) FILTER (
          WHERE status = 'paid' AND paid_at >= CURRENT_DATE
        ) AS today_paid_payments,
        COALESCE(
          SUM(amount) FILTER (
            WHERE status = 'paid' AND paid_at >= CURRENT_DATE
          ),
          0
        ) AS today_paid_revenue,
        COUNT(DISTINCT customer_phone) AS customer_count,
        COUNT(DISTINCT NULLIF(project_reference, '')) AS project_count,
        COUNT(*) FILTER (
          WHERE success_notification_status IN ('pending', 'sending')
        ) AS notification_pending,
        COUNT(*) FILTER (
          WHERE success_notification_status = 'failed'
        ) AS notification_failed,
        (SELECT COUNT(*) FROM service_payment_webhook_events) AS webhook_received,
        (
          SELECT COUNT(*)
          FROM service_payment_webhook_events
          WHERE status = 'failed'
        ) AS webhook_failed,
        MAX(updated_at) AS last_payment_at,
        (
          SELECT MAX(created_at)
          FROM service_payment_webhook_events
        ) AS last_webhook_at
      FROM service_payments
    `),
    studioQuery<Record<string, unknown>>(
      `
        SELECT *
        FROM service_payments
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit],
    ),
    studioQuery<Record<string, unknown>>(
      `
        SELECT
          customer_phone,
          MAX(customer_name) AS customer_name,
          MAX(customer_email) AS customer_email,
          COUNT(*) AS payment_count,
          COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
          COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS paid_amount,
          COUNT(DISTINCT NULLIF(project_reference, '')) AS project_count,
          MAX(updated_at) AS last_activity_at
        FROM service_payments
        GROUP BY customer_phone
        ORDER BY MAX(updated_at) DESC
        LIMIT $1
      `,
      [limit],
    ),
    studioQuery<Record<string, unknown>>(
      `
        SELECT
          project_reference,
          MAX(customer_name) AS customer_name,
          MAX(customer_phone) AS customer_phone,
          COUNT(*) AS payment_count,
          COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS paid_amount,
          MAX(updated_at) AS last_activity_at,
          (ARRAY_AGG(status ORDER BY updated_at DESC))[1] AS latest_status
        FROM service_payments
        WHERE project_reference IS NOT NULL
          AND TRIM(project_reference) <> ''
        GROUP BY project_reference
        ORDER BY MAX(updated_at) DESC
        LIMIT $1
      `,
      [limit],
    ),
    studioQuery<Record<string, unknown>>(
      `
        SELECT *
        FROM service_payments
        WHERE success_notification_status <> 'sent'
        ORDER BY updated_at DESC
        LIMIT $1
      `,
      [limit],
    ),
    studioQuery<Record<string, unknown>>(
      `
        SELECT
          id,
          provider_event_id,
          payment_reference,
          event_type,
          payload_hash,
          status,
          signature_valid,
          error,
          created_at,
          processed_at
        FROM service_payment_webhook_events
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit],
    ),
    studioQuery<{ now: string }>(
      "SELECT CURRENT_TIMESTAMP::text AS now",
    ),
  ]);

  const summaryRow = summaryResult.rows[0] ?? {};

  return {
    summary: {
      totalPayments: Number(summaryRow.total_payments ?? 0),
      paidPayments: Number(summaryRow.paid_payments ?? 0),
      pendingPayments: Number(summaryRow.pending_payments ?? 0),
      failedPayments: Number(summaryRow.failed_payments ?? 0),
      refundedPayments: Number(summaryRow.refunded_payments ?? 0),
      paidRevenue: Number(summaryRow.paid_revenue ?? 0),
      todayPaidPayments: Number(summaryRow.today_paid_payments ?? 0),
      todayPaidRevenue: Number(summaryRow.today_paid_revenue ?? 0),
      customerCount: Number(summaryRow.customer_count ?? 0),
      projectCount: Number(summaryRow.project_count ?? 0),
      notificationPending: Number(summaryRow.notification_pending ?? 0),
      notificationFailed: Number(summaryRow.notification_failed ?? 0),
      webhookReceived: Number(summaryRow.webhook_received ?? 0),
      webhookFailed: Number(summaryRow.webhook_failed ?? 0),
      lastPaymentAt: summaryRow.last_payment_at
        ? String(summaryRow.last_payment_at)
        : null,
      lastWebhookAt: summaryRow.last_webhook_at
        ? String(summaryRow.last_webhook_at)
        : null,
    },
    payments: paymentResult.rows.map(rowToPayment),
    customers: customerResult.rows.map((row) => ({
      customerPhone: String(row.customer_phone ?? ""),
      customerName: String(row.customer_name ?? ""),
      customerEmail: row.customer_email ? String(row.customer_email) : null,
      paymentCount: Number(row.payment_count ?? 0),
      paidCount: Number(row.paid_count ?? 0),
      paidAmount: Number(row.paid_amount ?? 0),
      projectCount: Number(row.project_count ?? 0),
      lastActivityAt: String(row.last_activity_at ?? ""),
    })),
    projects: projectResult.rows.map((row) => ({
      projectReference: String(row.project_reference ?? ""),
      customerName: String(row.customer_name ?? ""),
      customerPhone: String(row.customer_phone ?? ""),
      paymentCount: Number(row.payment_count ?? 0),
      paidAmount: Number(row.paid_amount ?? 0),
      lastActivityAt: String(row.last_activity_at ?? ""),
      latestStatus: String(row.latest_status ?? "pending"),
    })),
    notifications: notificationResult.rows.map(rowToPayment),
    webhooks: webhookResult.rows.map(rowToWebhook),
    system: {
      databaseConnected: true,
      databaseCheckedAt: databaseResult.rows[0]?.now ?? new Date().toISOString(),
      paychanguConfigured: Boolean(process.env.PAYCHANGU_SECRET_KEY?.trim()),
      webhookSecretConfigured: Boolean(
        process.env.PAYCHANGU_WEBHOOK_SECRET?.trim(),
      ),
      brevoConfigured: Boolean(process.env.BREVO_API_KEY?.trim()),
      notificationEmail:
        process.env.XHOVILE_STUDIO_NOTIFICATION_EMAIL?.trim() ||
        "xhovilepublications@gmail.com",
      environment: process.env.NODE_ENV?.trim() || "development",
    },
  };
}

import "dotenv/config";

import { query } from "../server/postgres.js";
import {
  ensureStudioDatabaseSchema,
  studioQuery,
} from "../server/modules/services/studio.database.js";

type LegacyPayment = {
  id?: string;
  service_type?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string | null;
  description?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  payment_reference?: string | null;
  provider_reference?: string | null;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

function asString(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

async function tableExists(): Promise<boolean> {
  const result = await query<Record<string, unknown>>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = 'service_payments'
      ) AS exists
    `,
  );

  return result.rows[0]?.exists === true || result.rows[0]?.exists === "true";
}

async function migrate(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required for the legacy Studio payment migration.");
  }
  if (!process.env.XHOVILE_STUDIO_DATABASE_URL?.trim()) {
    throw new Error(
      "XHOVILE_STUDIO_DATABASE_URL is required for the legacy Studio payment migration.",
    );
  }

  await ensureStudioDatabaseSchema();

  if (!(await tableExists())) {
    console.log("[XhovileStudio] No legacy service_payments table found. Nothing to migrate.");
    return;
  }

  const legacy = await query<LegacyPayment>(`
    SELECT
      id,
      service_type,
      customer_name,
      customer_phone,
      customer_email,
      description,
      amount,
      currency,
      status,
      payment_reference,
      provider_reference,
      paid_at,
      created_at,
      updated_at
    FROM service_payments
    ORDER BY created_at ASC
  `);

  let inserted = 0;

  for (const row of legacy.rows) {
    const id = asString(row.id);
    if (!id) continue;

    const result = await studioQuery(
      `
        INSERT INTO service_payments (
          id,
          service_type,
          customer_name,
          customer_phone,
          customer_email,
          description,
          amount,
          currency,
          status,
          payment_mode,
          project_total,
          project_reference,
          graphic_id,
          reference_media,
          provider_reference,
          payment_reference,
          checkout_url,
          idempotency_key,
          idempotency_request_hash,
          paid_at,
          created_at,
          updated_at,
          success_notification_status,
          success_notification_sent_at,
          success_notification_error
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          NULL, NULL, NULL, NULL, '[]'::jsonb, $10, $11,
          NULL, NULL, NULL, $12, $13, $14,
          'pending',
          NULL,
          NULL
        )
        ON CONFLICT DO NOTHING
      `,
      [
        id,
        asString(row.service_type, "graphic_design"),
        asString(row.customer_name, "Unknown customer"),
        asString(row.customer_phone, "Unknown"),
        row.customer_email ? String(row.customer_email) : null,
        asString(row.description, "Legacy Xhovilé Studio payment"),
        Number(row.amount ?? 0),
        asString(row.currency, "MWK"),
        asString(row.status, "pending"),
        row.provider_reference ? String(row.provider_reference) : null,
        row.payment_reference ? String(row.payment_reference) : null,
        row.paid_at ? String(row.paid_at) : null,
        asString(row.created_at, new Date().toISOString()),
        asString(row.updated_at, new Date().toISOString()),
      ],
    );

    inserted += result.rowCount;
  }

  console.log(
    `[XhovileStudio] Legacy migration complete. Read ${legacy.rows.length} rows; inserted ${inserted} rows.`,
  );
}

migrate().catch((error) => {
  console.error(
    "[XhovileStudio] Legacy migration failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});

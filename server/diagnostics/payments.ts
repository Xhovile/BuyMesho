import type { Express } from "express";
import { PAYMENT_ENDPOINTS } from "../modules/payments/payment.endpoints.js";
import { paymentWebhookHandler } from "../modules/payments/payment.webhooks.js";
import { payoutWebhookHandler } from "../modules/payouts/payout.webhooks.js";
import { query } from "../postgres.js";
import type { DiagnosticPayload } from "./types.js";

export function registerPaymentDiagnosticsRoutes(app: Express) {
  app.get("/api/diagnostics/payments", async (_req, res) => {
    const started = Date.now();
    const expected = {
      initialize: "/api/payments/paychangu/initialize",
      verify: "/api/payments/paychangu/verify/:txRef",
      webhook: "/api/payments/paychangu/webhook",
      payoutWebhook: "/api/payments/paychangu-payout/webhook",
    } as const;

    const actual = PAYMENT_ENDPOINTS.paychangu as Record<string, string | undefined>;
    const mismatches = Object.fromEntries(
      Object.entries(expected)
        .filter(([key, value]) => actual[key] !== value)
        .map(([key, value]) => [key, { expected: value, actual: actual[key] }]),
    );
    const endpointsOk = Object.keys(mismatches).length === 0;
    const webhooksOk = typeof paymentWebhookHandler === "function" && typeof payoutWebhookHandler === "function";

    let schemaCheck: {
      status: "PASS" | "WARN" | "FAIL";
      message: string;
      details: Record<string, unknown>;
    };

    try {
      const [tableResult, columnResult, uniqueIndexResult, integrityResult, historyResult] = await Promise.all([
        query<{ exists: boolean }>(
          `SELECT EXISTS (
             SELECT 1
             FROM information_schema.tables
             WHERE table_schema = current_schema()
               AND table_name = 'payment_webhook_events'
           ) AS exists`,
        ),
        query<{ exists: boolean; nullable: string; has_default: boolean }>(
          `SELECT EXISTS (
             SELECT 1
             FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'payment_webhook_events'
               AND column_name = 'event_id'
           ) AS exists,
           COALESCE((SELECT is_nullable = 'YES'
                     FROM information_schema.columns
                     WHERE table_schema = current_schema()
                       AND table_name = 'payment_webhook_events'
                       AND column_name = 'event_id'), false) AS nullable,
           EXISTS (
             SELECT 1
             FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'payment_webhook_events'
               AND column_name = 'event_id'
               AND column_default IS NOT NULL
           ) AS has_default`,
        ),
        query<{ exists: boolean }>(
          `SELECT EXISTS (
             SELECT 1
             FROM pg_index idx
             JOIN pg_class index_rel ON index_rel.oid = idx.indexrelid
             JOIN pg_class table_rel ON table_rel.oid = idx.indrelid
             JOIN pg_namespace ns ON ns.oid = table_rel.relnamespace
             WHERE ns.nspname = current_schema()
               AND table_rel.relname = 'payment_webhook_events'
               AND idx.indisunique
               AND pg_get_indexdef(idx.indexrelid) ILIKE '%(provider, event_id)%'
           ) AS exists`,
        ),
        query<{ total_rows: string; null_event_id_rows: string; duplicate_event_groups: string }>(
          `SELECT
             COUNT(*)::bigint AS total_rows,
             COUNT(*) FILTER (WHERE event_id IS NULL)::bigint AS null_event_id_rows,
             (SELECT COUNT(*)::bigint
              FROM (
                SELECT provider, event_id
                FROM payment_webhook_events
                WHERE event_id IS NOT NULL
                GROUP BY provider, event_id
                HAVING COUNT(*) > 1
              ) duplicates) AS duplicate_event_groups
           FROM payment_webhook_events`,
        ),
        query<{ table_name: string }>(
          `SELECT table_name
           FROM information_schema.tables
           WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
             AND (table_name ILIKE '%migration%' OR table_name ILIKE '%schema%')
           ORDER BY table_name`,
        ),
      ]);

      const tableExists = Boolean(tableResult.rows[0]?.exists);
      const eventIdExists = Boolean(columnResult.rows[0]?.exists);
      const uniqueEventIndexExists = Boolean(uniqueIndexResult.rows[0]?.exists);
      const nullEventIdRows = Number(integrityResult.rows[0]?.null_event_id_rows ?? 0);
      const duplicateEventGroups = Number(integrityResult.rows[0]?.duplicate_event_groups ?? 0);
      const schemaPass = tableExists && eventIdExists && uniqueEventIndexExists && duplicateEventGroups === 0;
      const schemaWarn = schemaPass && nullEventIdRows > 0;

      schemaCheck = {
        status: schemaPass ? (schemaWarn ? "WARN" : "PASS") : "FAIL",
        message: schemaPass
          ? schemaWarn
            ? "Payment webhook schema is present, but some rows still have NULL event_id values"
            : "Payment webhook schema matches the current application contract"
          : "Payment webhook schema does not match the current application contract",
        details: {
          table_exists: tableExists,
          event_id_column_exists: eventIdExists,
          event_id_has_default: Boolean(columnResult.rows[0]?.has_default),
          unique_provider_event_id_index_exists: uniqueEventIndexExists,
          total_rows: Number(integrityResult.rows[0]?.total_rows ?? 0),
          null_event_id_rows: nullEventIdRows,
          duplicate_provider_event_id_groups: duplicateEventGroups,
          schema_history_like_tables: historyResult.rows.map((row) => row.table_name),
        },
      };
    } catch (error) {
      schemaCheck = {
        status: "FAIL",
        message: "Unable to inspect payment webhook schema",
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }

    const checksPass = endpointsOk && webhooksOk && schemaCheck.status !== "FAIL";
    const overall = checksPass
      ? schemaCheck.status === "WARN" ? "WARN" : "PASS"
      : "FAIL";

    const payload: DiagnosticPayload = {
      overall,
      authoritative: true,
      diagnostic_version: "4.2",
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - started,
      checks: {
        endpoint_contract: {
          status: endpointsOk ? "PASS" : "FAIL",
          message: endpointsOk ? "Payment endpoint contract matches" : "Payment endpoint contract mismatch",
          details: { mismatches },
        },
        webhook_exports: {
          status: webhooksOk ? "PASS" : "FAIL",
          message: webhooksOk ? "Payment and payout webhook handlers are exported" : "Webhook handler exports are missing",
          details: { paymentWebhookHandler: typeof paymentWebhookHandler === "function", payoutWebhookHandler: typeof payoutWebhookHandler === "function" },
        },
        webhook_schema: schemaCheck,
        environment: {
          status: process.env.PAYCHANGU_SECRET_KEY?.trim() && process.env.PAYCHANGU_WEBHOOK_SECRET?.trim() ? "PASS" : "WARN",
          message: process.env.PAYCHANGU_SECRET_KEY?.trim() && process.env.PAYCHANGU_WEBHOOK_SECRET?.trim() ? "PayChangu credentials are configured" : "PayChangu credentials are partially or not configured",
          details: {
            PAYCHANGU_SECRET_KEY: Boolean(process.env.PAYCHANGU_SECRET_KEY?.trim()),
            PAYCHANGU_WEBHOOK_SECRET: Boolean(process.env.PAYCHANGU_WEBHOOK_SECRET?.trim()),
          },
        },
      },
    };

    res.status(overall === "FAIL" ? 503 : 200).setHeader("Cache-Control", "no-store").json(payload);
  });
}

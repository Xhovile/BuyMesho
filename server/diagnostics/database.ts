import type { Express } from "express";
import { query } from "../postgres.js";
import type { DiagnosticPayload } from "./types.js";

export function registerDatabaseDiagnosticsRoutes(app: Express) {
  app.get("/api/diagnostics/database", async (_req, res) => {
    const started = Date.now();
    try {
      const [identity, tables, payoutSchema] = await Promise.all([
        query<{
          database_name: string;
          schema_name: string;
          search_path: string;
          server_version: string;
          ssl: boolean;
        }>(
          `SELECT current_database() AS database_name,
                  current_schema() AS schema_name,
                  current_setting('search_path') AS search_path,
                  current_setting('server_version') AS server_version,
                  COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()), false) AS ssl`,
        ),
        query<{ table_name: string }>(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY table_name",
        ),
        query<{ provider_ref_id_exists: boolean }>(
          `SELECT EXISTS (
             SELECT 1
             FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'payouts'
               AND column_name = 'provider_ref_id'
           ) AS provider_ref_id_exists`,
        ),
      ]);

      const row = identity.rows[0];
      const payoutSchemaRow = payoutSchema.rows[0];
      const providerRefIdExists = payoutSchemaRow?.provider_ref_id_exists === true;
      const overall = !row || !providerRefIdExists ? "FAIL" : row.ssl ? "PASS" : "WARN";
      const payload: DiagnosticPayload = {
        overall,
        authoritative: true,
        diagnostic_version: "3.1",
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - started,
        checks: {
          connection: {
            status: row ? "PASS" : "FAIL",
            message: row ? "Direct PostgreSQL query succeeded" : "Database identity query returned no row",
            details: { latency_ms: Date.now() - started },
          },
          identity: {
            status: row?.ssl ? "PASS" : row ? "WARN" : "FAIL",
            message: row?.ssl ? "Connected to PostgreSQL over SSL" : row ? "Connected to PostgreSQL without SSL" : "Database identity unavailable",
            details: row ?? {},
          },
          payout_schema: {
            status: providerRefIdExists ? "PASS" : "FAIL",
            message: providerRefIdExists
              ? "Runtime database contains payouts.provider_ref_id"
              : "Runtime database is missing payouts.provider_ref_id",
            details: {
              table_schema: row?.schema_name ?? null,
              table_name: "payouts",
              provider_ref_id_exists: providerRefIdExists,
            },
          },
          tables: {
            status: "PASS",
            message: "Database tables enumerated successfully",
            details: { count: tables.rowCount ?? 0 },
          },
        },
      };
      res.status(payload.overall === "FAIL" ? 503 : 200).setHeader("Cache-Control", "no-store").json(payload);
    } catch (error) {
      res.status(503).setHeader("Cache-Control", "no-store").json({
        overall: "FAIL",
        authoritative: true,
        diagnostic_version: "3.1",
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      } satisfies DiagnosticPayload);
    }
  });
}

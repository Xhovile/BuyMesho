import type { Express } from "express";
import { query } from "../postgres.js";
import type { DiagnosticPayload } from "./types.js";

export function registerBusinessDiagnosticsRoutes(app: Express) {
  app.get("/api/diagnostics/business", async (_req, res) => {
    const started = Date.now();
    try {
      const [orders, listings, lifecycle, lifecycleDetails] = await Promise.all([
        query<{ count: string }>("SELECT COUNT(*)::text AS count FROM orders"),
        query<{ count: string }>("SELECT COUNT(*)::text AS count FROM listings"),
        query<{ count: string }>(`
          SELECT COUNT(*)::text AS count
          FROM orders
          WHERE (status = 'paid' AND paid_at IS NULL)
             OR (status = 'in_escrow' AND paid_at IS NULL)
             OR (status = 'fulfilled' AND (paid_at IS NULL OR fulfilled_at IS NULL))
             OR (fulfilled_at IS NOT NULL AND paid_at IS NULL)
        `),
        query<{
          id: string;
          status: string;
          created_at: string | null;
          updated_at: string | null;
          paid_at: string | null;
          fulfilled_at: string | null;
          placed_at: string | null;
        }>(`
          SELECT id, status, created_at, updated_at, paid_at, fulfilled_at, placed_at
          FROM orders
          WHERE status = 'fulfilled'
            AND fulfilled_at IS NULL
          ORDER BY updated_at DESC NULLS LAST, created_at DESC
        `),
      ]);

      const lifecycleCount = Number(lifecycle.rows[0]?.count ?? 0);
      const status = lifecycleCount > 0 ? "FAIL" : "PASS";
      const payload: DiagnosticPayload = {
        overall: status,
        authoritative: true,
        diagnostic_version: "3.1",
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - started,
        checks: {
          records: {
            status: "PASS",
            message: "Business record counts collected",
            details: {
              orders: Number(orders.rows[0]?.count ?? 0),
              listings: Number(listings.rows[0]?.count ?? 0),
            },
          },
          order_lifecycle: {
            status,
            message: lifecycleCount > 0 ? "Order lifecycle timestamp inconsistencies detected" : "Order lifecycle timestamps are consistent",
            details: {
              count: lifecycleCount,
              offending_orders: lifecycle.rows[0]?.count === "0" ? [] : lifecycleDetails.rows,
            },
          },
        },
      };

      res.status(status === "FAIL" ? 503 : 200).setHeader("Cache-Control", "no-store").json(payload);
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

import type { Express } from "express";
import { query } from "../postgres.js";
import type { DiagnosticPayload } from "./types.js";

export function registerBusinessDiagnosticsRoutes(app: Express) {
  app.get("/api/diagnostics/business", async (_req, res) => {
    const started = Date.now();
    try {
      const [orders, listings, lifecycle] = await Promise.all([
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
      ]);

      const lifecycleCount = Number(lifecycle.rows[0]?.count ?? 0);
      const status = lifecycleCount > 0 ? "FAIL" : "PASS";
      const payload: DiagnosticPayload = {
        overall: status,
        authoritative: true,
        diagnostic_version: "3.0",
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
            details: { count: lifecycleCount },
          },
        },
      };

      res.status(status === "FAIL" ? 503 : 200).setHeader("Cache-Control", "no-store").json(payload);
    } catch (error) {
      res.status(503).setHeader("Cache-Control", "no-store").json({
        overall: "FAIL",
        authoritative: true,
        diagnostic_version: "3.0",
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      } satisfies DiagnosticPayload);
    }
  });
}

import type { Express } from "express";
import { query } from "../postgres.js";
import type { DiagnosticPayload } from "./types.js";

export function registerDatabaseDiagnosticsRoutes(app: Express) {
  app.get("/api/diagnostics/database", async (_req, res) => {
    const payload = await runDatabaseDiagnostics();
    res.status(payload.overall === "FAIL" ? 503 : 200).setHeader("Cache-Control", "no-store").json(payload);
  });
}

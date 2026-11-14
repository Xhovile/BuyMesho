import type { Express } from "express";
import { query } from "../postgres.js";
import type { DiagnosticPayload } from "./types.js";

export function registerMessagingDiagnosticsRoutes(app: Express) {
export async function runMessagingDiagnostics(): Promise<DiagnosticPayload> {
return payload;
}

export function registerMessagingDiagnosticsRoutes(app: Express) {
  app.get("/api/diagnostics/messaging", async (_req, res) => {
    const payload = await runMessagingDiagnostics();
    res.status(payload.overall === "FAIL" ? 503 : 200).setHeader("Cache-Control", "no-store").json(payload);
  });
}

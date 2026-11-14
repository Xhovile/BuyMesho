import type { Express } from "express";
import { getFirebaseAdmin } from "../auth/firebaseAdmin.js";
import { getCloudinaryAccounts, verifyCloudinaryAccounts } from "../lib/cloudinaryUpload.js";
import type { DiagnosticPayload } from "./types.js";

function configured(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export function registerInfrastructureDiagnosticsRoutes(app: Express) {
export async function runInfrastructureDiagnostics(): Promise<DiagnosticPayload> {
return payload;
}

export function registerInfrastructureDiagnosticsRoutes(app: Express) {
  app.get("/api/diagnostics/infrastructure", async (_req, res) => {
    const payload = await runInfrastructureDiagnostics();
    res.status(payload.overall === "FAIL" ? 503 : 200).setHeader("Cache-Control", "no-store").json(payload);
  });
}

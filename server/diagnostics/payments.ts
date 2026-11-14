import type { Express } from "express";
import { PAYMENT_ENDPOINTS } from "../modules/payments/payment.endpoints.js";
import { paymentWebhookHandler } from "../modules/payments/payment.webhooks.js";
import { payoutWebhookHandler } from "../modules/payouts/payout.webhooks.js";
import { query } from "../postgres.js";
import type { DiagnosticPayload } from "./types.js";

export function registerPaymentDiagnosticsRoutes(app: Express) {
export async function runPaymentDiagnostics(): Promise<DiagnosticPayload> {
return payload;
}

export function registerPaymentDiagnosticsRoutes(app: Express) {
  app.get("/api/diagnostics/payments", async (_req, res) => {
    const payload = await runPaymentDiagnostics();
    res.status(payload.overall === "FAIL" ? 503 : 200).setHeader("Cache-Control", "no-store").json(payload);
  });
}

import type { Express } from "express";
import { runDatabaseDiagnostics, registerDatabaseDiagnosticsRoutes } from "./database.js";
import { runBusinessDiagnostics, registerBusinessDiagnosticsRoutes } from "./business.js";
import { runPaymentDiagnostics, registerPaymentDiagnosticsRoutes } from "./payments.js";
import { runInfrastructureDiagnostics, registerInfrastructureDiagnosticsRoutes } from "./infrastructure.js";
import { runApiDiagnostics, registerApiDiagnosticsRoutes } from "./api.js";
import { runMessagingDiagnostics, registerMessagingDiagnosticsRoutes } from "./messaging.js";
import { registerRateLimitDiagnosticsRoutes } from "./rateLimit.js";
import type { DiagnosticPayload, NamedCheck } from "./types.js";

type DiagnosticRunner = () => Promise<DiagnosticPayload>;

function combineOverall(values: string[]): "PASS" | "WARN" | "FAIL" {
  if (values.includes("FAIL")) return "FAIL";
  if (values.includes("WARN")) return "WARN";
  return "PASS";
}

async function runSafely(name: string, runner: DiagnosticRunner): Promise<[string, DiagnosticPayload]> {
  try {
    return [name, await runner()];
  } catch (error) {
    return [name, {
      overall: "FAIL",
      authoritative: true,
      diagnostic_version: "1.0",
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      error: error instanceof Error ? error.message : String(error),
    }];
  }
}

export function registerDiagnosticsRoutes(app: Express, _deps?: { db?: any }) {
  registerDatabaseDiagnosticsRoutes(app);
  registerBusinessDiagnosticsRoutes(app);
  registerPaymentDiagnosticsRoutes(app);
  registerInfrastructureDiagnosticsRoutes(app);
  registerApiDiagnosticsRoutes(app);
  registerMessagingDiagnosticsRoutes(app);
  registerRateLimitDiagnosticsRoutes(app);

  app.get("/api/diagnostics", async (_req, res) => {
    const started = Date.now();
    const runners: Array<[string, DiagnosticRunner]> = [
      ["database", runDatabaseDiagnostics],
      ["business", runBusinessDiagnostics],
      ["payments", runPaymentDiagnostics],
      ["infrastructure", runInfrastructureDiagnostics],
      ["api", runApiDiagnostics],
      ["messaging", runMessagingDiagnostics],
    ];

    const results = await Promise.all(runners.map(([name, runner]) => runSafely(name, runner)));
    const checks: Record<string, NamedCheck> = {};
    const statuses: string[] = [];

    for (const [group, result] of results) {
      statuses.push(result.overall);
      if (result.checks) {
        for (const [key, check] of Object.entries(result.checks)) {
          checks[`${group}.${key}`] = check;
        }
      } else {
        checks[group] = {
          status: result.overall,
          message: result.error ?? `${group} diagnostic completed`,
        };
      }
    }

    const overall = combineOverall(statuses);
    const payload: DiagnosticPayload = {
      overall,
      authoritative: true,
      diagnostic_version: "4.3",
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - started,
      checks,
    };

    // Return the completed report even when one or more checks fail. The
    // caller needs the individual FAIL/WARN checks instead of a transport error.
    res.status(200).setHeader("Cache-Control", "no-store").json(payload);
  });
}

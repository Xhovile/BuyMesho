import { promisify } from "node:util";
import { execFile } from "node:child_process";
import type { Express } from "express";
import { registerDatabaseDiagnosticsRoutes } from "./database.js";
import { registerBusinessDiagnosticsRoutes } from "./business.js";
import { registerPaymentDiagnosticsRoutes } from "./payments.js";
import { registerInfrastructureDiagnosticsRoutes } from "./infrastructure.js";
import { registerApiDiagnosticsRoutes } from "./api.js";
import { registerMessagingDiagnosticsRoutes } from "./messaging.js";
import type { DiagnosticPayload, NamedCheck } from "./types.js";

type DiagnosticResponse = DiagnosticPayload;

type ExecResult = { stdout: string; stderr: string };
type ExecFailure = Error & {
  code?: string | number;
  killed?: boolean;
  signal?: NodeJS.Signals | null;
  stdout?: string;
  stderr?: string;
};

const execFileAsync = promisify(execFile);

const TESTS = {
  "payout-downtime": "server/modules/payouts/__tests__/payout.downtime.test.ts",
  "event-ticket-dispute": "server/modules/events/__tests__/eventTicketDisputeIdentity.test.ts",
  "event-transactions": "server/modules/events/__tests__/eventTransactionService.test.ts",
  "admin-ticket-search": "server/modules/admin/__tests__/adminTicketTransactionSearch.test.ts",
} as const;

function localBaseUrl(): string {
  const port = process.env.PORT ?? "10000";
  return `http://127.0.0.1:${port}`;
}

async function fetchDiagnostic(path: string): Promise<DiagnosticResponse> {
  const response = await fetch(new URL(path, localBaseUrl()), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : { overall: "FAIL", error: await response.text() };

  if (!body || typeof body !== "object") {
    return {
      overall: "FAIL",
      authoritative: true,
      diagnostic_version: "4.0",
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      error: `${path} returned an invalid diagnostic payload`,
    };
  }

  return body as DiagnosticResponse;
}

function combineOverall(values: string[]): "PASS" | "WARN" | "FAIL" {
  if (values.includes("FAIL")) return "FAIL";
  if (values.includes("WARN")) return "WARN";
  return "PASS";
}

function diagnosticFailure(error: unknown, durationMs: number, details?: Record<string, unknown>) {
  return {
    overall: "FAIL",
    authoritative: true,
    diagnostic_version: "4.2",
    timestamp: new Date().toISOString(),
    duration_ms: durationMs,
    error: error instanceof Error ? error.message : String(error),
    ...(details ? { details } : {}),
  };
}

export function registerDiagnosticsRoutes(app: Express, _deps?: { db?: any }) {
  registerDatabaseDiagnosticsRoutes(app);
  registerBusinessDiagnosticsRoutes(app);
  registerPaymentDiagnosticsRoutes(app);
  registerInfrastructureDiagnosticsRoutes(app);
  registerApiDiagnosticsRoutes(app);
  registerMessagingDiagnosticsRoutes(app);

  app.get("/api/diagnostics", async (_req, res) => {
    const started = Date.now();
    const paths = {
      database: "/api/diagnostics/database",
      business: "/api/diagnostics/business",
      payments: "/api/diagnostics/payments",
      infrastructure: "/api/diagnostics/infrastructure",
      api: "/api/diagnostics/api",
      messaging: "/api/diagnostics/messaging",
    } as const;

    try {
      const results = await Promise.all(
        Object.entries(paths).map(async ([key, path]) => [key, await fetchDiagnostic(path)] as const),
      );

      const checks: Record<string, NamedCheck> = {};
      const statuses: string[] = [];

      for (const [key, result] of results) {
        statuses.push(result.overall);
        if (result.checks) {
          for (const [checkKey, check] of Object.entries(result.checks)) {
            checks[`${key}.${checkKey}`] = check;
          }
        } else {
          checks[key] = {
            status: result.overall,
            message: result.error ?? `${key} diagnostic completed`,
          };
        }
      }

      const overall = combineOverall(statuses);
      const payload: DiagnosticPayload = {
        overall,
        authoritative: true,
        diagnostic_version: "4.1",
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - started,
        checks,
      };

      res
        .status(overall === "FAIL" ? 503 : 200)
        .setHeader("Cache-Control", "no-store")
        .json(payload);
    } catch (error) {
      res.status(503).setHeader("Cache-Control", "no-store").json({
        overall: "FAIL",
        authoritative: true,
        diagnostic_version: "4.1",
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      } satisfies DiagnosticPayload);
    }
  });

  app.get("/api/diagnostics/test-run", async (req, res) => {
    const started = Date.now();

    if (process.env.NODE_ENV === "production") {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const testName = typeof req.query.test === "string" ? req.query.test : "";
    if (!testName) {
      res.status(400).setHeader("Cache-Control", "no-store").json({
        error: "Missing test query parameter",
        available: Object.keys(TESTS),
      });
      return;
    }

    const testPath = TESTS[testName as keyof typeof TESTS];
    if (!testPath) {
      res.status(400).setHeader("Cache-Control", "no-store").json({
        error: `Unknown test: ${testName}`,
        available: Object.keys(TESTS),
      });
      return;
    }

    try {
      const result = await execFileAsync(
        process.execPath,
        ["--trace-uncaught", "--import", "tsx", "--import", "./server/testSafety.ts", "--test", "--test-concurrency=1", testPath],
        {
          cwd: process.cwd(),
          env: { ...process.env, NODE_ENV: "test" },
          timeout: 15000,
          killSignal: "SIGTERM",
          maxBuffer: 2 * 1024 * 1024,
        },
      ) as ExecResult;

      res.status(200).setHeader("Cache-Control", "no-store").json({
        status: "passed",
        test: testName,
        path: testPath,
        timedOut: false,
        exitCode: 0,
        duration_ms: Date.now() - started,
        stdout: result.stdout,
        stderr: result.stderr,
      });
    } catch (error) {
      const failure = error as ExecFailure;
      const timedOut = failure.killed === true || failure.code === "ETIMEDOUT";
      const exitCode = typeof failure.code === "number" ? failure.code : null;

      res.status(200).setHeader("Cache-Control", "no-store").json({
        status: timedOut ? "timed_out" : "failed",
        test: testName,
        path: testPath,
        timedOut,
        exitCode,
        signal: failure.signal ?? null,
        duration_ms: Date.now() - started,
        stdout: failure.stdout ?? "",
        stderr: failure.stderr ?? "",
        error: failure.message,
      });
    }
  });
}

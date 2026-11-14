import type { Express } from "express";
import type { DiagnosticPayload } from "./types.js";

type EndpointResult = {
  status: "PASS" | "WARN" | "FAIL";
  message: string;
  details: Record<string, unknown>;
};

async function checkEndpoint(
  baseUrl: string,
  path: string,
  expectedStatus: number,
  validateBody: (body: unknown) => { ok: boolean; message: string; details?: Record<string, unknown> },
): Promise<EndpointResult> {
  const started = Date.now();
  try {
    const response = await fetch(new URL(path, baseUrl), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    const latencyMs = Date.now() - started;
    const contentType = response.headers.get("content-type") ?? "";
    let body: unknown = null;

    if (contentType.includes("application/json")) {
      try {
        body = await response.json();
      } catch {
        body = null;
      }
    } else {
      body = await response.text();
    }

    if (response.status !== expectedStatus) {
      return {
        status: "FAIL",
        message: `${path} returned HTTP ${response.status}; expected ${expectedStatus}`,
        details: {
          http_status: response.status,
          latency_ms: latencyMs,
          content_type: contentType,
        },
      };
    }

    const validation = validateBody(body);
    return {
      status: validation.ok ? "PASS" : "FAIL",
      message: validation.message,
      details: {
        http_status: response.status,
        latency_ms: latencyMs,
        content_type: contentType,
        ...(validation.details ?? {}),
      },
    };
  } catch (error) {
    return {
      status: "FAIL",
      message: `${path} request failed: ${error instanceof Error ? error.message : String(error)}`,
      details: { latency_ms: Date.now() - started },
    };
  }
}

function validateEvents(body: unknown) {
  const items =
    typeof body === "object" && body !== null && Array.isArray((body as { items?: unknown }).items)
      ? (body as { items: unknown[] }).items
      : null;

  return {
    ok: items !== null,
    message: items !== null ? "/api/events returned a valid items array" : "/api/events response shape is invalid",
    details: { records_returned: items?.length ?? 0 },
  };
}

function validateProtectedContract(_body: unknown) {
  return {
    ok: true,
    message: "Protected endpoint is reachable and authentication can be validated separately",
    details: { response_shape_checked: false },
  };
}

function getDiagnosticBaseUrl() {
  const explicitBaseUrl = process.env.DIAGNOSTIC_BASE_URL ?? process.env.INTERNAL_API_BASE_URL;
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, "");
  }

  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

export function registerApiDiagnosticsRoutes(app: Express) {
export async function runApiDiagnostics(): Promise<DiagnosticPayload> {
return payload;
}

export function registerApiDiagnosticsRoutes(app: Express) {
  app.get("/api/diagnostics/api", async (_req, res) => {
    const payload = await runApiDiagnostics();
    res.status(payload.overall === "FAIL" ? 503 : 200).setHeader("Cache-Control", "no-store").json(payload);
  });
}

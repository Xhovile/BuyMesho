import type { Express, RequestHandler } from "express";
import { MemoryStore, RateLimiter, RateLimitStoreUnavailableError } from "@xhovile/platform/rate-limit";
import { rateLimit } from "@xhovile/platform/rate-limit/express";
import { RedisStore } from "@xhovile/platform/rate-limit/redis";
import type { DiagnosticPayload, NamedCheck, CheckStatus } from "./types.js";

const DIAGNOSTIC_VERSION = "1.3";
const RUN_WINDOW_MS = 60 * 60_000;

function enabled(): boolean {
  return Boolean(process.env.RATE_LIMIT_DIAGNOSTIC_TOKEN?.trim());
}

function result(status: CheckStatus, message: string, details?: Record<string, unknown>): NamedCheck {
  return { status, message, details };
}

function overall(checks: Record<string, NamedCheck>): CheckStatus {
  const statuses = Object.values(checks).map((check) => check.status);
  return statuses.includes("FAIL") ? "FAIL" : statuses.includes("WARN") ? "WARN" : "PASS";
}

async function runCoreCheck(): Promise<NamedCheck> {
  const now = Date.now();
  const store = new MemoryStore();
  const limiter = new RateLimiter(
    { name: `diagnostic.core.${now}`, limit: 3, windowMs: RUN_WINDOW_MS, key: "ip" },
    store,
    { now: () => now },
  );
  const responses = await Promise.all(Array.from({ length: 4 }, () => limiter.check({ ip: "diagnostic-ip" })));
  const allowed = responses.filter((item) => item.allowed).length;
  const denied = responses.filter((item) => !item.allowed).length;
  return allowed === 3 && denied === 1
    ? result("PASS", "Platform fixed-window core enforces the configured limit", { allowed, denied })
    : result("FAIL", "Platform fixed-window core returned an unexpected decision count", { allowed, denied });
}

async function runIsolationCheck(): Promise<NamedCheck> {
  const now = Date.now();
  const store = new MemoryStore();
  const limiter = new RateLimiter(
    { name: `diagnostic.isolation.${now}`, limit: 1, windowMs: RUN_WINDOW_MS, key: "user" },
    store,
    { now: () => now },
  );
  const firstA = await limiter.check({ userId: "user-a" });
  const secondA = await limiter.check({ userId: "user-a" });
  const firstB = await limiter.check({ userId: "user-b" });
  return firstA.allowed && !secondA.allowed && firstB.allowed
    ? result("PASS", "User-key counters are isolated correctly")
    : result("FAIL", "User-key counters are not isolated correctly", { first_a: firstA.allowed, second_a: secondA.allowed, first_b: firstB.allowed });
}

async function runConcurrencyCheck(): Promise<NamedCheck> {
  const now = Date.now();
  const store = new MemoryStore();
  const limiter = new RateLimiter(
    { name: `diagnostic.concurrency.${now}`, limit: 10, windowMs: RUN_WINDOW_MS, key: "ip" },
    store,
    { now: () => now },
  );
  const responses = await Promise.all(Array.from({ length: 20 }, () => limiter.check({ ip: "concurrent-diagnostic-ip" })));
  const allowed = responses.filter((item) => item.allowed).length;
  const denied = responses.filter((item) => !item.allowed).length;
  return allowed === 10 && denied === 10
    ? result("PASS", "Concurrent MemoryStore checks enforce the fixed-window limit", { allowed, denied })
    : result("FAIL", "Concurrent MemoryStore checks produced an unexpected decision count", { allowed, denied });
}

async function runFailureModeChecks(): Promise<NamedCheck> {
  const failingStore = { increment: async () => { throw new Error("diagnostic store failure"); } };
  const failClosed = new RateLimiter(
    { name: `diagnostic.closed.${Date.now()}`, limit: 1, windowMs: RUN_WINDOW_MS, key: "ip" },
    failingStore,
    { storeFailure: "fail-closed" },
  );
  const failOpen = new RateLimiter(
    { name: `diagnostic.open.${Date.now()}`, limit: 1, windowMs: RUN_WINDOW_MS, key: "ip" },
    failingStore,
    { storeFailure: "fail-open" },
  );
  let closed = false;
  try {
    await failClosed.check({ ip: "diagnostic-ip" });
  } catch (error) {
    closed = error instanceof RateLimitStoreUnavailableError;
  }
  const opened = await failOpen.check({ ip: "diagnostic-ip" });
  return closed && opened.allowed && opened.degraded
    ? result("PASS", "Fail-open and fail-closed semantics behave correctly")
    : result("FAIL", "Store failure semantics are incorrect", { fail_closed_rejected: closed, fail_open_allowed: opened.allowed, fail_open_degraded: opened.degraded });
}

async function runExpressCheck(): Promise<NamedCheck> {
  const responses: Array<Record<string, string | number | null>> = [];
  const headers = new Map<string, string>();
  const response = {
    setHeader(name: string, value: string) { headers.set(name, value); return this; },
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    json(_body: unknown) { return this; },
  };
  const handler = rateLimit({ name: `diagnostic.express.${Date.now()}`, limit: 3, windowMs: RUN_WINDOW_MS, key: "ip" });
  const request = { ip: "diagnostic-express-ip" };

  for (let index = 0; index < 4; index += 1) {
    headers.clear();
    response.statusCode = 200;
    await new Promise<void>((resolve, reject) => {
      handler(request as never, response as never, (error?: unknown) => error ? reject(error) : resolve());
      queueMicrotask(resolve);
    });
    responses.push({
      status: response.statusCode,
      limit: headers.get("RateLimit-Limit") ?? null,
      remaining: headers.get("RateLimit-Remaining") ?? null,
      reset: headers.get("RateLimit-Reset") ?? null,
      retryAfter: headers.get("Retry-After") ?? null,
    });
  }

  const denied = responses[3];
  const headersPresent = Boolean(denied?.limit && denied?.remaining && denied?.reset && denied?.retryAfter);
  return responses.filter((item) => item.status === 200).length === 3 && denied?.status === 429 && headersPresent
    ? result("PASS", "Express adapter returns 429 and the expected rate-limit headers", { responses })
    : result("FAIL", "Express adapter returned unexpected status or headers", { responses });
}

type RedisEvalClient = { eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown> };

async function redisCommand(urlString: string, values: string[]): Promise<Buffer> {
  const url = new URL(urlString);
  const host = url.hostname;
  const port = Number(url.port || (url.protocol === "rediss:" ? 6380 : 6379));
  const tls = url.protocol === "rediss:";
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") throw new Error("REDIS_URL must use redis:// or rediss://");
  const net = await import("node:net");
  const tlsModule = await import("node:tls");
  const socket = tls ? tlsModule.connect({ host, port, servername: host }) : net.connect({ host, port });
  const payload = `*${values.length}\r\n${values.map((value) => `$${Buffer.byteLength(value)}\r\n${value}\r\n`).join("")}`;
  await new Promise<void>((resolve, reject) => {
    socket.once("error", reject);
    socket.once(tls ? "secureConnect" : "connect", () => resolve());
  });
  return await new Promise<Buffer>((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (/^[+\-:]/.test(buffer.toString("utf8"))) { resolve(buffer); socket.end(); }
    });
    socket.once("error", reject);
    socket.setTimeout(5000, () => reject(new Error("Redis command timed out")));
    socket.write(payload);
  });
}

function parseRedisInteger(response: Buffer): number {
  const match = response.toString("utf8").match(/^:([-\d]+)\r\n/);
  if (!match) throw new Error(`Unexpected Redis response: ${response.toString("utf8").slice(0, 120)}`);
  const value = Number(match[1]);
  if (!Number.isSafeInteger(value)) throw new Error("Invalid Redis integer response");
  return value;
}

function buildRedisStore(urlString: string) {
  const client: RedisEvalClient = {
    eval: async (script, options) => {
      const url = new URL(urlString);
      const username = url.username ? decodeURIComponent(url.username) : "default";
      const password = url.password ? decodeURIComponent(url.password) : "";
      const db = url.pathname && url.pathname !== "/" ? url.pathname.slice(1) : "";
      if (password) await redisCommand(urlString, ["AUTH", username, password]);
      if (db) await redisCommand(urlString, ["SELECT", db]);
      return parseRedisInteger(await redisCommand(urlString, ["EVAL", script, String(options.keys.length), ...options.keys, ...options.arguments]));
    },
  };
  return new RedisStore(client);
}

async function runRedisCheck(): Promise<NamedCheck> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return result("WARN", "REDIS_URL is not configured; Redis checks were skipped");
  try {
    const store = buildRedisStore(url);
    const key = `diagnostic.atomic.${Date.now()}`;
    const counts = (await Promise.all(Array.from({ length: 20 }, () => store.increment(key, RUN_WINDOW_MS, Date.now())))).map((item) => item.count).sort((a, b) => a - b);
    const expected = counts.every((count, index) => count === index + 1);
    return expected ? result("PASS", "RedisStore atomically increments a shared fixed-window counter", { counts }) : result("FAIL", "RedisStore returned unexpected concurrent counter values", { counts });
  } catch (error) {
    return result("FAIL", "RedisStore diagnostic failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

function renderHtml(payload: DiagnosticPayload): string {
  const rows = Object.entries(payload.checks ?? {}).map(([name, check]) => `<tr><td>${name}</td><td class="${check.status}">${check.status}</td><td>${check.message}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>BuyMesho Rate Limit Diagnostics</title><style>body{font-family:system-ui,sans-serif;max-width:1000px;margin:40px auto;padding:0 20px}table{width:100%;border-collapse:collapse}td{padding:10px;border-bottom:1px solid #ddd}.PASS{color:#087f5b}.WARN{color:#b25e00}.FAIL{color:#c92a2a}code{background:#f4f4f4;padding:2px 5px}</style></head><body><h1>BuyMesho Rate Limit Diagnostics</h1><h2 class="${payload.overall}">${payload.overall}</h2><p>${payload.duration_ms} ms · ${payload.timestamp}</p><table><tr><th align="left">Check</th><th align="left">Status</th><th align="left">Message</th></tr>${rows}</table><p><code>REDIS_URL</code> enables Redis checks. The diagnostic is enabled by the server-side <code>RATE_LIMIT_DIAGNOSTIC_TOKEN</code> secret.</p></body></html>`;
}

export function registerRateLimitDiagnosticsRoutes(app: Express) {
  app.get("/api/diagnostics/rate-limit", async (req, res) => {
    if (!enabled()) return res.status(404).send("Not found");
    const started = Date.now();
    const checks: Record<string, NamedCheck> = {};
    try {
      checks.core = await runCoreCheck();
      checks.isolation = await runIsolationCheck();
      checks.concurrency = await runConcurrencyCheck();
      checks.failure_modes = await runFailureModeChecks();
      checks.express = await runExpressCheck();
      checks.redis = await runRedisCheck();
    } catch (error) {
      checks.runtime = result("FAIL", "Rate-limit diagnostic runner failed", { error: error instanceof Error ? error.message : String(error) });
    }
    const payload: DiagnosticPayload = {
      overall: overall(checks),
      authoritative: true,
      diagnostic_version: DIAGNOSTIC_VERSION,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - started,
      checks,
    };
    if (req.query.format === "json") return res.status(payload.overall === "FAIL" ? 503 : 200).setHeader("Cache-Control", "no-store").json(payload);
    return res.status(payload.overall === "FAIL" ? 503 : 200).setHeader("Cache-Control", "no-store").type("html").send(renderHtml(payload));
  });
}

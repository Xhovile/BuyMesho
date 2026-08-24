import type { Express, Request } from "express";
import { MemoryStore, RateLimiter, RateLimitStoreUnavailableError } from "@xhovile/platform/rate-limit";
import { rateLimit } from "@xhovile/platform/rate-limit/express";
import { RedisStore } from "@xhovile/platform/rate-limit/redis";
import { hasAdminAccess } from "../auth/adminAccess.js";
import { requireAuth } from "../middleware/requireAuth.js";
import type { DiagnosticPayload, NamedCheck, CheckStatus } from "./types.js";

const DIAGNOSTIC_VERSION = "1.2";
const RUN_WINDOW_MS = 10 * 60_000;

type RedisEvalClient = { eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown> };
type RedisSocket = import("node:net").Socket | import("node:tls").TLSSocket;

function authTokenMatches(req: Request): boolean {
  const expected = process.env.RATE_LIMIT_DIAGNOSTIC_TOKEN?.trim();
  if (!expected) return false;
  const authorization = req.get("authorization");
  const bearerMatches = authorization === `Bearer ${expected}`;
  const queryToken = typeof req.query.token === "string" ? req.query.token : "";
  return bearerMatches || queryToken === expected;
}

function result(status: CheckStatus, message: string, details?: Record<string, unknown>): NamedCheck {
  return { status, message, details };
}

function overall(checks: Record<string, NamedCheck>): CheckStatus {
  const statuses = Object.values(checks).map((check) => check.status);
  return statuses.includes("FAIL") ? "FAIL" : statuses.includes("WARN") ? "WARN" : "PASS";
}

async function runCoreCheck(): Promise<NamedCheck> {
  const store = new MemoryStore();
  const limiter = new RateLimiter({ name: `diagnostic.core.${Date.now()}`, limit: 3, windowMs: RUN_WINDOW_MS, key: "ip" }, store);
  const responses = await Promise.all(Array.from({ length: 4 }, () => limiter.check({ ip: "diagnostic-ip" })));
  const allowed = responses.filter((item) => item.allowed).length;
  const denied = responses.filter((item) => !item.allowed).length;
  return allowed === 3 && denied === 1
    ? result("PASS", "Platform fixed-window core enforces the configured limit", { allowed, denied })
    : result("FAIL", "Platform fixed-window core returned an unexpected decision count", { allowed, denied });
}

async function runIsolationCheck(): Promise<NamedCheck> {
  const store = new MemoryStore();
  const limiter = new RateLimiter({ name: `diagnostic.isolation.${Date.now()}`, limit: 1, windowMs: RUN_WINDOW_MS, key: "user" }, store);
  const first = await limiter.check({ userId: "user-a" });
  const secondA = await limiter.check({ userId: "user-a" });
  const firstB = await limiter.check({ userId: "user-b" });
  return first.allowed && !secondA.allowed && firstB.allowed
    ? result("PASS", "User-key counters are isolated correctly")
    : result("FAIL", "User-key counters are not isolated correctly", { first_a: first.allowed, second_a: secondA.allowed, first_b: firstB.allowed });
}

async function runConcurrencyCheck(): Promise<NamedCheck> {
  const store = new MemoryStore();
  const limiter = new RateLimiter({ name: `diagnostic.concurrency.${Date.now()}`, limit: 10, windowMs: RUN_WINDOW_MS, key: "ip" }, store);
  const responses = await Promise.all(Array.from({ length: 20 }, () => limiter.check({ ip: "concurrent-diagnostic-ip" })));
  const allowed = responses.filter((item) => item.allowed).length;
  const denied = responses.filter((item) => !item.allowed).length;
  return allowed === 10 && denied === 10
    ? result("PASS", "Concurrent MemoryStore checks enforce the fixed-window limit", { allowed, denied })
    : result("FAIL", "Concurrent MemoryStore checks produced an unexpected decision count", { allowed, denied });
}

async function runFailureModeChecks(): Promise<NamedCheck> {
  const failingStore = { increment: async () => { throw new Error("diagnostic store failure"); } };
  const failClosed = new RateLimiter({ name: `diagnostic.closed.${Date.now()}`, limit: 1, windowMs: RUN_WINDOW_MS, key: "ip" }, failingStore, { storeFailure: "fail-closed" });
  const failOpen = new RateLimiter({ name: `diagnostic.open.${Date.now()}`, limit: 1, windowMs: RUN_WINDOW_MS, key: "ip" }, failingStore, { storeFailure: "fail-open" });
  let closed = false;
  try { await failClosed.check({ ip: "diagnostic-ip" }); } catch (error) { closed = error instanceof RateLimitStoreUnavailableError; }
  const opened = await failOpen.check({ ip: "diagnostic-ip" });
  return closed && opened.allowed && opened.degraded
    ? result("PASS", "Fail-open and fail-closed semantics behave correctly")
    : result("FAIL", "Store failure semantics are incorrect", { fail_closed_rejected: closed, fail_open_allowed: opened.allowed, fail_open_degraded: opened.degraded });
}

async function runExpressCheck(app: Express, token: string): Promise<NamedCheck> {
  const path = `/api/diagnostics/rate-limit/probe/${Date.now()}`;
  app.get(path, rateLimit({ name: `diagnostic.express.${Date.now()}`, limit: 3, windowMs: RUN_WINDOW_MS, key: "ip" }), (_req, res) => res.status(200).json({ ok: true }));
  const base = `http://127.0.0.1:${process.env.PORT ?? "10000"}`;
  const responses = [];
  for (let index = 0; index < 4; index += 1) {
    const response = await fetch(`${base}${path}`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
    responses.push({ status: response.status, remaining: response.headers.get("RateLimit-Remaining"), limit: response.headers.get("RateLimit-Limit"), reset: response.headers.get("RateLimit-Reset"), retryAfter: response.headers.get("Retry-After") });
  }
  const denied = responses[3];
  const headersPresent = Boolean(denied?.limit && denied?.remaining && denied?.reset && denied?.retryAfter);
  return responses.filter((item) => item.status === 200).length === 3 && denied?.status === 429 && headersPresent
    ? result("PASS", "Express adapter returns 429 and the expected rate-limit headers", { responses })
    : result("FAIL", "Express adapter returned unexpected status or headers", { responses });
}

function encodeResp(values: string[]): Buffer {
  return Buffer.from(`*${values.length}\r\n${values.map((value) => `$${Buffer.byteLength(value)}\r\n${value}\r\n`).join("")}`);
}

async function redisCommand(urlString: string, values: string[]): Promise<Buffer> {
  const url = new URL(urlString);
  const host = url.hostname;
  const port = Number(url.port || (url.protocol === "rediss:" ? 6380 : 6379));
  const tls = url.protocol === "rediss:";
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") throw new Error("REDIS_URL must use redis:// or rediss://");
  const net = await import("node:net");
  const tlsModule = await import("node:tls");
  const socket: RedisSocket = tls ? tlsModule.connect({ host, port, servername: host }) : net.connect({ host, port });
  const connected = new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    socket.once("error", onError);
    socket.once(tls ? "secureConnect" : "connect", () => { socket.removeListener("error", onError); resolve(); });
  });
  const response = new Promise<Buffer>((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (/^[+\-:]/.test(buffer.toString("utf8"))) {
        socket.removeListener("data", onData);
        resolve(buffer);
        socket.end();
      }
    };
    socket.on("data", onData);
    socket.once("error", reject);
    socket.setTimeout(5000, () => reject(new Error("Redis command timed out")));
  });
  await connected;
  socket.write(encodeResp(values));
  return response;
}

function parseRedisInteger(response: Buffer): number | null {
  const text = response.toString("utf8");
  if (text.startsWith("+OK") || text.startsWith("+PONG")) return null;
  const match = text.match(/^:([-\d]+)\r\n/);
  if (!match) throw new Error(`Unexpected Redis response: ${text.slice(0, 120)}`);
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
      const result = await redisCommand(urlString, ["EVAL", script, String(options.keys.length), ...options.keys, ...options.arguments]);
      return parseRedisInteger(result);
    },
  };
  return new RedisStore(client);
}

async function runRedisCheck(): Promise<NamedCheck> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return result("WARN", "REDIS_URL is not configured; Redis checks were skipped");
  try {
    const key = `diagnostic.atomic.${Date.now()}`;
    const store = buildRedisStore(url);
    const responses = await Promise.all(Array.from({ length: 20 }, () => store.increment(key, RUN_WINDOW_MS, Date.now())));
    const counts = responses.map((item) => item.count).sort((a, b) => a - b);
    const expected = counts.every((count, index) => count === index + 1);
    return expected ? result("PASS", "RedisStore atomically increments a shared fixed-window counter", { counts }) : result("FAIL", "RedisStore returned unexpected concurrent counter values", { counts });
  } catch (error) {
    return result("FAIL", "RedisStore diagnostic failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

async function runDistributedCheck(token: string): Promise<NamedCheck> {
  const peer = process.env.RATE_LIMIT_DIAGNOSTIC_PEER_URL?.trim();
  if (!peer) return result("WARN", "RATE_LIMIT_DIAGNOSTIC_PEER_URL is not configured; multi-instance check was skipped");
  if (!process.env.REDIS_URL?.trim()) return result("WARN", "REDIS_URL is not configured; multi-instance check was skipped");
  const runId = `distributed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const local = `http://127.0.0.1:${process.env.PORT ?? "10000"}`;
  const urls = Array.from({ length: 10 }, (_, index) => index % 2 === 0 ? local : peer.replace(/\/$/, ""));
  const values: number[] = [];
  for (const url of urls) {
    const response = await fetch(`${url}/api/diagnostics/rate-limit/probe?runId=${encodeURIComponent(runId)}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return result("FAIL", "A diagnostic peer rejected the distributed probe", { http_status: response.status, url });
    const body = await response.json() as { count?: number };
    if (typeof body.count !== "number") return result("FAIL", "Distributed diagnostic probe returned an invalid count", { url });
    values.push(body.count);
  }
  return values.at(-1) === 10 ? result("PASS", "Two application instances shared one Redis counter", { counts: values, peer }) : result("FAIL", "Two application instances did not share one Redis counter", { counts: values, peer });
}

function renderHtml(payload: DiagnosticPayload): string {
  const rows = Object.entries(payload.checks ?? {}).map(([name, check]) => `<tr><td>${name}</td><td class="${check.status}">${check.status}</td><td>${check.message}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>BuyMesho Rate Limit Diagnostics</title><style>body{font-family:system-ui,sans-serif;max-width:1000px;margin:40px auto;padding:0 20px}table{width:100%;border-collapse:collapse}td{padding:10px;border-bottom:1px solid #ddd}.PASS{color:#087f5b}.WARN{color:#b25e00}.FAIL{color:#c92a2a}code{background:#f4f4f4;padding:2px 5px}</style></head><body><h1>BuyMesho Rate Limit Diagnostics</h1><h2 class="${payload.overall}">${payload.overall}</h2><p>${payload.duration_ms} ms · ${payload.timestamp}</p><table><tr><th align="left">Check</th><th align="left">Status</th><th align="left">Message</th></tr>${rows}</table><h3>Setup</h3><p>This endpoint is restricted to authenticated administrators. <code>REDIS_URL</code> enables Redis checks. <code>RATE_LIMIT_DIAGNOSTIC_PEER_URL</code> enables the two-instance Redis test.</p></body></html>`;
}

export function registerRateLimitDiagnosticsRoutes(app: Express) {
  app.get("/api/diagnostics/rate-limit/probe", async (req, res) => {
    if (!authTokenMatches(req)) return res.status(404).json({ error: "Not found" });
    const runId = String(req.query.runId ?? "").trim();
    if (!runId || !/^[A-Za-z0-9._:-]{1,120}$/.test(runId)) return res.status(400).json({ error: "Invalid runId" });
    const url = process.env.REDIS_URL?.trim();
    if (!url) return res.status(503).json({ error: "REDIS_URL is not configured" });
    try {
      const store = buildRedisStore(url);
      const value = await store.increment(`diagnostic.distributed.${runId}`, RUN_WINDOW_MS, Date.now());
      return res.json({ count: value.count });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/diagnostics/rate-limit", requireAuth, async (req, res) => {
    const started = Date.now();
    const user = req.user as { uid?: string; email?: string; role?: string; is_admin?: boolean } | undefined;
    if (!hasAdminAccess(user)) return res.status(403).json({ error: "Administrator access required" });
    const token = process.env.RATE_LIMIT_DIAGNOSTIC_TOKEN?.trim() ?? "";
    const checks: Record<string, NamedCheck> = {};
    try {
      checks.core = await runCoreCheck();
      checks.isolation = await runIsolationCheck();
      checks.concurrency = await runConcurrencyCheck();
      checks.failure_modes = await runFailureModeChecks();
      checks.express = await runExpressCheck(app, token);
      checks.redis = await runRedisCheck();
      checks.distributed = await runDistributedCheck(token);
    } catch (error) {
      checks.runtime = result("FAIL", "Rate-limit diagnostic runner failed", { error: error instanceof Error ? error.message : String(error) });
    }
    const payload: DiagnosticPayload = { overall: overall(checks), authoritative: true, diagnostic_version: DIAGNOSTIC_VERSION, timestamp: new Date().toISOString(), duration_ms: Date.now() - started, checks };
    if (req.query.format === "json") return res.status(payload.overall === "FAIL" ? 503 : 200).setHeader("Cache-Control", "no-store").json(payload);
    return res.status(payload.overall === "FAIL" ? 503 : 200).setHeader("Cache-Control", "no-store").type("html").send(renderHtml(payload));
  });
}

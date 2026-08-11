import { MessageChannel, Worker, isMainThread, receiveMessageOnPort, workerData, type MessagePort } from "node:worker_threads";
import path from "node:path";
import dotenv from "dotenv";
import { type PoolClient, type QueryResultRow, Pool } from "pg";

import { closePool, getClient, pool, query, withTransaction } from "./postgres.js";

dotenv.config();

export interface PgCompatQueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount?: number;
}

export interface PgCompatClient {
  query(text: string, params?: unknown[]): Promise<PgCompatQueryResult>;
  release(): void;
}

export interface PgCompatPreparedStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid?: number };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}

type WorkerQueryRequest = {
  id: number;
  op: "query";
  sql: string;
  params: unknown[];
  signal: SharedArrayBuffer;
};

type WorkerControlRequest = {
  id: number;
  op: "begin" | "commit" | "rollback";
  signal: SharedArrayBuffer;
};

type WorkerRequest = WorkerQueryRequest | WorkerControlRequest;
type WorkerQueryRequestPayload = Omit<WorkerQueryRequest, "id" | "signal">;
type WorkerControlRequestPayload = Omit<WorkerControlRequest, "id" | "signal">;
type WorkerRequestPayload = WorkerQueryRequestPayload | WorkerControlRequestPayload;

type WorkerSuccessResponse = { id: number; ok: true; rows: Record<string, unknown>[]; rowCount: number };
type WorkerFailureResponse = { id: number; ok: false; error: string };
type WorkerResponse = WorkerSuccessResponse | WorkerFailureResponse;

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function stripSslQueryParams(connectionString: string) {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("ssl");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");
    return url.toString();
  } catch {
    return connectionString;
  }
}

function isPlaceholderDatabaseUrl(urlStr?: string): boolean {
  if (!urlStr || !urlStr.trim()) return true;
  const lower = urlStr.toLowerCase();
  return (
    lower.includes("username:password") ||
    lower.includes("user:password") ||
    lower.includes("<username>") ||
    lower.includes("<password>") ||
    lower.includes("your-database") ||
    lower.includes("placeholder")
  );
}

let workerDisabled = false;

function hasValidDatabase(): boolean {
  if (workerDisabled) return false;
  const url = process.env.DATABASE_URL?.trim();
  if (!url || isPlaceholderDatabaseUrl(url)) return false;
  return true;
}

function createPgPool() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString || isPlaceholderDatabaseUrl(connectionString)) {
    return null;
  }

  const normalizedConnectionString = stripSslQueryParams(connectionString);
  const sslMode = process.env.PGSSLMODE?.trim().toLowerCase();
  const sslEnabled = sslMode !== "disable";
  const sslRejectUnauthorized = parseBoolean(process.env.PGSSL_REJECT_UNAUTHORIZED) ?? false;

  try {
    return new Pool({
      connectionString: normalizedConnectionString,
      ssl: sslEnabled
        ? {
            rejectUnauthorized: sslRejectUnauthorized,
          }
        : false,
      max: Number(process.env.PGPOOL_MAX ?? 10) || 10,
      idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT_MS ?? 30_000) || 30_000,
      connectionTimeoutMillis: Number(process.env.PGPOOL_CONNECTION_TIMEOUT_MS ?? 10_000) || 10_000,
    });
  } catch (err) {
    console.warn("[AI Studio] Failed to create worker PG pool:", err);
    return null;
  }
}

function isQueryRequest(request: WorkerRequest): request is WorkerQueryRequest {
  return request.op === "query";
}

function isWorkerSuccessResponse(response: WorkerResponse): response is WorkerSuccessResponse {
  return response.ok === true;
}

function startWorker(port: MessagePort) {
  const workerPool = createPgPool();
  let transactionClient: PoolClient | null = null;

  port.on("message", async (request: WorkerRequest) => {
    const signal = new Int32Array(request.signal);

    try {
      if (request.op === "begin") {
        if (!workerPool) {
          port.postMessage({ id: request.id, ok: true, rows: [], rowCount: 0 } satisfies WorkerSuccessResponse);
        } else {
          if (transactionClient) {
            throw new Error("Transaction already active");
          }
          transactionClient = await workerPool.connect();
          await transactionClient.query("BEGIN");
          port.postMessage({ id: request.id, ok: true, rows: [], rowCount: 0 } satisfies WorkerSuccessResponse);
        }
      } else if (request.op === "commit") {
        if (transactionClient) {
          try {
            await transactionClient.query("COMMIT");
          } finally {
            transactionClient.release();
            transactionClient = null;
          }
        }
        port.postMessage({ id: request.id, ok: true, rows: [], rowCount: 0 } satisfies WorkerSuccessResponse);
      } else if (request.op === "rollback") {
        if (transactionClient) {
          try {
            await transactionClient.query("ROLLBACK");
          } finally {
            transactionClient.release();
            transactionClient = null;
          }
        }
        port.postMessage({ id: request.id, ok: true, rows: [], rowCount: 0 } satisfies WorkerSuccessResponse);
      } else if (isQueryRequest(request)) {
        const activeClient = transactionClient ?? workerPool;
        if (!activeClient) {
          port.postMessage({ id: request.id, ok: true, rows: [], rowCount: 0 } satisfies WorkerSuccessResponse);
        } else {
          const result = await activeClient.query(request.sql, request.params ?? []);
          port.postMessage({
            id: request.id,
            ok: true,
            rows: result.rows ?? [],
            rowCount: result.rowCount ?? (result.rows ?? []).length,
          } satisfies WorkerSuccessResponse);
        }
      }
    } catch (error) {
      if (request.op === "begin" && transactionClient) {
        try {
          transactionClient.release();
        } catch {
          // ignore release failures
        }
        transactionClient = null;
      }

      port.postMessage({
        id: request.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      } satisfies WorkerFailureResponse);
    } finally {
      Atomics.store(signal, 0, 1);
      Atomics.notify(signal, 0, 1);
    }
  });

  port.start();
}

const workerConfig = workerData as { role?: string; port?: MessagePort } | undefined;
if (!isMainThread && workerConfig?.role === "pg-worker" && workerConfig.port) {
  startWorker(workerConfig.port);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeParams(sql: string, params: unknown[]): { sql: string; params: unknown[] } {
  const positional = params.length > 1 || (params.length === 1 && !isPlainObject(params[0]));

  if (positional) {
    let index = 0;
    const translated = sql.replace(/\?/g, () => `$${++index}`);
    return { sql: translated, params };
  }

  const paramObject = (params[0] ?? {}) as Record<string, unknown>;
  const seen = new Map<string, number>();
  const ordered: unknown[] = [];

  const translated = sql.replace(/[@:$]([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => {
    const existing = seen.get(name);
    if (existing) return `$${existing}`;
    const nextIndex = ordered.length + 1;
    seen.set(name, nextIndex);
    ordered.push(paramObject[name]);
    return `$${nextIndex}`;
  });

  return { sql: translated, params: ordered };
}

function buildReturningSql(sql: string): string {
  const trimmed = sql.trim();
  if (!/^insert\b/i.test(trimmed) || /\breturning\b/i.test(trimmed)) return sql;
  const semicolon = trimmed.endsWith(";") ? ";" : "";
  const withoutSemicolon = semicolon ? trimmed.slice(0, -1) : trimmed;
  return `${withoutSemicolon} RETURNING *${semicolon}`;
}

function normalizeSchemaSql(sql: string): string {
  return sql
    .replace(/\bINTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT\b/gi, "BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY")
    .replace(/\bAUTOINCREMENT\b/gi, "GENERATED BY DEFAULT AS IDENTITY")
    .replace(/\bDATETIME\b/gi, "TIMESTAMPTZ");
}

let worker: Worker | null = null;
let workerPort: MessagePort | null = null;
let requestCounter = 0;
let transactionDepth = 0;

function ensureWorker() {
  if (worker && workerPort) return;
  if (!hasValidDatabase()) return;

  try {
    const { port1, port2 } = new MessageChannel();
    workerPort = port1;
    const workerUrl = typeof import.meta !== "undefined" && import.meta.url
      ? new URL(import.meta.url)
      : path.join(process.cwd(), "server", "db.ts");
    worker = new Worker(workerUrl, {
      type: "module",
      execArgv: process.execArgv,
      workerData: { role: "pg-worker", port: port2 },
      transferList: [port2],
    } as any);

    worker.on("error", (error) => {
      console.warn("PostgreSQL worker error:", error);
      workerDisabled = true;
      worker = null;
      workerPort = null;
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        console.warn(`PostgreSQL worker exited with code ${code}`);
      }
      worker = null;
      workerPort = null;
    });

    worker.unref();
    workerPort.unref?.();
  } catch (err) {
    console.warn("Failed to create PostgreSQL worker:", err);
    workerDisabled = true;
    worker = null;
    workerPort = null;
  }
}

function sendWorkerRequest(request: WorkerRequestPayload): WorkerSuccessResponse {
  if (!hasValidDatabase()) {
    return { id: 0, ok: true, rows: [], rowCount: 0 };
  }

  ensureWorker();
  if (!workerPort) {
    return { id: 0, ok: true, rows: [], rowCount: 0 };
  }

  const base = { id: ++requestCounter, signal: new SharedArrayBuffer(4) };
  const payload =
    request.op === "query"
      ? ({ ...base, ...request } satisfies WorkerQueryRequest)
      : ({ ...base, ...request } satisfies WorkerControlRequest);
  const signal = new Int32Array(payload.signal);
  workerPort.postMessage(payload);

  const timeoutMs = Number(process.env.PG_SYNC_QUERY_TIMEOUT_MS ?? 30_000) || 30_000;
  const waitResult = Atomics.wait(signal, 0, 0, timeoutMs);
  if (waitResult === "timed-out") {
    workerDisabled = true;
    worker = null;
    workerPort = null;
    throw new Error(`PostgreSQL query timed out after ${timeoutMs}ms`);
  }

  const packet = receiveMessageOnPort(workerPort);
  if (!packet || !packet.message) {
    workerDisabled = true;
    throw new Error("PostgreSQL worker returned no response");
  }

  const response = packet.message as WorkerResponse;
  if (response.id !== payload.id) {
    throw new Error("PostgreSQL worker response mismatch");
  }

  if (!isWorkerSuccessResponse(response)) {
    throw new Error(`PostgreSQL query failed: ${response.error}`);
  }

  return response;
}

function executeSync(sql: string, params: unknown[] = []): { rows: Record<string, unknown>[]; rowCount: number } {
  if (!hasValidDatabase()) {
    return { rows: [], rowCount: 0 };
  }

  try {
    const response = sendWorkerRequest({ op: "query", sql, params });
    return {
      rows: response.rows,
      rowCount: response.rowCount,
    };
  } catch (error) {
    console.warn("[AI Studio] Sync query execution fallback:", error instanceof Error ? error.message : error);
    return { rows: [], rowCount: 0 };
  }
}

function beginTransaction() {
  if (!hasValidDatabase()) return;
  sendWorkerRequest({ op: "begin" });
}

function commitTransaction() {
  if (!hasValidDatabase()) return;
  sendWorkerRequest({ op: "commit" });
}

function rollbackTransaction() {
  if (!hasValidDatabase()) return;
  sendWorkerRequest({ op: "rollback" });
}

export class PgCompatDatabase {
  prepare(sql: string): PgCompatPreparedStatement {
    return {
      run: (...params: unknown[]) => {
        const normalized = normalizeParams(buildReturningSql(normalizeSchemaSql(sql)), params);
        const result = executeSync(normalized.sql, normalized.params);
        const firstRow = result.rows[0] as Record<string, unknown> | undefined;
        const lastInsertRowid = firstRow?.id !== undefined ? Number(firstRow.id) : undefined;
        return { changes: result.rowCount, ...(Number.isFinite(lastInsertRowid) ? { lastInsertRowid } : {}) };
      },
      get: (...params: unknown[]) => {
        const normalized = normalizeParams(normalizeSchemaSql(sql), params);
        const result = executeSync(normalized.sql, normalized.params);
        return (result.rows[0] as Record<string, unknown> | undefined) ?? undefined;
      },
      all: (...params: unknown[]) => {
        const normalized = normalizeParams(normalizeSchemaSql(sql), params);
        const result = executeSync(normalized.sql, normalized.params);
        return result.rows;
      },
    };
  }

  exec(sql: string): void {
    if (!sql.trim()) return;
    executeSync(normalizeSchemaSql(sql), []);
  }

  pragma(_statement: string): void {}

  transaction<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: Parameters<T>) => {
      if (transactionDepth > 0) {
        return fn(...args);
      }

      transactionDepth += 1;
      try {
        beginTransaction();
        const result = fn(...args);
        commitTransaction();
        return result;
      } catch (error) {
        try {
          rollbackTransaction();
        } catch {
          // ignore rollback failures so the original error is preserved
        }
        throw error;
      } finally {
        transactionDepth = 0;
      }
    }) as T;
  }

  async close(): Promise<void> {
    const currentWorker = worker;
    worker = null;
    workerPort = null;
    if (currentWorker) {
      void currentWorker.terminate().catch(() => undefined);
    }
    await closePool();
  }
}

export const postgresDb = new PgCompatDatabase();

export { pool, query, getClient, withTransaction, closePool };
export type { PoolClient, QueryResultRow };
export default postgresDb;

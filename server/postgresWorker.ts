import { parentPort, type MessagePort } from "node:worker_threads";
import fs from "node:fs";
import path from "node:path";
import { Pool, type PoolClient } from "pg";

import dotenv from "dotenv";
dotenv.config();

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
type WorkerSuccessResponse = {
  id: number;
  ok: true;
  rows: Record<string, unknown>[];
  rowCount: number;
};
type WorkerFailureResponse = {
  id: number;
  ok: false;
  error: string;
};
type WorkerResponse = WorkerSuccessResponse | WorkerFailureResponse;

const workerPort = parentPort as MessagePort | null;
if (!workerPort) {
  throw new Error("PostgreSQL worker started without a parent port.");
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function stripSslQueryParams(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    for (const param of ["sslmode", "ssl", "sslcert", "sslkey", "sslrootcert"]) {
      url.searchParams.delete(param);
    }
    return url.toString();
  } catch {
    return connectionString.trim();
  }
}

function loadSslCaCertificate(): string | undefined {
  const sslMode = process.env.PGSSLMODE?.trim().toLowerCase();
  const sslEnabled = sslMode !== "disable";
  const rejectUnauthorized = parseBoolean(process.env.PGSSL_REJECT_UNAUTHORIZED) ?? false;
  if (!sslEnabled || !rejectUnauthorized) return undefined;

  const inlineCa = process.env.PGSSL_CA?.trim();
  if (inlineCa) return inlineCa;

  const caPath = process.env.PGSSL_CA_PATH?.trim() || path.resolve(process.cwd(), "ca.pem");
  return fs.readFileSync(caPath, "utf8");
}

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error("PostgreSQL worker requires DATABASE_URL.");
}

const sslCa = loadSslCaCertificate();
const sslMode = process.env.PGSSLMODE?.trim().toLowerCase();
const sslEnabled = sslMode !== "disable";
const rejectUnauthorized = parseBoolean(process.env.PGSSL_REJECT_UNAUTHORIZED) ?? false;

const pool = new Pool({
  connectionString: stripSslQueryParams(connectionString),
  ssl: sslEnabled
    ? {
        rejectUnauthorized,
        ...(sslCa ? { ca: sslCa } : {}),
      }
    : false,
  max: Number(process.env.PGPOOL_MAX ?? 10) || 10,
  idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT_MS ?? 30000) || 30000,
  connectionTimeoutMillis: Number(process.env.PGPOOL_CONNECTION_TIMEOUT_MS ?? 10000) || 10000,
});

let transactionClient: PoolClient | null = null;

function isQueryRequest(request: WorkerRequest): request is WorkerQueryRequest {
  return request.op === "query";
}

function sendResponse(response: WorkerResponse): void {
  workerPort.postMessage(response);
}

workerPort.on("message", async (request: WorkerRequest) => {
  const signal = new Int32Array(request.signal);

  try {
    if (request.op === "begin") {
      if (transactionClient) throw new Error("Transaction already active");
      transactionClient = await pool.connect();
      await transactionClient.query("BEGIN");
      sendResponse({ id: request.id, ok: true, rows: [], rowCount: 0 });
    } else if (request.op === "commit") {
      if (transactionClient) {
        await transactionClient.query("COMMIT");
        transactionClient.release();
        transactionClient = null;
      }
      sendResponse({ id: request.id, ok: true, rows: [], rowCount: 0 });
    } else if (request.op === "rollback") {
      if (transactionClient) {
        await transactionClient.query("ROLLBACK");
        transactionClient.release();
        transactionClient = null;
      }
      sendResponse({ id: request.id, ok: true, rows: [], rowCount: 0 });
    } else if (isQueryRequest(request)) {
      const activeClient = transactionClient ?? pool;
      const result = await activeClient.query(request.sql, request.params ?? []);
      sendResponse({
        id: request.id,
        ok: true,
        rows: result.rows ?? [],
        rowCount: result.rowCount ?? (result.rows ?? []).length,
      });
    }
  } catch (error) {
    if (transactionClient && request.op !== "begin") {
      try {
        await transactionClient.query("ROLLBACK");
      } catch {
        // Preserve the original failure.
      }
      transactionClient.release();
      transactionClient = null;
    }

    sendResponse({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    Atomics.store(signal, 0, 1);
    Atomics.notify(signal, 0, 1);
  }
});

workerPort.start();
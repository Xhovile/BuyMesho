import { parentPort, workerData, type MessagePort } from "node:worker_threads";
import fs from "node:fs";
import path from "node:path";
import { Client, Pool, type PoolClient } from "pg";

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

type Queryable = Pick<Client, "query"> | Pick<Pool, "query">;
type TransactionClient = PoolClient | Client;

const configuredWorkerPort = (workerData as { port?: MessagePort } | undefined)?.port ?? parentPort;
if (!configuredWorkerPort) {
  throw new Error("PostgreSQL worker started without a communication port.");
}
const workerPort: MessagePort = configuredWorkerPort;

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
const isTestWorker = process.env.NODE_ENV === "test";

const connectionConfig = {
  connectionString: stripSslQueryParams(connectionString),
  ssl: sslEnabled
    ? {
        rejectUnauthorized,
        ...(sslCa ? { ca: sslCa } : {}),
      }
    : false,
  connectionTimeoutMillis: Number(process.env.PGPOOL_CONNECTION_TIMEOUT_MS ?? 10000) || 10000,
};

const pool = isTestWorker
  ? null
  : new Pool({
      ...connectionConfig,
      max: Number(process.env.PGPOOL_MAX ?? 10) || 10,
      idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT_MS ?? 30000) || 30000,
    });

const testClient = isTestWorker ? new Client(connectionConfig) : null;
let testClientConnected = false;
let transactionClient: TransactionClient | null = null;

async function getTestClient(): Promise<Client> {
  if (!testClient) throw new Error("Test PostgreSQL client is unavailable.");
  if (!testClientConnected) {
    await testClient.connect();
    testClientConnected = true;
  }
  return testClient;
}

async function getQueryTarget(): Promise<Queryable> {
  if (isTestWorker) return getTestClient();
  if (!pool) throw new Error("PostgreSQL worker pool is unavailable.");
  return pool;
}

function isQueryRequest(request: WorkerRequest): request is WorkerQueryRequest {
  return request.op === "query";
}

function sendResponse(response: WorkerResponse): void {
  workerPort.postMessage(response);
}

function releaseTransactionClient(client: TransactionClient): void {
  if ("release" in client) client.release();
}

async function rollbackAndReleaseTransaction(): Promise<void> {
  if (!transactionClient) return;

  try {
    await transactionClient.query("ROLLBACK");
  } catch {
    // Preserve the original failure.
  }

  if (!isTestWorker) {
    try {
      releaseTransactionClient(transactionClient);
    } catch {
      // Ignore release failures.
    }
  }

  transactionClient = null;
}

workerPort.on("message", async (request: WorkerRequest) => {
  const signal = new Int32Array(request.signal);

  try {
    if (request.op === "begin") {
      if (transactionClient) throw new Error("Transaction already active");

      transactionClient = isTestWorker
        ? await getTestClient()
        : await (async () => {
            if (!pool) throw new Error("PostgreSQL worker pool is unavailable.");
            return pool.connect();
          })();

      await transactionClient.query("BEGIN");
      sendResponse({ id: request.id, ok: true, rows: [], rowCount: 0 });
    } else if (request.op === "commit") {
      if (transactionClient) {
        await transactionClient.query("COMMIT");
        if (!isTestWorker) releaseTransactionClient(transactionClient);
        transactionClient = null;
      }
      sendResponse({ id: request.id, ok: true, rows: [], rowCount: 0 });
    } else if (request.op === "rollback") {
      if (transactionClient) {
        await transactionClient.query("ROLLBACK");
        if (!isTestWorker) releaseTransactionClient(transactionClient);
        transactionClient = null;
      }
      sendResponse({ id: request.id, ok: true, rows: [], rowCount: 0 });
    } else if (isQueryRequest(request)) {
      const activeClient = transactionClient ?? (await getQueryTarget());
      const result = await activeClient.query(request.sql, request.params ?? []);
      sendResponse({
        id: request.id,
        ok: true,
        rows: result.rows ?? [],
        rowCount: result.rowCount ?? (result.rows ?? []).length,
      });
    }
  } catch (error) {
    await rollbackAndReleaseTransaction();
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

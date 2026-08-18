import { parentPort, workerData, type MessagePort } from "node:worker_threads";
import type { Pool, PoolClient } from "pg";

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

type PostgresModule = {
  pool: Pool;
};

const workerPort = parentPort as MessagePort | null;
if (!workerPort) {
  throw new Error("PostgreSQL worker started without a parent port.");
}

const postgresModulePath =
  process.env.NODE_ENV === "test"
    ? new URL("./postgres.ts", import.meta.url).href
    : new URL("./postgres.js", import.meta.url).href;

const { pool } = (await import(postgresModulePath)) as PostgresModule;

function isQueryRequest(request: WorkerRequest): request is WorkerQueryRequest {
  return request.op === "query";
}

workerPort.on("message", async (request: WorkerRequest) => {
  const signal = new Int32Array(request.signal);
  let transactionClient: PoolClient | null = null;

  try {
    if (request.op === "begin") {
      transactionClient = await pool.connect();
      await transactionClient.query("BEGIN");
      (workerPort as MessagePort).postMessage({
        id: request.id,
        ok: true,
        rows: [],
        rowCount: 0,
      } satisfies WorkerSuccessResponse);
    } else if (request.op === "commit") {
      (workerPort as MessagePort).postMessage({
        id: request.id,
        ok: true,
        rows: [],
        rowCount: 0,
      } satisfies WorkerSuccessResponse);
    } else if (request.op === "rollback") {
      (workerPort as MessagePort).postMessage({
        id: request.id,
        ok: true,
        rows: [],
        rowCount: 0,
      } satisfies WorkerSuccessResponse);
    } else if (isQueryRequest(request)) {
      const result = await pool.query(request.sql, request.params ?? []);
      (workerPort as MessagePort).postMessage({
        id: request.id,
        ok: true,
        rows: result.rows ?? [],
        rowCount: result.rowCount ?? (result.rows ?? []).length,
      } satisfies WorkerSuccessResponse);
    }
  } catch (error) {
    if (transactionClient) {
      try {
        await transactionClient.query("ROLLBACK");
      } catch {
        // Preserve the original failure.
      }
      try {
        transactionClient.release();
      } catch {
        // Ignore release failures.
      }
      transactionClient = null;
    }

    (workerPort as MessagePort).postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } satisfies WorkerFailureResponse);
  } finally {
    Atomics.store(signal, 0, 1);
    Atomics.notify(signal, 0, 1);
  }
});

workerPort.start();

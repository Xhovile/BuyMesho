import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

import { closePool, getClient, pool, query, withTransaction } from "./postgres.js";

dotenv.config();

export interface SqliteQueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount?: number;
}

export interface SqliteClient {
  query(text: string, params?: unknown[]): Promise<SqliteQueryResult>;
  release(): void;
}

export interface SqlitePreparedStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid?: number };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeParams(
  sql: string,
  params: unknown[],
): { sql: string; params: unknown[] } {
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
  if (!/^insert\b/i.test(trimmed) || /\breturning\b/i.test(trimmed)) {
    return sql;
  }

  const semicolon = trimmed.endsWith(";") ? ";" : "";
  const withoutSemicolon = semicolon ? trimmed.slice(0, -1) : trimmed;
  return `${withoutSemicolon} RETURNING *${semicolon}`;
}

function executeSync(sql: string, params: unknown[] = []): { rows: Record<string, unknown>[]; rowCount: number } {
  const payload = JSON.stringify({ sql, params });
  const child = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { Client } from 'pg';
const payload = JSON.parse(process.env.PG_PAYLOAD || '{}');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE && process.env.PGSSLMODE.toLowerCase() === 'disable'
    ? false
    : { rejectUnauthorized: String(process.env.PGSSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true' },
});
try {
  await client.connect();
  const result = await client.query(payload.sql, payload.params || []);
  process.stdout.write(JSON.stringify({ rows: result.rows || [], rowCount: result.rowCount ?? (result.rows || []).length }));
} finally {
  try { await client.end(); } catch {}
}
`,
      ],
      {
        env: {
          ...process.env,
          PG_PAYLOAD: payload,
        },
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      },
    ),
  );

  if (child.status !== 0) {
    throw new Error(
      [
        "PostgreSQL query failed",
        child.stderr ? String(child.stderr).trim() : "",
        child.stdout ? String(child.stdout).trim() : "",
      ]
        .filter(Boolean)
        .join(": "),
    );
  }

  const output = JSON.parse(String(child.stdout || "{}")) as {
    rows?: Record<string, unknown>[];
    rowCount?: number;
  };

  return {
    rows: Array.isArray(output.rows) ? output.rows : [],
    rowCount: Number.isFinite(output.rowCount) ? Number(output.rowCount) : 0,
  };
}

function isResultSetStatement(sql: string): boolean {
  const trimmed = sql.trim();
  return (
    /^select\b/i.test(trimmed) ||
    /^with\b/i.test(trimmed) ||
    /^pragma\b/i.test(trimmed) ||
    /^values\b/i.test(trimmed) ||
    /\breturning\b/i.test(trimmed)
  );
}

class PgCompatDatabase {
  prepare(sql: string): SqlitePreparedStatement {
    return {
      run: (...params: unknown[]) => {
        const normalized = normalizeParams(buildReturningSql(sql), params);
        const result = executeSync(normalized.sql, normalized.params);
        const firstRow = result.rows[0] as Record<string, unknown> | undefined;
        const lastInsertRowid = firstRow?.id !== undefined ? Number(firstRow.id) : undefined;
        return {
          changes: result.rowCount,
          ...(Number.isFinite(lastInsertRowid) ? { lastInsertRowid } : {}),
        };
      },
      get: (...params: unknown[]) => {
        const normalized = normalizeParams(sql, params);
        const result = executeSync(normalized.sql, normalized.params);
        return (result.rows[0] as Record<string, unknown> | undefined) ?? undefined;
      },
      all: (...params: unknown[]) => {
        const normalized = normalizeParams(sql, params);
        const result = executeSync(normalized.sql, normalized.params);
        return result.rows;
      },
    };
  }

  exec(sql: string): void {
    if (!sql.trim()) return;
    executeSync(sql, []);
  }

  pragma(_statement: string): void {
    // PostgreSQL does not use SQLite pragmas. Kept for compatibility.
  }

  transaction<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: any[]) => fn(...args)) as T;
  }

  close(): void {
    void closePool();
  }
}

export const sqliteDb = new PgCompatDatabase();

export async function getDatabaseClient(): Promise<PoolClient> {
  return getClient();
}

export { pool, query, closePool, getClient, withTransaction };
export type { QueryResultRow };

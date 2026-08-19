import assert from "node:assert/strict";
import test from "node:test";
import {
  EventOwnershipReconciliationScheduler,
  getEventOwnershipReconciliationConfig,
  reconcileEventCreatorOwnership,
} from "../event-ownership.reconciliation.js";

type LogEntry = { level: "log" | "warn" | "error"; args: unknown[] };

function createLogger(entries: LogEntry[]) {
  return {
    log: (...args: unknown[]) => entries.push({ level: "log", args }),
    warn: (...args: unknown[]) => entries.push({ level: "warn", args }),
    error: (...args: unknown[]) => entries.push({ level: "error", args }),
  };
}

function createDatabase(rows: Array<{ uid: string }>) {
  const statements: string[] = [];
  return {
    statements,
    transaction<T>(fn: (uid: string) => T) {
      return (uid: string) => fn(uid);
    },
    prepare(sql: string) {
      if (sql.startsWith("SELECT uid FROM event_creators")) {
        return { all: () => rows };
      }
      return {
        run: (uid: string) => {
          statements.push(`${sql}|${uid}`);
          return { changes: 1 };
        },
      };
    },
  };
}

test("event ownership worker bounds environment configuration", () => {
  assert.deepEqual(
    getEventOwnershipReconciliationConfig({
      EVENT_OWNERSHIP_RECONCILIATION_WORKER_ENABLED: "true",
      EVENT_OWNERSHIP_RECONCILIATION_WORKER_INTERVAL_MS: "1000",
      EVENT_OWNERSHIP_RECONCILIATION_WORKER_BATCH_LIMIT: "500",
    }),
    { enabled: true, intervalMs: 30_000, batchLimit: 100 },
  );
});

test("reconciliation preserves events when Firebase Auth user exists", async () => {
  const database = createDatabase([{ uid: "alive-user" }]);
  const result = await reconcileEventCreatorOwnership({
    database,
    lookupUser: async () => ({ uid: "alive-user" }),
    logger: createLogger([]),
  });

  assert.deepEqual(result, { checked: 1, removed: 0, failed: 0 });
  assert.equal(database.statements.length, 1);
  assert.equal(database.statements[0]?.startsWith("UPDATE event_creators SET ownership_checked_at"), true);
});

test("reconciliation removes all event-owned data when Firebase Auth user is missing", async () => {
  const database = createDatabase([{ uid: "deleted-user" }]);
  const logs: LogEntry[] = [];
  const result = await reconcileEventCreatorOwnership({
    database,
    lookupUser: async () => {
      throw Object.assign(new Error("User not found"), { code: "auth/user-not-found" });
    },
    logger: createLogger(logs),
  });

  assert.deepEqual(result, { checked: 1, removed: 1, failed: 0 });
  assert.equal(database.statements.length, 4);
  assert.equal(database.statements.some((entry) => entry.includes("DELETE FROM event_activity")), true);
  assert.equal(database.statements.some((entry) => entry.includes("DELETE FROM events")), true);
  assert.equal(database.statements.some((entry) => entry.includes("DELETE FROM event_creator_applications")), true);
  assert.equal(database.statements.some((entry) => entry.includes("DELETE FROM event_creators")), true);
  assert.equal(logs.some((entry) => entry.level === "warn" && String(entry.args[0]).includes("deleted-user")), true);
});

test("reconciliation does not destroy data on non-not-found Firebase errors", async () => {
  const database = createDatabase([{ uid: "temporarily-unavailable" }]);
  const logs: LogEntry[] = [];
  const result = await reconcileEventCreatorOwnership({
    database,
    lookupUser: async () => {
      throw Object.assign(new Error("Firebase unavailable"), { code: "auth/internal-error" });
    },
    logger: createLogger(logs),
  });

  assert.deepEqual(result, { checked: 1, removed: 0, failed: 1 });
  assert.equal(database.statements.length, 0);
  assert.equal(logs.some((entry) => entry.level === "error"), true);
});

test("event ownership scheduler skips overlapping runs", async () => {
  const logs: LogEntry[] = [];
  let calls = 0;
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });

  const scheduler = new EventOwnershipReconciliationScheduler(
    { enabled: true, intervalMs: 30_000, batchLimit: 10 },
    async () => {
      calls += 1;
      await blocked;
      return { checked: 1, removed: 0, failed: 0 };
    },
    createLogger(logs),
  );

  const first = scheduler.runOnce();
  const second = scheduler.runOnce();
  release();
  await Promise.all([first, second]);

  assert.equal(calls, 1);
});

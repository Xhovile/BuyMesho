import { getFirebaseAdmin } from "../../auth/firebaseAdmin.js";
import { postgresDb as db } from "../../db.js";

type EventCreatorRow = { uid: string };
type Logger = Pick<Console, "log" | "warn" | "error">;
type UserLookup = (uid: string) => Promise<unknown>;

type ReconciliationResult = {
  checked: number;
  removed: number;
  failed: number;
};

export type EventOwnershipReconciliationConfig = {
  enabled: boolean;
  intervalMs: number;
  batchLimit: number;
};

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_BATCH_LIMIT = 50;
const MIN_INTERVAL_MS = 30_000;
const MAX_BATCH_LIMIT = 100;

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

function parsePositiveIntegerEnv(
  value: string | undefined,
  defaultValue: number,
  options: { min?: number; max?: number } = {},
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  const integer = Math.trunc(parsed);
  const min = options.min ?? 1;
  const max = options.max ?? integer;
  return Math.min(Math.max(integer, min), max);
}

export function getEventOwnershipReconciliationConfig(
  env: NodeJS.ProcessEnv = process.env,
): EventOwnershipReconciliationConfig {
  return {
    enabled: parseBooleanEnv(env.EVENT_OWNERSHIP_RECONCILIATION_WORKER_ENABLED, true),
    intervalMs: parsePositiveIntegerEnv(
      env.EVENT_OWNERSHIP_RECONCILIATION_WORKER_INTERVAL_MS,
      DEFAULT_INTERVAL_MS,
      { min: MIN_INTERVAL_MS },
    ),
    batchLimit: parsePositiveIntegerEnv(
      env.EVENT_OWNERSHIP_RECONCILIATION_WORKER_BATCH_LIMIT,
      DEFAULT_BATCH_LIMIT,
      { max: MAX_BATCH_LIMIT },
    ),
  };
}

export function deleteEventOwnerRecords(userId: string, database = db): void {
  const transaction = database.transaction((uid: string) => {
    database
      .prepare(`DELETE FROM event_activity WHERE event_id IN (SELECT id FROM events WHERE creator_uid = ?)`)
      .run(uid);
    database.prepare("DELETE FROM events WHERE creator_uid = ?").run(uid);
    database.prepare("DELETE FROM event_creator_applications WHERE applicant_uid = ?").run(uid);
    database.prepare("DELETE FROM event_creators WHERE uid = ?").run(uid);
  });

  transaction(userId);
}

export async function reconcileEventCreatorOwnership(
  options: {
    limit?: number;
    database?: any;
    logger?: Logger;
    lookupUser?: UserLookup;
  } = {},
): Promise<ReconciliationResult> {
  const database = options.database ?? db;
  const logger = options.logger ?? console;
  const limit = Math.max(1, Math.min(Math.trunc(options.limit ?? DEFAULT_BATCH_LIMIT), MAX_BATCH_LIMIT));
  const rows = database
    .prepare("SELECT uid FROM event_creators ORDER BY updated_at ASC, uid ASC LIMIT ?")
    .all(limit) as EventCreatorRow[];

  let removed = 0;
  let failed = 0;
  const lookupUser = options.lookupUser ?? ((uid: string) => getFirebaseAdmin().auth().getUser(uid));

  for (const row of rows) {
    try {
      await lookupUser(row.uid);
    } catch (error: any) {
      if (error?.code === "auth/user-not-found") {
        deleteEventOwnerRecords(row.uid, database);
        removed += 1;
        logger.warn(`[event-ownership] removed event owner ${row.uid} after Firebase Auth deletion`);
        continue;
      }

      failed += 1;
      logger.error(`[event-ownership] failed to verify Firebase user ${row.uid}:`, error);
    }
  }

  return { checked: rows.length, removed, failed };
}

export class EventOwnershipReconciliationScheduler {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly config: EventOwnershipReconciliationConfig,
    private readonly reconcile: (limit: number) => Promise<ReconciliationResult> = (limit) =>
      reconcileEventCreatorOwnership({ limit }),
    private readonly logger: Logger = console,
  ) {}

  start(): void {
    if (!this.config.enabled) {
      this.logger.log("[event-ownership] worker disabled");
      return;
    }
    if (this.timer) return;

    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.config.intervalMs);
    this.timer.unref?.();
    this.logger.log(
      `[event-ownership] worker started intervalMs=${this.config.intervalMs} batchLimit=${this.config.batchLimit}`,
    );
    void this.runOnce();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
  }

  async runOnce(): Promise<void> {
    if (!this.config.enabled || this.running) return;
    this.running = true;
    try {
      const result = await this.reconcile(this.config.batchLimit);
      if (result.removed > 0 || result.failed > 0) {
        this.logger.log(
          `[event-ownership] checked=${result.checked} removed=${result.removed} failed=${result.failed}`,
        );
      }
    } catch (error) {
      this.logger.error("[event-ownership] reconciliation failed:", error);
    } finally {
      this.running = false;
    }
  }
}

export function startEventOwnershipReconciliationScheduler(
  config = getEventOwnershipReconciliationConfig(),
): EventOwnershipReconciliationScheduler {
  const scheduler = new EventOwnershipReconciliationScheduler(config);
  scheduler.start();
  return scheduler;
}

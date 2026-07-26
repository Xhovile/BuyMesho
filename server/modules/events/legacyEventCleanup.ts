import type { PgCompatDatabase } from "../../db.js";

const CLEANUP_KEY = "legacy_events_deleted_v1";

export function clearLegacyEventsOnce(db: PgCompatDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_system_cleanup_state (
      cleanup_key TEXT PRIMARY KEY,
      cleaned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const existing = db
    .prepare(
      `
        SELECT cleanup_key
        FROM event_system_cleanup_state
        WHERE cleanup_key = ?
        LIMIT 1
      `
    )
    .get(CLEANUP_KEY) as { cleanup_key?: string } | undefined;

  if (existing?.cleanup_key === CLEANUP_KEY) {
    return;
  }

  const now = new Date().toISOString();
  db.exec(`
    UPDATE events
    SET deleted_at = COALESCE(deleted_at, '${now}'),
        status = 'cancelled',
        updated_at = CURRENT_TIMESTAMP
    WHERE deleted_at IS NULL;
  `);

  db.prepare(
    `
      INSERT INTO event_system_cleanup_state (cleanup_key, cleaned_at)
      VALUES (?, CURRENT_TIMESTAMP)
    `
  ).run(CLEANUP_KEY);
}
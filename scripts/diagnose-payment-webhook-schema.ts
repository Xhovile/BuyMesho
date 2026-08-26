import "dotenv/config";

import { query, pool } from "../server/postgres.js";

type Row = Record<string, unknown>;

function printSection(title: string): void {
  console.log(`\n=== ${title} ===`);
}

function printRows(rows: Row[]): void {
  if (rows.length === 0) {
    console.log("(none)");
    return;
  }

  for (const row of rows) {
    console.log(JSON.stringify(row));
  }
}

async function main(): Promise<void> {
  console.log("=== BuyMesho Payment Webhook Schema Diagnostic ===");
  console.log("READ-ONLY: this diagnostic performs SELECT-only inspection and makes no database changes.");

  printSection("Database");
  const database = await query<{ database_name: string; postgres_version: string }>(
    "SELECT current_database() AS database_name, version() AS postgres_version",
  );
  printRows(database.rows);

  printSection("Migration / schema history tables");
  const historyTables = await query(
    `SELECT table_schema, table_name
     FROM information_schema.tables
     WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
       AND (
         table_name ILIKE '%migration%'
         OR table_name ILIKE '%schema%'
       )
     ORDER BY table_schema, table_name`,
  );
  printRows(historyTables.rows);

  printSection("payment_webhook_events table");
  const table = await query<{ exists: string }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name = 'payment_webhook_events'
     ) AS exists`,
  );
  printRows(table.rows);

  const tableExists = table.rows[0]?.exists === true || table.rows[0]?.exists === "true";
  if (!tableExists) {
    console.log("payment_webhook_events does not exist; stopping schema-specific checks.");
    return;
  }

  printSection("Columns");
  const columns = await query(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'payment_webhook_events'
     ORDER BY ordinal_position`,
  );
  printRows(columns.rows);

  printSection("Indexes");
  const indexes = await query(
    `SELECT indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = current_schema()
       AND tablename = 'payment_webhook_events'
     ORDER BY indexname`,
  );
  printRows(indexes.rows);

  printSection("Constraints");
  const constraints = await query(
    `SELECT con.conname AS constraint_name,
            con.contype AS constraint_type,
            pg_get_constraintdef(con.oid) AS definition
     FROM pg_constraint con
     JOIN pg_class rel ON rel.oid = con.conrelid
     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
     WHERE ns.nspname = current_schema()
       AND rel.relname = 'payment_webhook_events'
     ORDER BY con.conname`,
  );
  printRows(constraints.rows);

  printSection("Row / event-id integrity");
  const rowCount = await query(
    `SELECT
       COUNT(*)::bigint AS total_rows,
       COUNT(*) FILTER (WHERE event_id IS NULL)::bigint AS null_event_id_rows,
       COUNT(*) FILTER (WHERE provider_event_id IS NULL)::bigint AS null_provider_event_id_rows,
       COUNT(*) FILTER (WHERE provider IS NULL)::bigint AS null_provider_rows
     FROM payment_webhook_events`,
  );
  printRows(rowCount.rows);

  printSection("Duplicate (provider, event_id) groups");
  const duplicateEventIds = await query(
    `SELECT provider, event_id, COUNT(*)::bigint AS row_count
     FROM payment_webhook_events
     WHERE event_id IS NOT NULL
     GROUP BY provider, event_id
     HAVING COUNT(*) > 1
     ORDER BY row_count DESC, provider, event_id
     LIMIT 50`,
  );
  printRows(duplicateEventIds.rows);

  printSection("Duplicate provider_event_id groups");
  const duplicateProviderEventIds = await query(
    `SELECT provider, provider_event_id, COUNT(*)::bigint AS row_count
     FROM payment_webhook_events
     WHERE provider_event_id IS NOT NULL
     GROUP BY provider, provider_event_id
     HAVING COUNT(*) > 1
     ORDER BY row_count DESC, provider, provider_event_id
     LIMIT 50`,
  );
  printRows(duplicateProviderEventIds.rows);

  printSection("Application-facing expectations");
  console.log(JSON.stringify({
    expectsEventIdColumn: true,
    expectsUniqueProviderEventId: true,
    startupSchemaRepairPresent: true,
    diagnosticIsReadOnly: true,
  }));
}

main()
  .catch((error) => {
    console.error("Diagnostic failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    if (typeof pool.end === "function") {
      await pool.end().catch(() => undefined);
    }
  });

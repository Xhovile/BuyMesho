import { postgresDb } from "../../db.js";

/**
 * Normalize legacy disputes timestamp columns so shared seller-resolution
 * statements can bind a single timestamp value consistently in PostgreSQL.
 * Older production databases may have retained updated_at as TEXT while the
 * refund/dispute architecture adds resolved_at as TIMESTAMPTZ.
 */
export function ensureDisputeTimestampCompatibilityMigration(): void {
  const columns = postgresDb
    .prepare(`
      SELECT column_name, data_type
        FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'disputes'
         AND column_name IN ('resolved_at', 'updated_at')
    `)
    .all() as Array<{ column_name: string; data_type: string }>;

  const byName = new Map(columns.map((column) => [column.column_name, column.data_type]));

  const normalizeToTimestamptz = (columnName: 'resolved_at' | 'updated_at', dataType: string | undefined) => {
    if (!dataType || dataType === 'timestamp with time zone') return;

    postgresDb.exec(`
      ALTER TABLE disputes
      ALTER COLUMN ${columnName}
      TYPE TIMESTAMPTZ
      USING CASE
        WHEN ${columnName} IS NULL THEN NULL
        WHEN btrim(${columnName}::text) = '' THEN NULL
        WHEN btrim(${columnName}::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
          THEN ${columnName}::text::timestamptz
        ELSE NULL
      END;
    `);
  };

  normalizeToTimestamptz('resolved_at', byName.get('resolved_at'));
  normalizeToTimestamptz('updated_at', byName.get('updated_at'));
}

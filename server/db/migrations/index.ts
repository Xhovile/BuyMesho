import { schemaSql } from "../schema.js";
import { getDatabase } from "../connection.js";

export function runMigrations() {
  const db = getDatabase();
  db.exec(schemaSql);

  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_seller_applications_applicant_uid
      ON seller_applications (applicant_uid, created_at DESC)
    `);
  } catch (error) {
    console.warn("Seller applications index migration failed:", error);
  }

  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_ratings_unique
      ON seller_ratings (seller_uid, rater_uid)
    `);
  } catch (error) {
    console.warn("Seller ratings index setup failed:", error);
  }

  for (const [column, definition] of [
    ["deleted_at", "TEXT"],
    ["deleted_by_uid", "TEXT"],
    ["hard_delete_after", "TEXT"],
  ] as const) {
    try {
      const columns = db.prepare("PRAGMA table_info(listings)").all() as Array<{ name: string }>;
      if (!columns.some((row) => row.name === column)) {
        db.exec(`ALTER TABLE listings ADD COLUMN ${column} ${definition}`);
      }
    } catch (error) {
      console.warn(`Listings soft-delete column migration failed for ${column}:`, error);
    }
  }

  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_listings_hard_delete_after
      ON listings (hard_delete_after)
      WHERE deleted_at IS NOT NULL
    `);
  } catch (error) {
    console.warn("Listings soft-delete purge index setup failed:", error);
  }

  return db;
}

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

  return db;
}

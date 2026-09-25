import { postgresDb } from "../../db.js";

export function ensureListingReviewMediaMigration(): void {
  postgresDb.exec(`
    CREATE TABLE IF NOT EXISTS listing_review_media (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      review_id BIGINT NOT NULL REFERENCES listing_reviews(id) ON DELETE CASCADE,
      media_type TEXT NOT NULL,
      secure_url TEXT NOT NULL,
      public_id TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_listing_review_media_review_id
      ON listing_review_media(review_id, sort_order ASC, id ASC);
  `);
}

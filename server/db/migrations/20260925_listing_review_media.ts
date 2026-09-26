import { postgresDb } from "../../db.js";

export function ensureListingReviewMediaMigration(): void {
  postgresDb.exec(`
    CREATE TABLE IF NOT EXISTS listing_review_media (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      review_id BIGINT NOT NULL REFERENCES listing_reviews(id) ON DELETE CASCADE,
      listing_id BIGINT NOT NULL,
      media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
      url TEXT NOT NULL,
      public_id TEXT NOT NULL,
      resource_type TEXT NOT NULL CHECK (resource_type IN ('image', 'video')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_listing_review_media_review_id
      ON listing_review_media (review_id, created_at ASC);
  `);
}

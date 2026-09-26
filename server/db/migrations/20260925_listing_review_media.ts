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

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'listing_review_media'
          AND column_name = 'secure_url'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'listing_review_media'
          AND column_name = 'url'
      ) THEN
        ALTER TABLE listing_review_media RENAME COLUMN secure_url TO url;
      END IF;
    END;
    $$;

    ALTER TABLE listing_review_media
      ADD COLUMN IF NOT EXISTS listing_id BIGINT;

    UPDATE listing_review_media AS media
    SET listing_id = reviews.listing_id
    FROM listing_reviews AS reviews
    WHERE media.review_id = reviews.id
      AND media.listing_id IS NULL;

    ALTER TABLE listing_review_media
      ALTER COLUMN listing_id SET NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_listing_review_media_review_id
      ON listing_review_media (review_id, created_at ASC);
  `);
}

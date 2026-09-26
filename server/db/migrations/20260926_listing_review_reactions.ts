import { postgresDb } from "../../db.js";

export function ensureListingReviewReactionsMigration(): void {
  postgresDb.exec(`
    CREATE TABLE IF NOT EXISTS listing_review_reactions (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      review_id BIGINT NOT NULL REFERENCES listing_reviews(id) ON DELETE CASCADE,
      reviewer_uid TEXT NOT NULL,
      reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (review_id, reviewer_uid)
    );

    CREATE INDEX IF NOT EXISTS idx_listing_review_reactions_review_id
      ON listing_review_reactions (review_id, reaction_type);
  `);
}

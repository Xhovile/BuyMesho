-- Keep the PostgreSQL listings schema aligned with checkout fixtures and listing metadata.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';

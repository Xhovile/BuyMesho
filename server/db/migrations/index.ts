import { postgresDb } from "../../db.js";
import { initPaymentSchema } from "../../postgresCompat/schema.js";
import { ensurePayoutLifecycleSchema } from "../../modules/payouts/payout.schema.js";

function ensureExtraTables() {
  postgresDb.exec(`
    CREATE TABLE IF NOT EXISTS seller_applications (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      applicant_uid TEXT NOT NULL,
      applicant_email TEXT,
      full_legal_name TEXT NOT NULL,
      institution TEXT NOT NULL,
      applicant_type TEXT NOT NULL,
      institution_id_number TEXT NOT NULL,
      whatsapp_number TEXT,
      business_name TEXT NOT NULL,
      what_to_sell TEXT NOT NULL,
      business_description TEXT NOT NULL,
      reason_for_applying TEXT NOT NULL,
      proof_document_url TEXT NOT NULL,
      agreed_to_rules INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by_uid TEXT,
      review_notes TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS listing_reviews (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      listing_id BIGINT NOT NULL,
      seller_uid TEXT NOT NULL,
      reviewer_uid TEXT NOT NULL,
      reviewer_email TEXT,
      reviewer_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title TEXT,
      body TEXT,
      is_verified_purchase INTEGER NOT NULL DEFAULT 0,
      seller_reply TEXT,
      seller_reply_at TIMESTAMPTZ,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (listing_id, reviewer_uid)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'listing',
      listing_id BIGINT,
      subject TEXT,
      reason TEXT NOT NULL,
      details TEXT,
      reporter_uid TEXT,
      reporter_email TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function normalizeHardDeleteAfterColumn() {
  const column = postgresDb
    .prepare(
      `
        SELECT data_type AS data_type
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'listings'
          AND column_name = 'hard_delete_after'
        LIMIT 1
      `
    )
    .get() as { data_type?: string } | undefined;

  if (!column?.data_type || column.data_type === 'timestamp with time zone') {
    return;
  }

  postgresDb.exec(`
    UPDATE listings
    SET hard_delete_after = NULL
    WHERE hard_delete_after IS NOT NULL
      AND btrim(hard_delete_after) = '';

    ALTER TABLE listings
    ALTER COLUMN hard_delete_after TYPE TIMESTAMPTZ
    USING CASE
      WHEN hard_delete_after IS NULL OR btrim(hard_delete_after) = '' THEN NULL
      ELSE hard_delete_after::timestamptz
    END;
  `);
}

export function runMigrations() {
  initPaymentSchema(postgresDb);
  ensureExtraTables();
  ensurePayoutLifecycleSchema();

  try {
    normalizeHardDeleteAfterColumn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`hard_delete_after migration skipped: ${message}`);
  }

  return postgresDb;
}

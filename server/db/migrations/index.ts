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

    CREATE TABLE IF NOT EXISTS event_creators (
      uid TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      organization_name TEXT NOT NULL,
      organization_type TEXT NOT NULL,
      contact_whatsapp TEXT,
      event_types TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      active_until TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS event_creator_applications (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      applicant_uid TEXT NOT NULL,
      applicant_email TEXT,
      display_name TEXT NOT NULL,
      organization_name TEXT NOT NULL,
      organization_type TEXT NOT NULL,
      contact_whatsapp TEXT,
      event_types TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      creator_uid TEXT,
      event_type TEXT NOT NULL,
      event_title TEXT NOT NULL,
      organizer_name TEXT NOT NULL,
      event_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      venue TEXT NOT NULL,
      location TEXT NOT NULL,
      ticket_mode TEXT NOT NULL,
      ticket_price DOUBLE PRECISION,
      ticket_link TEXT,
      description TEXT NOT NULL,
      contact_whatsapp TEXT,
      poster_alt TEXT,
      spec_values TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      deleted_at TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS event_activity (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      event_id BIGINT NOT NULL,
      actor_uid TEXT,
      activity_type TEXT NOT NULL,
      metadata TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
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

function backfillPayoutRecords() {
  const payouts = postgresDb.prepare(`
    SELECT
      id,
      seller_id,
      order_id,
      escrow_id,
      destination_account_id,
      requested_by,
      provider,
      provider_charge_id,
      provider_ref_id,
      provider_transaction_id,
      provider_status,
      sent_at,
      paid_at,
      failed_at,
      status
    FROM payouts
  `).all() as Array<Record<string, unknown>>;

  const latestAttemptStmt = postgresDb.prepare(`
    SELECT
      provider,
      provider_charge_id,
      provider_reference,
      provider_transaction_id,
      status,
      sent_at,
      completed_at,
      failure_reason
    FROM payout_attempts
    WHERE payout_id = ?
    ORDER BY COALESCE(completed_at, sent_at, created_at) DESC, id DESC
    LIMIT 1
  `);

  for (const payout of payouts) {
    const latestAttempt = latestAttemptStmt.get(payout.id) as Record<string, unknown> | undefined;
    if (!latestAttempt) continue;

    postgresDb
      .prepare(`
        UPDATE payouts
        SET provider = COALESCE(?, provider),
            provider_charge_id = COALESCE(?, provider_charge_id),
            provider_ref_id = COALESCE(?, provider_ref_id),
            provider_transaction_id = COALESCE(?, provider_transaction_id),
            provider_status = COALESCE(?, provider_status),
            sent_at = COALESCE(?, sent_at),
            paid_at = COALESCE(?, paid_at),
            failed_at = COALESCE(?, failed_at),
            status = COALESCE(?, status)
        WHERE id = ?
      `)
      .run(
        latestAttempt.provider ?? null,
        latestAttempt.provider_charge_id ?? null,
        latestAttempt.provider_reference ?? null,
        latestAttempt.provider_transaction_id ?? null,
        latestAttempt.status ?? null,
        latestAttempt.sent_at ?? null,
        latestAttempt.completed_at ?? null,
        latestAttempt.failure_reason ? latestAttempt.completed_at ?? null : null,
        latestAttempt.status ?? null,
        payout.id,
      );
  }
}

function backfillPaymentRecords() {
  const payments = postgresDb.prepare(`
    SELECT
      id,
      reference,
      provider_reference,
      provider_transaction_id,
      status,
      paid_at,
      verified,
      verification,
      raw_response
    FROM payments
  `).all() as Array<Record<string, unknown>>;

  for (const payment of payments) {
    postgresDb
      .prepare(`
        UPDATE payments
        SET provider_reference = COALESCE(provider_reference, ?),
            status = COALESCE(status, ?),
            paid_at = COALESCE(paid_at, ?),
            verified = COALESCE(verified, ?),
            verification = COALESCE(verification, ?),
            raw_response = COALESCE(raw_response, ?)
        WHERE id = ?
      `)
      .run(
        payment.provider_reference ?? null,
        payment.status ?? null,
        payment.paid_at ?? null,
        payment.verified ?? null,
        payment.verification ?? null,
        payment.raw_response ?? null,
        payment.id,
      );
  }
}

function updateSellerPayoutAccountColumns() {
  postgresDb.exec(`
    ALTER TABLE seller_payout_accounts
    ALTER COLUMN account_number_encrypted DROP NOT NULL;

    ALTER TABLE seller_payout_accounts
    ALTER COLUMN mobile_encrypted DROP NOT NULL;
  `);
}

export function runMigrations() {
  ensureExtraTables();
  normalizeHardDeleteAfterColumn();
  backfillPayoutRecords();
  backfillPaymentRecords();
  ensurePayoutLifecycleSchema();
  updateSellerPayoutAccountColumns();
  initPaymentSchema(postgresDb);
}

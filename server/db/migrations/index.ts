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
    ORDER BY attempt_no DESC, created_at DESC
    LIMIT 1
  `);

  const firstEventStmt = postgresDb.prepare(`
    SELECT seller_id, actor_id
    FROM payout_events
    WHERE payout_id = ?
    ORDER BY created_at ASC, id ASC
    LIMIT 1
  `);

  const escrowLookupStmt = postgresDb.prepare(`
    SELECT e.id AS escrow_id, o.id AS order_id, o.seller_id AS seller_id
    FROM escrows e
    LEFT JOIN orders o ON o.id = e.order_id
    WHERE e.id = ?
    LIMIT 1
  `);

  const defaultDestinationStmt = postgresDb.prepare(`
    SELECT id
    FROM seller_payout_accounts
    WHERE seller_uid = ?
      AND is_active = 1
      AND verification_status = 'verified'
    ORDER BY is_default DESC, updated_at DESC, created_at DESC
    LIMIT 1
  `);

  const updateStmt = postgresDb.prepare(`
    UPDATE payouts
    SET seller_id = COALESCE(?, seller_id),
        order_id = COALESCE(?, order_id),
        escrow_id = COALESCE(?, escrow_id),
        destination_account_id = COALESCE(?, destination_account_id),
        requested_by = COALESCE(?, requested_by),
        provider = COALESCE(?, provider),
        provider_charge_id = COALESCE(?, provider_charge_id),
        provider_ref_id = COALESCE(?, provider_ref_id),
        provider_transaction_id = COALESCE(?, provider_transaction_id),
        provider_status = COALESCE(?, provider_status),
        sent_at = COALESCE(?, sent_at),
        paid_at = COALESCE(?, paid_at),
        failed_at = COALESCE(?, failed_at),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  let repaired = 0;

  for (const row of payouts) {
    const payoutId = String(row.id ?? '').trim();
    if (!payoutId) continue;

    const latestAttempt = latestAttemptStmt.get(payoutId) as Record<string, unknown> | undefined;
    const firstEvent = firstEventStmt.get(payoutId) as Record<string, unknown> | undefined;
    const escrowLink = row.escrow_id ? escrowLookupStmt.get(String(row.escrow_id)) as Record<string, unknown> | undefined : undefined;

    const currentSellerId = String(row.seller_id ?? '').trim() || null;
    const inferredSellerId =
      currentSellerId ?? (String(escrowLink?.seller_id ?? '').trim() || null) ?? (String(firstEvent?.seller_id ?? '').trim() || null);

    const inferredOrderId = String(row.order_id ?? '').trim() || String(escrowLink?.order_id ?? '').trim() || null;
    const inferredEscrowId = String(row.escrow_id ?? '').trim() || String(escrowLink?.escrow_id ?? '').trim() || null;
    const inferredRequestedBy = String(row.requested_by ?? '').trim() || String(firstEvent?.actor_id ?? '').trim() || null;

    const inferredDestinationAccountId = (() => {
      const currentDestination = String(row.destination_account_id ?? '').trim();
      if (currentDestination) return currentDestination;
      if (!inferredSellerId) return null;
      const destination = defaultDestinationStmt.get(inferredSellerId) as { id?: string } | undefined;
      return String(destination?.id ?? '').trim() || null;
    })();

    const inferredProvider = String(row.provider ?? latestAttempt?.provider ?? '').trim() || null;
    const inferredProviderChargeId = String(row.provider_charge_id ?? latestAttempt?.provider_charge_id ?? '').trim() || null;
    const inferredProviderReference = String(row.provider_ref_id ?? latestAttempt?.provider_reference ?? '').trim() || null;
    const inferredProviderTransactionId = String(row.provider_transaction_id ?? latestAttempt?.provider_transaction_id ?? '').trim() || null;
    const inferredProviderStatus = String(row.provider_status ?? latestAttempt?.status ?? '').trim() || null;
    const inferredSentAt = String(row.sent_at ?? latestAttempt?.sent_at ?? '').trim() || null;
    const inferredPaidAt = String(row.paid_at ?? (String(latestAttempt?.status ?? '').toLowerCase() === 'paid' ? latestAttempt?.completed_at : '') ?? '').trim() || null;
    const inferredFailedAt = String(row.failed_at ?? (String(latestAttempt?.status ?? '').toLowerCase() === 'failed' ? latestAttempt?.completed_at : '') ?? '').trim() || null;

    const shouldRepair =
      inferredSellerId !== currentSellerId ||
      inferredOrderId !== String(row.order_id ?? '').trim() ||
      inferredEscrowId !== String(row.escrow_id ?? '').trim() ||
      inferredRequestedBy !== String(row.requested_by ?? '').trim() ||
      inferredDestinationAccountId !== String(row.destination_account_id ?? '').trim() ||
      inferredProvider !== String(row.provider ?? '').trim() ||
      inferredProviderChargeId !== String(row.provider_charge_id ?? '').trim() ||
      inferredProviderReference !== String(row.provider_ref_id ?? '').trim() ||
      inferredProviderTransactionId !== String(row.provider_transaction_id ?? '').trim() ||
      inferredProviderStatus !== String(row.provider_status ?? '').trim() ||
      inferredSentAt !== String(row.sent_at ?? '').trim() ||
      inferredPaidAt !== String(row.paid_at ?? '').trim() ||
      inferredFailedAt !== String(row.failed_at ?? '').trim();

    if (!shouldRepair) {
      continue;
    }

    updateStmt.run(
      inferredSellerId,
      inferredOrderId,
      inferredEscrowId,
      inferredDestinationAccountId,
      inferredRequestedBy,
      inferredProvider,
      inferredProviderChargeId,
      inferredProviderReference,
      inferredProviderTransactionId,
      inferredProviderStatus,
      inferredSentAt,
      inferredPaidAt,
      inferredFailedAt,
      payoutId,
    );

    repaired += 1;
  }

  if (repaired > 0) {
    console.log(`[payout-migration] repaired ${repaired} payout row(s)`);
  }
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

  try {
    backfillPayoutRecords();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`payout backfill skipped: ${message}`);
  }

  return postgresDb;
}

import { postgresDb } from "../../db.js";
import { ensureMessageSchema } from "../../../src/server/messageSchema.js";
import { initPaymentSchema } from "../../postgresCompat/schema.js";
import { ensurePayoutLifecycleSchema } from "../../modules/payouts/payout.schema.js";
import { backfillEventTickets } from "../../modules/orders/eventTicketProjection.js";
import { ensureEventOwnershipIntegrityMigration } from "./20260819_event_ownership_integrity.js";
import { ensureSellerOrdersIndexesMigration } from "./20260903_seller_orders_indexes.js";

function ensureExtraTables() {
  postgresDb.exec(`
    CREATE TABLE IF NOT EXISTS seller_applications (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, applicant_uid TEXT NOT NULL, applicant_email TEXT, full_legal_name TEXT NOT NULL, institution TEXT NOT NULL, applicant_type TEXT NOT NULL, institution_id_number TEXT NOT NULL, whatsapp_number TEXT, business_name TEXT NOT NULL, what_to_sell TEXT NOT NULL, business_description TEXT NOT NULL, reason_for_applying TEXT NOT NULL, proof_document_url TEXT NOT NULL, agreed_to_rules INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', reviewed_by_uid TEXT, review_notes TEXT, reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS listing_reviews (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, listing_id BIGINT NOT NULL, seller_uid TEXT NOT NULL, reviewer_uid TEXT NOT NULL, reviewer_email TEXT, reviewer_name TEXT NOT NULL, rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), title TEXT, body TEXT, is_verified_purchase INTEGER NOT NULL DEFAULT 0, seller_reply TEXT, seller_reply_at TIMESTAMPTZ, is_hidden INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE (listing_id, reviewer_uid));
    CREATE TABLE IF NOT EXISTS reports (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, type TEXT NOT NULL DEFAULT 'listing', listing_id BIGINT, subject TEXT, reason TEXT NOT NULL, details TEXT, reporter_uid TEXT, reporter_email TEXT, status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS event_creators (uid TEXT PRIMARY KEY, email TEXT NOT NULL, display_name TEXT NOT NULL, organization_name TEXT NOT NULL, organization_type TEXT NOT NULL, contact_whatsapp TEXT, event_types TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'approved', active_until TIMESTAMPTZ, approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS event_creator_applications (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, applicant_uid TEXT NOT NULL, applicant_email TEXT, display_name TEXT NOT NULL, organization_name TEXT NOT NULL, organization_type TEXT NOT NULL, contact_whatsapp TEXT, event_types TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'approved', reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS events (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, creator_uid TEXT, event_type TEXT NOT NULL, event_title TEXT NOT NULL, organizer_name TEXT NOT NULL, event_date TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT, venue TEXT NOT NULL, location TEXT NOT NULL, ticket_mode TEXT NOT NULL, ticket_price DOUBLE PRECISION, ticket_link TEXT, description TEXT NOT NULL, contact_whatsapp TEXT, poster_alt TEXT, spec_values TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'published', publication_status TEXT NOT NULL DEFAULT 'published', publication_mode TEXT NOT NULL DEFAULT 'immediate', publication_at TIMESTAMPTZ, runtime_mode TEXT NOT NULL DEFAULT 'automatic', deleted_at TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS event_activity (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, event_id BIGINT NOT NULL, actor_uid TEXT, activity_type TEXT NOT NULL, metadata TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE);
  `);
}

function ensureEventLifecycleSchema() {
  postgresDb.exec(`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS publication_status TEXT DEFAULT 'published';
    ALTER TABLE events ADD COLUMN IF NOT EXISTS publication_mode TEXT DEFAULT 'immediate';
    ALTER TABLE events ADD COLUMN IF NOT EXISTS publication_at TIMESTAMPTZ;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS runtime_mode TEXT DEFAULT 'automatic';

    UPDATE events SET spec_values = '{}' WHERE spec_values IS NULL;
    ALTER TABLE events ALTER COLUMN spec_values SET DEFAULT '{}';
    ALTER TABLE events ALTER COLUMN spec_values SET NOT NULL;

    UPDATE events SET publication_status = CASE
      WHEN lower(COALESCE(status, 'published')) = 'draft' THEN 'draft'
      WHEN lower(COALESCE(status, 'published')) = 'inactive' THEN 'paused'
      WHEN lower(COALESCE(status, 'published')) = 'cancelled' THEN 'cancelled'
      ELSE 'published'
    END
    WHERE publication_status IS NULL OR publication_status NOT IN ('draft','published','paused','cancelled')
       OR (publication_status = 'published' AND lower(COALESCE(status, 'published')) <> 'published');

    UPDATE events SET publication_mode = 'immediate'
    WHERE publication_mode IS NULL OR publication_mode NOT IN ('immediate','scheduled');

    UPDATE events SET runtime_mode = 'automatic'
    WHERE runtime_mode IS NULL OR runtime_mode NOT IN ('automatic','force_live','force_upcoming');

    UPDATE events
    SET spec_values = jsonb_set(
      jsonb_set(
        CASE
          WHEN jsonb_typeof(COALESCE(NULLIF(spec_values, '')::jsonb, '{}'::jsonb)) = 'object'
            THEN COALESCE(NULLIF(spec_values, '')::jsonb, '{}'::jsonb)
          ELSE '{}'::jsonb
        END,
        '{end_time}', COALESCE(to_jsonb(end_time), 'null'::jsonb), true
      ),
      '{runtime_mode}', COALESCE(to_jsonb(runtime_mode), to_jsonb('automatic'::text)), true
    )::text;

    ALTER TABLE events ALTER COLUMN publication_status SET DEFAULT 'published';
    ALTER TABLE events ALTER COLUMN publication_mode SET DEFAULT 'immediate';
    ALTER TABLE events ALTER COLUMN runtime_mode SET DEFAULT 'automatic';
    ALTER TABLE events ALTER COLUMN publication_status SET NOT NULL;
    ALTER TABLE events ALTER COLUMN publication_mode SET NOT NULL;
    ALTER TABLE events ALTER COLUMN runtime_mode SET NOT NULL;

    CREATE OR REPLACE FUNCTION buymesho_sync_event_runtime_spec()
    RETURNS trigger AS $$
    BEGIN
      NEW.spec_values := jsonb_set(
        jsonb_set(
          CASE
            WHEN jsonb_typeof(COALESCE(NULLIF(NEW.spec_values, '')::jsonb, '{}'::jsonb)) = 'object'
              THEN COALESCE(NULLIF(NEW.spec_values, '')::jsonb, '{}'::jsonb)
            ELSE '{}'::jsonb
          END,
          '{end_time}', COALESCE(to_jsonb(NEW.end_time), 'null'::jsonb), true
        ),
        '{runtime_mode}', COALESCE(to_jsonb(NEW.runtime_mode), to_jsonb('automatic'::text)), true
      )::text;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_buymesho_sync_event_runtime_spec ON events;
    CREATE TRIGGER trg_buymesho_sync_event_runtime_spec
    BEFORE INSERT OR UPDATE OF end_time, runtime_mode, spec_values ON events
    FOR EACH ROW EXECUTE FUNCTION buymesho_sync_event_runtime_spec();
  `);
}

function ensureEventTicketStatsSchema() {
  postgresDb.exec(`
    CREATE TABLE IF NOT EXISTS event_ticket_stats (
      event_id BIGINT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
      tickets_sold INTEGER NOT NULL DEFAULT 0,
      tickets_checked_in INTEGER NOT NULL DEFAULT 0,
      tickets_remaining INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_event_ticket_stats_updated_at ON event_ticket_stats(updated_at);

    CREATE OR REPLACE FUNCTION buymesho_sync_event_ticket_stats_for_order()
    RETURNS trigger AS $$
    DECLARE
      item JSONB;
      event_id_value BIGINT;
      quantity_value INTEGER;
      old_eligible BOOLEAN;
      new_eligible BOOLEAN;
    BEGIN
      old_eligible := TG_OP = 'UPDATE' AND OLD.status IN ('paid','in_escrow','fulfilled');
      new_eligible := NEW.status IN ('paid','in_escrow','fulfilled');

      IF old_eligible THEN
        FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(NULLIF(OLD.items, '')::jsonb, '[]'::jsonb)) LOOP
          IF (item->>'kind' = 'event_ticket' OR NULLIF(item->>'eventId', '') IS NOT NULL)
             AND (item->>'eventId') ~ '^[0-9]+$' THEN
            event_id_value := (item->>'eventId')::BIGINT;
            quantity_value := GREATEST(COALESCE(NULLIF(item->>'quantity', '')::INTEGER, 1), 0);
            INSERT INTO event_ticket_stats(event_id, tickets_sold, tickets_checked_in, tickets_remaining, updated_at)
            VALUES (event_id_value, 0, 0, 0, CURRENT_TIMESTAMP)
            ON CONFLICT (event_id) DO NOTHING;
            UPDATE event_ticket_stats
            SET tickets_sold = GREATEST(0, tickets_sold - quantity_value),
                tickets_remaining = GREATEST(0, tickets_sold - quantity_value - tickets_checked_in),
                updated_at = CURRENT_TIMESTAMP
            WHERE event_id = event_id_value;
          END IF;
        END LOOP;
      END IF;

      IF new_eligible THEN
        FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(NULLIF(NEW.items, '')::jsonb, '[]'::jsonb)) LOOP
          IF (item->>'kind' = 'event_ticket' OR NULLIF(item->>'eventId', '') IS NOT NULL)
             AND (item->>'eventId') ~ '^[0-9]+$' THEN
            event_id_value := (item->>'eventId')::BIGINT;
            quantity_value := GREATEST(COALESCE(NULLIF(item->>'quantity', '')::INTEGER, 1), 0);
            INSERT INTO event_ticket_stats(event_id, tickets_sold, tickets_checked_in, tickets_remaining, updated_at)
            VALUES (event_id_value, quantity_value, 0, quantity_value, CURRENT_TIMESTAMP)
            ON CONFLICT (event_id) DO UPDATE SET
              tickets_sold = event_ticket_stats.tickets_sold + EXCLUDED.tickets_sold,
              tickets_remaining = GREATEST(0, event_ticket_stats.tickets_sold + EXCLUDED.tickets_sold - event_ticket_stats.tickets_checked_in),
              updated_at = CURRENT_TIMESTAMP;
          END IF;
        END LOOP;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_buymesho_sync_event_ticket_stats ON orders;
    CREATE TRIGGER trg_buymesho_sync_event_ticket_stats
    AFTER INSERT OR UPDATE OF status, items ON orders
    FOR EACH ROW EXECUTE FUNCTION buymesho_sync_event_ticket_stats_for_order;

    INSERT INTO event_ticket_stats(event_id, tickets_sold, tickets_checked_in, tickets_remaining, updated_at)
    SELECT e.id,
           COALESCE(SUM(CASE WHEN o.status IN ('paid','in_escrow','fulfilled')
             AND (item->>'eventId') ~ '^[0-9]+$'
             AND (item->>'eventId')::BIGINT = e.id
             THEN GREATEST(COALESCE(NULLIF(item->>'quantity', '')::INTEGER, 1), 0) ELSE 0 END), 0)::INTEGER,
           0,
           COALESCE(SUM(CASE WHEN o.status IN ('paid','in_escrow','fulfilled')
             AND (item->>'eventId') ~ '^[0-9]+$'
             AND (item->>'eventId')::BIGINT = e.id
             THEN GREATEST(COALESCE(NULLIF(item->>'quantity', '')::INTEGER, 1), 0) ELSE 0 END), 0)::INTEGER,
           CURRENT_TIMESTAMP
    FROM events e
    LEFT JOIN orders o ON TRUE
    LEFT JOIN LATERAL jsonb_array_elements(COALESCE(NULLIF(o.items, '')::jsonb, '[]'::jsonb)) AS item ON TRUE
    WHERE NOT EXISTS (SELECT 1 FROM event_ticket_stats)
    GROUP BY e.id
    ON CONFLICT (event_id) DO UPDATE SET
      tickets_sold = EXCLUDED.tickets_sold,
      tickets_checked_in = event_ticket_stats.tickets_checked_in,
      tickets_remaining = GREATEST(0, EXCLUDED.tickets_sold - event_ticket_stats.tickets_checked_in),
      updated_at = CURRENT_TIMESTAMP;
  `);
}

function normalizeHardDeleteAfterColumn() {
  const column = postgresDb.prepare(`SELECT data_type AS data_type FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'listings' AND column_name = 'hard_delete_after' LIMIT 1`).get() as { data_type?: string } | undefined;
  if (!column?.data_type || column.data_type === 'timestamp with time zone') return;
  postgresDb.exec(`UPDATE listings SET hard_delete_after = NULL WHERE hard_delete_after IS NOT NULL AND btrim(hard_delete_after) = ''; ALTER TABLE listings ALTER COLUMN hard_delete_after TYPE TIMESTAMPTZ USING CASE WHEN hard_delete_after IS NULL OR btrim(hard_delete_after) = '' THEN NULL ELSE hard_delete_after::timestamptz END;`);
}

function updateSellerPayoutAccountColumns() {
  postgresDb.exec(`ALTER TABLE seller_payout_accounts ALTER COLUMN account_number_encrypted DROP NOT NULL; ALTER TABLE seller_payout_accounts ALTER COLUMN mobile_encrypted DROP NOT NULL;`);
}

function backfillOrderPaidAtFromPayments() {
  postgresDb.exec(`UPDATE orders SET paid_at = COALESCE(paid_at,(SELECT MIN(COALESCE(p.paid_at,p.updated_at,p.created_at)) FROM payments p WHERE p.order_id=orders.id AND p.status='captured')) WHERE paid_at IS NULL AND status IN ('paid','in_escrow','fulfilled') AND EXISTS (SELECT 1 FROM payments p WHERE p.order_id=orders.id AND p.status='captured');`);
}

function backfillFulfilledAtFromUpdatedAt() {
  postgresDb.exec(`
    UPDATE orders
    SET fulfilled_at = updated_at
    WHERE status = 'fulfilled'
      AND fulfilled_at IS NULL
      AND updated_at IS NOT NULL
      AND updated_at >= COALESCE(paid_at, created_at);
  `);
}

export function runMigrations() {
  ensureExtraTables();
  ensureEventLifecycleSchema();
  ensureEventOwnershipIntegrityMigration();
  ensureMessageSchema(postgresDb);
  normalizeHardDeleteAfterColumn();
  updateSellerPayoutAccountColumns();
  ensurePayoutLifecycleSchema();
  initPaymentSchema(postgresDb);
  ensureEventTicketStatsSchema();
  ensureSellerOrdersIndexesMigration();
  backfillOrderPaidAtFromPayments();
  backfillFulfilledAtFromUpdatedAt();
  backfillEventTickets();
}

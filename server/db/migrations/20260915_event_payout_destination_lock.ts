import { postgresDb } from "../../db.js";

/**
 * Locks an event's payout destination after the first successful ticket sale.
 * A controlled replacement path may opt in through a transaction-local setting.
 */
export function ensureEventPayoutDestinationLockMigration() {
  postgresDb.exec(`
    ALTER TABLE events
      ADD COLUMN IF NOT EXISTS payout_destination_locked_at TIMESTAMPTZ;

    ALTER TABLE events
      ADD COLUMN IF NOT EXISTS payout_destination_locked_by TEXT;

    ALTER TABLE events
      ADD COLUMN IF NOT EXISTS payout_destination_lock_reason TEXT;

    CREATE INDEX IF NOT EXISTS idx_events_payout_destination_locked_at
      ON events (payout_destination_locked_at)
      WHERE payout_destination_locked_at IS NOT NULL;

    CREATE OR REPLACE FUNCTION buymesho_lock_event_payout_destination_for_order_id(target_order_id BIGINT)
    RETURNS VOID
    LANGUAGE plpgsql
    AS $$
    DECLARE
      item JSONB;
      target_event_id BIGINT;
    BEGIN
      FOR item IN
        SELECT value
        FROM jsonb_array_elements(
          COALESCE(
            NULLIF((SELECT items FROM orders WHERE id = target_order_id LIMIT 1), '')::jsonb,
            '[]'::jsonb
          )
        )
      LOOP
        IF (item->>'kind' = 'event_ticket' OR NULLIF(item->>'eventId', '') IS NOT NULL)
           AND (item->>'eventId') ~ '^[0-9]+$'
        THEN
          target_event_id := (item->>'eventId')::BIGINT;

          UPDATE events
          SET payout_destination_locked_at = COALESCE(payout_destination_locked_at, CURRENT_TIMESTAMP),
              payout_destination_locked_by = COALESCE(payout_destination_locked_by, 'system'),
              payout_destination_lock_reason = COALESCE(payout_destination_lock_reason, 'first_successful_sale'),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = target_event_id
            AND payout_destination_id IS NOT NULL
            AND payout_destination_locked_at IS NULL;
        END IF;
      END LOOP;
    END;
    $$;

    CREATE OR REPLACE FUNCTION buymesho_event_has_successful_sale(target_event_id BIGINT)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    AS $$
    DECLARE
      order_row RECORD;
      item JSONB;
    BEGIN
      -- Event tickets are indexed by event_id. Once the ticket projection exists,
      -- use it as the fast path for runtime checks instead of scanning every order.
      IF EXISTS (
        SELECT 1
        FROM event_tickets
        WHERE event_id = target_event_id
        LIMIT 1
      ) THEN
        RETURN TRUE;
      END IF;

      -- Keep a compatibility fallback for legacy data that predates the ticket
      -- projection or during migrations that run before its backfill.
      FOR order_row IN
        SELECT o.id, o.status, o.paid_at, o.items
        FROM orders o
        WHERE o.status IN ('paid', 'in_escrow', 'fulfilled', 'closed')
           OR o.paid_at IS NOT NULL
      LOOP
        FOR item IN
          SELECT value
          FROM jsonb_array_elements(
            COALESCE(NULLIF(order_row.items, '')::jsonb, '[]'::jsonb)
          )
        LOOP
          IF (item->>'kind' = 'event_ticket' OR NULLIF(item->>'eventId', '') IS NOT NULL)
             AND (item->>'eventId') ~ '^[0-9]+$'
             AND (item->>'eventId')::BIGINT = target_event_id
          THEN
            RETURN TRUE;
          END IF;
        END LOOP;
      END LOOP;

      RETURN FALSE;
    END;
    $$;

    CREATE OR REPLACE FUNCTION buymesho_lock_event_payout_destination_for_order()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF NEW.status IN ('paid', 'in_escrow', 'fulfilled', 'closed') OR NEW.paid_at IS NOT NULL THEN
        PERFORM buymesho_lock_event_payout_destination_for_order_id(NEW.id);
      END IF;
      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_buymesho_lock_event_payout_destination_for_order ON orders;
    CREATE TRIGGER trg_buymesho_lock_event_payout_destination_for_order
    AFTER INSERT OR UPDATE OF status, paid_at, items ON orders
    FOR EACH ROW
    EXECUTE FUNCTION buymesho_lock_event_payout_destination_for_order();

    CREATE OR REPLACE FUNCTION buymesho_lock_event_payout_destination_for_payment()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF NEW.status IN ('captured', 'paid', 'verified', 'successful', 'completed') OR NEW.paid_at IS NOT NULL THEN
        IF NEW.order_id IS NOT NULL THEN
          PERFORM buymesho_lock_event_payout_destination_for_order_id(NEW.order_id);
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_buymesho_lock_event_payout_destination_for_payment ON payments;
    CREATE TRIGGER trg_buymesho_lock_event_payout_destination_for_payment
    AFTER INSERT OR UPDATE OF status, paid_at ON payments
    FOR EACH ROW
    EXECUTE FUNCTION buymesho_lock_event_payout_destination_for_payment();

    CREATE OR REPLACE FUNCTION buymesho_protect_event_payout_destination_change()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF TG_OP = 'UPDATE'
         AND NEW.payout_destination_id IS DISTINCT FROM OLD.payout_destination_id
         AND COALESCE(current_setting('buymesho.allow_event_payout_replacement', true), '0') <> '1'
      THEN
        IF OLD.payout_destination_locked_at IS NOT NULL
           OR buymesho_event_has_successful_sale(OLD.id)
        THEN
          RAISE EXCEPTION 'Event payout destination is locked after the first successful ticket sale';
        END IF;
      END IF;

      IF NEW.payout_destination_locked_at IS NULL
         AND buymesho_event_has_successful_sale(NEW.id)
      THEN
        NEW.payout_destination_locked_at := CURRENT_TIMESTAMP;
        NEW.payout_destination_locked_by := COALESCE(NEW.payout_destination_locked_by, 'system');
        NEW.payout_destination_lock_reason := COALESCE(NEW.payout_destination_lock_reason, 'first_successful_sale');
      END IF;

      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_buymesho_protect_event_payout_destination_change ON events;
    CREATE TRIGGER trg_buymesho_protect_event_payout_destination_change
    BEFORE INSERT OR UPDATE OF payout_destination_id, payout_destination_locked_at ON events
    FOR EACH ROW
    EXECUTE FUNCTION buymesho_protect_event_payout_destination_change();

    UPDATE events e
    SET payout_destination_locked_at = COALESCE(e.payout_destination_locked_at, CURRENT_TIMESTAMP),
        payout_destination_locked_by = COALESCE(e.payout_destination_locked_by, 'system'),
        payout_destination_lock_reason = COALESCE(e.payout_destination_lock_reason, 'first_successful_sale')
    WHERE e.payout_destination_id IS NOT NULL
      AND e.payout_destination_locked_at IS NULL
      AND buymesho_event_has_successful_sale(e.id);
  `);
}

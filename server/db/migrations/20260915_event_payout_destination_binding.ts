import { postgresDb } from "../../db.js";

/**
 * Establish the event -> payout destination relationship without changing
 * seller payout behavior. Legacy events remain nullable until the event
 * creation flow starts requiring a destination in a later phase.
 */
export function ensureEventPayoutDestinationBindingMigration() {
  postgresDb.exec(`
    ALTER TABLE events
      ADD COLUMN IF NOT EXISTS payout_destination_id TEXT;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_events_payout_destination_id'
          AND conrelid = 'events'::regclass
      ) THEN
        ALTER TABLE events
          ADD CONSTRAINT fk_events_payout_destination_id
          FOREIGN KEY (payout_destination_id)
          REFERENCES seller_payout_accounts(id)
          ON DELETE RESTRICT;
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS idx_events_payout_destination_id
      ON events (payout_destination_id)
      WHERE payout_destination_id IS NOT NULL;

    CREATE OR REPLACE FUNCTION buymesho_validate_event_payout_destination()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      destination_owner_type TEXT;
      destination_owner_uid TEXT;
      destination_active INTEGER;
      destination_verification_status TEXT;
    BEGIN
      IF NEW.payout_destination_id IS NULL THEN
        RETURN NEW;
      END IF;

      SELECT owner_type,
             owner_uid,
             is_active,
             verification_status
      INTO destination_owner_type,
           destination_owner_uid,
           destination_active,
           destination_verification_status
      FROM seller_payout_accounts
      WHERE id = NEW.payout_destination_id
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Event payout destination not found';
      END IF;

      IF NEW.creator_uid IS NULL THEN
        RAISE EXCEPTION 'Event creator is required when a payout destination is bound';
      END IF;

      IF destination_owner_type <> 'event_creator'
         OR destination_owner_uid <> NEW.creator_uid THEN
        RAISE EXCEPTION 'Event payout destination must belong to the event creator';
      END IF;

      IF destination_active <> 1 THEN
        RAISE EXCEPTION 'Event payout destination must be active';
      END IF;

      IF lower(COALESCE(destination_verification_status, '')) <> 'verified' THEN
        RAISE EXCEPTION 'Event payout destination must be verified';
      END IF;

      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_buymesho_validate_event_payout_destination ON events;
    CREATE TRIGGER trg_buymesho_validate_event_payout_destination
    BEFORE INSERT OR UPDATE OF creator_uid, payout_destination_id ON events
    FOR EACH ROW
    EXECUTE FUNCTION buymesho_validate_event_payout_destination();
  `);
}

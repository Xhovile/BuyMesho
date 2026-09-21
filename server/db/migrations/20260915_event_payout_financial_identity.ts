import { postgresDb } from "../../db.js";

/**
 * Adds explicit event financial identity to payout records while preserving
 * the existing seller payout contract.
 */
export function ensureEventPayoutFinancialIdentityMigration() {
  postgresDb.exec(`
    ALTER TABLE payouts
      ADD COLUMN IF NOT EXISTS event_id BIGINT;

    ALTER TABLE payouts
      ADD COLUMN IF NOT EXISTS event_creator_uid TEXT;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_payouts_event_id'
          AND conrelid = 'payouts'::regclass
      ) THEN
        ALTER TABLE payouts
          ADD CONSTRAINT fk_payouts_event_id
          FOREIGN KEY (event_id)
          REFERENCES events(id)
          ON DELETE RESTRICT;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_payouts_event_creator_uid'
          AND conrelid = 'payouts'::regclass
      ) THEN
        ALTER TABLE payouts
          ADD CONSTRAINT fk_payouts_event_creator_uid
          FOREIGN KEY (event_creator_uid)
          REFERENCES event_creators(uid)
          ON DELETE RESTRICT;
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS idx_payouts_event_id
      ON payouts (event_id, created_at DESC)
      WHERE event_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_payouts_event_creator_uid
      ON payouts (event_creator_uid, created_at DESC)
      WHERE event_creator_uid IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_event_order_unique
      ON payouts (event_id, order_id)
      WHERE event_id IS NOT NULL
        AND order_id IS NOT NULL
        AND owner_type = 'event_creator'
        AND release_entry_id IS NULL;

    CREATE OR REPLACE FUNCTION buymesho_validate_event_payout_financial_identity()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      event_creator TEXT;
      event_destination TEXT;
    BEGIN
      IF NEW.event_id IS NULL THEN
        IF NEW.event_creator_uid IS NOT NULL THEN
          RAISE EXCEPTION 'event_creator_uid requires event_id on payout';
        END IF;
        RETURN NEW;
      END IF;

      SELECT creator_uid, payout_destination_id
      INTO event_creator, event_destination
      FROM events
      WHERE id = NEW.event_id
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Payout event does not exist';
      END IF;

      IF event_creator IS NULL THEN
        RAISE EXCEPTION 'Payout event must have an event creator';
      END IF;

      IF NEW.event_creator_uid IS NULL THEN
        NEW.event_creator_uid := event_creator;
      ELSIF NEW.event_creator_uid <> event_creator THEN
        RAISE EXCEPTION 'Payout event creator does not match the event creator';
      END IF;

      IF NEW.destination_account_id IS NULL THEN
        RAISE EXCEPTION 'Event payout must retain the exact destination account used for the event';
      END IF;

      IF event_destination IS NULL THEN
        RAISE EXCEPTION 'Payout event has no bound payout destination';
      END IF;

      IF NEW.destination_account_id <> event_destination THEN
        RAISE EXCEPTION 'Event payout destination must match the event-bound destination';
      END IF;

      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_buymesho_validate_event_payout_financial_identity ON payouts;
    CREATE TRIGGER trg_buymesho_validate_event_payout_financial_identity
    BEFORE INSERT OR UPDATE OF event_id, event_creator_uid, destination_account_id ON payouts
    FOR EACH ROW
    EXECUTE FUNCTION buymesho_validate_event_payout_financial_identity();
  `);
}

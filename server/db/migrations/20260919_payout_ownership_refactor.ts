import { postgresDb } from "../../db.js";

export function ensurePayoutOwnershipRefactorMigration() {
  postgresDb.exec(`
    ALTER TABLE payouts ADD COLUMN IF NOT EXISTS owner_type TEXT DEFAULT 'seller';
    ALTER TABLE payouts ADD COLUMN IF NOT EXISTS owner_uid TEXT;

    CREATE OR REPLACE FUNCTION buymesho_normalize_payout_owner()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $
    BEGIN
      IF NEW.event_id IS NOT NULL OR NEW.event_creator_uid IS NOT NULL OR NEW.owner_type = 'event_creator' THEN
        NEW.owner_type := 'event_creator';
        NEW.owner_uid := COALESCE(NEW.owner_uid, NEW.event_creator_uid);
      ELSE
        NEW.owner_type := COALESCE(NEW.owner_type, 'seller');
        NEW.owner_uid := COALESCE(NEW.owner_uid, NEW.seller_id);
      END IF;
      RETURN NEW;
    END;
    $;

    DROP TRIGGER IF EXISTS trg_buymesho_normalize_payout_owner ON payouts;
    CREATE TRIGGER trg_buymesho_normalize_payout_owner
    BEFORE INSERT OR UPDATE OF owner_type, owner_uid, seller_id, event_id, event_creator_uid
    ON payouts
    FOR EACH ROW
    EXECUTE FUNCTION buymesho_normalize_payout_owner();

    UPDATE payouts
    SET owner_type = 'event_creator',
        owner_uid = event_creator_uid
    WHERE event_id IS NOT NULL
      AND event_creator_uid IS NOT NULL;

    UPDATE payouts
    SET owner_type = 'seller',
        owner_uid = seller_id
    WHERE event_id IS NULL
      AND (owner_type IS NULL OR owner_uid IS NULL);

    ALTER TABLE payouts
      DROP CONSTRAINT IF EXISTS ck_payout_owner_identity;

    ALTER TABLE payouts
      ADD CONSTRAINT ck_payout_owner_identity
      CHECK (
        (
          owner_type = 'seller'
          AND owner_uid = seller_id
          AND event_id IS NULL
          AND event_creator_uid IS NULL
        )
        OR
        (
          owner_type = 'event_creator'
          AND owner_uid = event_creator_uid
          AND event_id IS NOT NULL
          AND event_creator_uid IS NOT NULL
        )
      ) NOT VALID;

    ALTER TABLE payouts VALIDATE CONSTRAINT ck_payout_owner_identity;

    ALTER TABLE payouts ALTER COLUMN owner_type SET NOT NULL;
    ALTER TABLE payouts ALTER COLUMN owner_uid SET NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_payouts_owner
      ON payouts (owner_type, owner_uid, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_payouts_owner_event
      ON payouts (owner_type, event_id, created_at DESC)
      WHERE event_id IS NOT NULL;
  `);
}

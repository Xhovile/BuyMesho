import { postgresDb } from "../../db.js";

/**
 * Generalize the existing seller payout-destination storage so the same
 * destination/security machinery can later serve event creators.
 *
 * Existing seller rows remain seller-owned through seller_uid. Event creator
 * rows will use event_creator_uid. The legacy seller payout routes continue to
 * query seller_uid exactly as before, so this migration does not change their
 * behavior.
 */
export function ensurePayoutDestinationOwnershipMigration() {
  postgresDb.exec(`
    ALTER TABLE seller_payout_accounts
      ALTER COLUMN seller_uid DROP NOT NULL;

    ALTER TABLE seller_payout_accounts
      ADD COLUMN IF NOT EXISTS event_creator_uid TEXT;

    ALTER TABLE seller_payout_accounts
      ADD COLUMN IF NOT EXISTS owner_type TEXT NOT NULL DEFAULT 'seller';

    ALTER TABLE seller_payout_accounts
      ADD COLUMN IF NOT EXISTS owner_uid TEXT;

    UPDATE seller_payout_accounts
    SET owner_type = 'seller',
        owner_uid = seller_uid
    WHERE owner_type IS NULL
       OR owner_type = ''
       OR owner_uid IS NULL;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_seller_payout_accounts_event_creator_uid'
          AND conrelid = 'seller_payout_accounts'::regclass
      ) THEN
        ALTER TABLE seller_payout_accounts
          ADD CONSTRAINT fk_seller_payout_accounts_event_creator_uid
          FOREIGN KEY (event_creator_uid) REFERENCES event_creators(uid) ON DELETE CASCADE;
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_seller_payout_accounts_owner_identity'
          AND conrelid = 'seller_payout_accounts'::regclass
      ) THEN
        ALTER TABLE seller_payout_accounts
          ADD CONSTRAINT ck_seller_payout_accounts_owner_identity
          CHECK (
            (owner_type = 'seller' AND seller_uid IS NOT NULL AND event_creator_uid IS NULL AND owner_uid = seller_uid)
            OR
            (owner_type = 'event_creator' AND seller_uid IS NULL AND event_creator_uid IS NOT NULL AND owner_uid = event_creator_uid)
          ) NOT VALID;
      END IF;
    END
    $$;

    ALTER TABLE seller_payout_accounts
      VALIDATE CONSTRAINT ck_seller_payout_accounts_owner_identity;

    CREATE INDEX IF NOT EXISTS idx_seller_payout_accounts_event_creator_uid
      ON seller_payout_accounts (event_creator_uid, is_active, created_at DESC)
      WHERE event_creator_uid IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_seller_payout_accounts_owner
      ON seller_payout_accounts (owner_type, owner_uid, is_active, created_at DESC);
  `);

  postgresDb.exec(`
    ALTER TABLE seller_payout_account_events
      ALTER COLUMN seller_uid DROP NOT NULL;

    ALTER TABLE seller_payout_account_events
      ADD COLUMN IF NOT EXISTS event_creator_uid TEXT;

    ALTER TABLE seller_payout_account_events
      ADD COLUMN IF NOT EXISTS owner_type TEXT NOT NULL DEFAULT 'seller';

    ALTER TABLE seller_payout_account_events
      ADD COLUMN IF NOT EXISTS owner_uid TEXT;

    UPDATE seller_payout_account_events
    SET owner_type = 'seller',
        owner_uid = seller_uid
    WHERE owner_type IS NULL
       OR owner_type = ''
       OR owner_uid IS NULL;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_seller_payout_account_events_event_creator_uid'
          AND conrelid = 'seller_payout_account_events'::regclass
      ) THEN
        ALTER TABLE seller_payout_account_events
          ADD CONSTRAINT fk_seller_payout_account_events_event_creator_uid
          FOREIGN KEY (event_creator_uid) REFERENCES event_creators(uid) ON DELETE CASCADE;
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_seller_payout_account_events_owner_identity'
          AND conrelid = 'seller_payout_account_events'::regclass
      ) THEN
        ALTER TABLE seller_payout_account_events
          ADD CONSTRAINT ck_seller_payout_account_events_owner_identity
          CHECK (
            (owner_type = 'seller' AND seller_uid IS NOT NULL AND event_creator_uid IS NULL AND owner_uid = seller_uid)
            OR
            (owner_type = 'event_creator' AND seller_uid IS NULL AND event_creator_uid IS NOT NULL AND owner_uid = event_creator_uid)
          ) NOT VALID;
      END IF;
    END
    $$;

    ALTER TABLE seller_payout_account_events
      VALIDATE CONSTRAINT ck_seller_payout_account_events_owner_identity;

    CREATE INDEX IF NOT EXISTS idx_seller_payout_account_events_event_creator_uid
      ON seller_payout_account_events (event_creator_uid, created_at DESC)
      WHERE event_creator_uid IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_seller_payout_account_events_owner
      ON seller_payout_account_events (owner_type, owner_uid, created_at DESC);
  `);
}

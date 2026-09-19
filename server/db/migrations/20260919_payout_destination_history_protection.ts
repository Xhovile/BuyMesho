import { postgresDb } from "../../db.js";

export function ensurePayoutDestinationHistoryProtectionMigration(): void {
  postgresDb.exec(`
    CREATE OR REPLACE FUNCTION buymesho_protect_payout_destination_delete()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM payouts
        WHERE destination_account_id = OLD.id
      ) THEN
        RAISE EXCEPTION 'Payout destination is retained because it is referenced by historical payout records';
      END IF;

      RETURN OLD;
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_buymesho_protect_payout_destination_delete
      ON seller_payout_accounts;

    CREATE TRIGGER trg_buymesho_protect_payout_destination_delete
    BEFORE DELETE ON seller_payout_accounts
    FOR EACH ROW
    EXECUTE FUNCTION buymesho_protect_payout_destination_delete();
  `);
}

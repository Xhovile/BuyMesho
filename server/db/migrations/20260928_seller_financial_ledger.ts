import { postgresDb } from "../../db.js";

/**
 * Canonical seller financial exposure ledger shared by Listings and Events.
 *
 * Reserves are accumulated from payout reserve deductions. Post-payout
 * reversals/refunds consume reserve first and create seller negative balance
 * for any remaining amount. Future payouts can reserve part of their seller
 * proceeds against that negative balance.
 */
export function ensureSellerFinancialLedgerMigration(): void {
  postgresDb.exec(\`
    CREATE TABLE IF NOT EXISTS seller_financial_accounts (
      seller_uid TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'MWK',
      reserve_balance INTEGER NOT NULL DEFAULT 0 CHECK (reserve_balance >= 0),
      negative_balance INTEGER NOT NULL DEFAULT 0 CHECK (negative_balance >= 0),
      reserved_negative_balance INTEGER NOT NULL DEFAULT 0 CHECK (reserved_negative_balance >= 0),
      payout_hold INTEGER NOT NULL DEFAULT 0,
      payout_hold_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (seller_uid, currency)
    );

    CREATE TABLE IF NOT EXISTS seller_financial_ledger (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      seller_uid TEXT NOT NULL,
      currency TEXT NOT NULL,
      event_type TEXT NOT NULL,
      amount INTEGER NOT NULL CHECK (amount >= 0),
      reserve_delta INTEGER NOT NULL DEFAULT 0,
      negative_balance_delta INTEGER NOT NULL DEFAULT 0,
      reserved_negative_balance_delta INTEGER NOT NULL DEFAULT 0,
      reserve_balance_after INTEGER NOT NULL DEFAULT 0 CHECK (reserve_balance_after >= 0),
      negative_balance_after INTEGER NOT NULL DEFAULT 0 CHECK (negative_balance_after >= 0),
      reserved_negative_balance_after INTEGER NOT NULL DEFAULT 0 CHECK (reserved_negative_balance_after >= 0),
      payout_id TEXT,
      refund_liability_id TEXT,
      reference TEXT,
      reason TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      metadata TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_uid) REFERENCES sellers(uid) ON DELETE CASCADE
    );

    ALTER TABLE payouts
      ADD COLUMN IF NOT EXISTS balance_netting_amount INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE payouts
      ADD COLUMN IF NOT EXISTS balance_netting_status TEXT NOT NULL DEFAULT 'none';

    CREATE INDEX IF NOT EXISTS idx_seller_financial_accounts_negative
      ON seller_financial_accounts (currency, negative_balance DESC);
    CREATE INDEX IF NOT EXISTS idx_seller_financial_accounts_hold
      ON seller_financial_accounts (payout_hold, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_seller_financial_ledger_seller
      ON seller_financial_ledger (seller_uid, currency, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_seller_financial_ledger_payout
      ON seller_financial_ledger (payout_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_seller_financial_ledger_refund_liability
      ON seller_financial_ledger (refund_liability_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payouts_balance_netting
      ON payouts (balance_netting_status, seller_id, created_at DESC);

    ALTER TABLE payouts
      DROP CONSTRAINT IF EXISTS payouts_balance_netting_status_check;
    ALTER TABLE payouts
      ADD CONSTRAINT payouts_balance_netting_status_check
      CHECK (balance_netting_status IN ('none','reserved','settled','released'));

    INSERT INTO seller_financial_accounts (seller_uid, currency)
    SELECT uid, 'MWK' FROM sellers
    ON CONFLICT (seller_uid, currency) DO NOTHING;

    INSERT INTO seller_financial_accounts (seller_uid, currency)
    SELECT uid, 'MWK' FROM event_creators
    ON CONFLICT (seller_uid, currency) DO NOTHING;

    UPDATE seller_financial_accounts a
       SET reserve_balance = GREATEST(
         a.reserve_balance,
         COALESCE((
           SELECT SUM(COALESCE(p.reserve_amount, 0))
           FROM payouts p
           WHERE p.status = 'paid'
             AND COALESCE(p.reserve_amount, 0) > 0
             AND COALESCE(p.owner_uid, p.event_creator_uid, p.seller_id) = a.seller_uid
             AND COALESCE(p.currency, 'MWK') = a.currency
         ), 0)
       ),
       updated_at = CURRENT_TIMESTAMP;

    INSERT INTO seller_financial_ledger (
      id, idempotency_key, seller_uid, currency, event_type, amount,
      reserve_delta, negative_balance_delta, reserved_negative_balance_delta,
      reserve_balance_after, negative_balance_after, reserved_negative_balance_after,
      reason, actor_type, actor_id, metadata, created_at
    )
    SELECT
      'ledger-seed-' || md5(a.seller_uid || ':' || a.currency),
      'historical-reserve-seed:' || a.seller_uid || ':' || a.currency,
      a.seller_uid,
      a.currency,
      'historical_reserve_seed',
      a.reserve_balance,
      a.reserve_balance,
      0,
      0,
      a.reserve_balance,
      a.negative_balance,
      a.reserved_negative_balance,
      'Backfilled reserve balance from historical paid payouts',
      'system',
      NULL,
      jsonb_build_object('source','historical_paid_payouts')::text,
      CURRENT_TIMESTAMP
    FROM seller_financial_accounts a
    WHERE a.reserve_balance > 0
    ON CONFLICT (idempotency_key) DO NOTHING;

    CREATE OR REPLACE FUNCTION buymesho_payout_financial_transition()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      owner_uid_value TEXT;
      currency_value TEXT;
      netting_amount INTEGER;
      settled_netting INTEGER;
      reserve_credit INTEGER;
      reserve_before INTEGER;
      negative_before INTEGER;
      reserved_before INTEGER;
      reserve_delta_value INTEGER;
      negative_delta_value INTEGER;
      reserved_delta_value INTEGER;
      event_type_value TEXT;
      reason_value TEXT;
      idempotency_value TEXT;
      ledger_id_value TEXT;
    BEGIN
      IF TG_OP <> 'UPDATE' OR OLD.status = NEW.status THEN
        RETURN NEW;
      END IF;

      IF NEW.status NOT IN ('paid', 'failed', 'cancelled') THEN
        RETURN NEW;
      END IF;

      owner_uid_value := COALESCE(NEW.owner_uid, NEW.event_creator_uid, NEW.seller_id);
      currency_value := COALESCE(NEW.currency, 'MWK');
      netting_amount := GREATEST(COALESCE(NEW.balance_netting_amount, 0), 0);
      reserve_credit := CASE
        WHEN NEW.status = 'paid' THEN GREATEST(COALESCE(NEW.reserve_amount, 0), 0)
        ELSE 0
      END;

      IF owner_uid_value IS NULL OR owner_uid_value = '' THEN
        RETURN NEW;
      END IF;

      INSERT INTO seller_financial_accounts (seller_uid, currency)
      VALUES (owner_uid_value, currency_value)
      ON CONFLICT (seller_uid, currency) DO NOTHING;

      SELECT reserve_balance, negative_balance, reserved_negative_balance
        INTO reserve_before, negative_before, reserved_before
        FROM seller_financial_accounts
       WHERE seller_uid = owner_uid_value
         AND currency = currency_value
       FOR UPDATE;

      IF NEW.status = 'paid' THEN
        settled_netting := LEAST(netting_amount, GREATEST(negative_before, 0), GREATEST(reserved_before, 0));
        reserve_delta_value := reserve_credit;
        negative_delta_value := -settled_netting;
        reserved_delta_value := -settled_netting;
        event_type_value := 'payout_settled';
        reason_value := 'Payout settled; reserve retained and reserved seller debt was cleared';
        idempotency_value := 'payout-settlement:' || NEW.id;
      ELSE
        settled_netting := LEAST(netting_amount, GREATEST(reserved_before, 0));
        reserve_delta_value := 0;
        negative_delta_value := 0;
        reserved_delta_value := -settled_netting;
        event_type_value := 'payout_netting_released';
        reason_value := CASE
          WHEN NEW.status = 'failed' THEN 'Failed payout released reserved seller-debt netting'
          ELSE 'Cancelled payout released reserved seller-debt netting'
        END;
        idempotency_value := 'payout-netting-release:' || NEW.id || ':' || NEW.status;
      END IF;

      UPDATE seller_financial_accounts
         SET reserve_balance = reserve_before + reserve_delta_value,
             negative_balance = GREATEST(0, negative_before + negative_delta_value),
             reserved_negative_balance = GREATEST(0, reserved_before + reserved_delta_value),
             updated_at = CURRENT_TIMESTAMP
       WHERE seller_uid = owner_uid_value
         AND currency = currency_value;

      SELECT reserve_balance, negative_balance, reserved_negative_balance
        INTO reserve_before, negative_before, reserved_before
        FROM seller_financial_accounts
       WHERE seller_uid = owner_uid_value
         AND currency = currency_value;

      ledger_id_value := 'ledger-' || md5(idempotency_value);

      INSERT INTO seller_financial_ledger (
        id, idempotency_key, seller_uid, currency, event_type, amount,
        reserve_delta, negative_balance_delta, reserved_negative_balance_delta,
        reserve_balance_after, negative_balance_after, reserved_negative_balance_after,
        payout_id, reason, actor_type, actor_id, metadata
      ) VALUES (
        ledger_id_value,
        idempotency_value,
        owner_uid_value,
        currency_value,
        event_type_value,
        CASE WHEN NEW.status = 'paid' THEN (settled_netting + reserve_credit) ELSE settled_netting END,
        reserve_delta_value,
        negative_delta_value,
        reserved_delta_value,
        reserve_before,
        negative_before,
        reserved_before,
        NEW.id,
        reason_value,
        'system',
        NULL,
        jsonb_build_object(
          'previousPayoutStatus', OLD.status,
          'nextPayoutStatus', NEW.status,
          'balanceNettingAmount', netting_amount,
          'settledNettingAmount', settled_netting,
          'reserveCredit', reserve_credit
        )::text
      )
      ON CONFLICT (idempotency_key) DO NOTHING;

      NEW.balance_netting_status := CASE
        WHEN NEW.status = 'paid' THEN 'settled'
        ELSE 'released'
      END;
      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_buymesho_payout_financial_transition ON payouts;
    CREATE TRIGGER trg_buymesho_payout_financial_transition
    BEFORE UPDATE OF status ON payouts
    FOR EACH ROW
    EXECUTE FUNCTION buymesho_payout_financial_transition();
  \`);
}

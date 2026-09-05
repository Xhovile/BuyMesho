import { postgresDb } from "../../db.js";

const DEFAULT_DELIVERY_PERIOD_DAYS = 10;

export function ensureDisputeWindowsMigration(): void {
  postgresDb.exec(`
    ALTER TABLE listings
      ADD COLUMN IF NOT EXISTS delivery_period_days INTEGER DEFAULT ${DEFAULT_DELIVERY_PERIOD_DAYS};

    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS delivery_period_days INTEGER DEFAULT ${DEFAULT_DELIVERY_PERIOD_DAYS};

    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS delivery_deadline TIMESTAMPTZ;
  `);

  postgresDb.exec(`
    UPDATE listings
    SET delivery_period_days = ${DEFAULT_DELIVERY_PERIOD_DAYS}
    WHERE delivery_period_days IS NULL OR delivery_period_days < 1;

    UPDATE orders
    SET delivery_period_days = ${DEFAULT_DELIVERY_PERIOD_DAYS}
    WHERE delivery_period_days IS NULL OR delivery_period_days < 1;

    UPDATE orders o
    SET delivery_deadline =
      COALESCE(o.paid_at, o.placed_at, o.created_at)::timestamptz
      + make_interval(days => o.delivery_period_days)
    WHERE o.delivery_deadline IS NULL
      AND COALESCE(o.paid_at, o.placed_at, o.created_at) IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(NULLIF(o.items, '')::jsonb, '[]'::jsonb)) item
        WHERE NULLIF(item->>'listingId', '') IS NOT NULL
      );
  `);

  postgresDb.exec(`
    CREATE OR REPLACE FUNCTION sync_escrow_state_on_dispute_case()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      UPDATE escrows
      SET state = 'disputed',
          updated_at = NOW()
      WHERE order_id = NEW.order_id
        AND state IN ('funded', 'held');
      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_sync_escrow_state_on_dispute_case ON dispute_cases;

    CREATE TRIGGER trg_sync_escrow_state_on_dispute_case
      AFTER INSERT ON dispute_cases
      FOR EACH ROW
      EXECUTE FUNCTION sync_escrow_state_on_dispute_case();

    UPDATE escrows e
    SET state = 'disputed',
        updated_at = NOW()
    WHERE e.state IN ('funded', 'held')
      AND EXISTS (
        SELECT 1
        FROM dispute_cases dc
        WHERE dc.order_id = e.order_id
          AND dc.status IN ('open', 'under_review', 'awaiting_response')
      );
  `);

  postgresDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_delivery_deadline
      ON orders (delivery_deadline, status);

    CREATE INDEX IF NOT EXISTS idx_listings_delivery_period_days
      ON listings (delivery_period_days);
  `);
}

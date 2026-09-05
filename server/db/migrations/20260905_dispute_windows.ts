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
    CREATE INDEX IF NOT EXISTS idx_orders_delivery_deadline
      ON orders (delivery_deadline, status);

    CREATE INDEX IF NOT EXISTS idx_listings_delivery_period_days
      ON listings (delivery_period_days);
  `);
}

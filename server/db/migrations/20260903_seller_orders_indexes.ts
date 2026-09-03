import { postgresDb } from "../../db.js";

export function ensureSellerOrdersIndexesMigration() {
  postgresDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_seller_created_at
      ON orders (seller_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_disputes_order_created_at
      ON disputes (order_id, created_at DESC);
  `);
}

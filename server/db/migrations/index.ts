import { schemaSql } from "../schema.js";
import { getDatabase } from "../connection.js";

export function runMigrations() {
  const db = getDatabase();
  db.exec(schemaSql);


  try {
    db.exec(\`
      CREATE TABLE IF NOT EXISTS seller_connect_accounts (
        id TEXT PRIMARY KEY,
        seller_uid TEXT NOT NULL UNIQUE,
        provider_name TEXT NOT NULL DEFAULT 'paychangu',
        status TEXT NOT NULL DEFAULT 'pending',
        mode TEXT NOT NULL DEFAULT 'test',
        scope TEXT,
        authorization_url TEXT,
        connect_user_id TEXT,
        connect_user_email TEXT,
        connect_user_name TEXT,
        access_token_encrypted TEXT,
        refresh_token_encrypted TEXT,
        webhook_url TEXT,
        webhook_secret_encrypted TEXT,
        connected_at TEXT,
        revoked_at TEXT,
        last_error TEXT,
        raw_profile TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    \`);
  } catch (error) {
    console.warn("Seller Connect accounts table migration failed:", error);
  }

  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_seller_applications_applicant_uid
      ON seller_applications (applicant_uid, created_at DESC)
    `);
  } catch (error) {
    console.warn("Seller applications index migration failed:", error);
  }

  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_ratings_unique
      ON seller_ratings (seller_uid, rater_uid)
    `);
  } catch (error) {
    console.warn("Seller ratings index setup failed:", error);
  }

  for (const [column, definition] of [
    ["deleted_at", "TEXT"],
    ["deleted_by_uid", "TEXT"],
    ["hard_delete_after", "TEXT"],
  ] as const) {
    try {
      const columns = db.prepare("PRAGMA table_info(listings)").all() as Array<{ name: string }>;
      if (!columns.some((row) => row.name === column)) {
        db.exec(`ALTER TABLE listings ADD COLUMN ${column} ${definition}`);
      }
    } catch (error) {
      console.warn(`Listings soft-delete column migration failed for ${column}:`, error);
    }
  }

  for (const [column, definition] of [
    ["description", "TEXT"],
    ["original_price", "REAL"],
    ["discount_percent", "INTEGER"],
    ["deal_label", "TEXT"],
    ["single_item_price", "REAL"],
    ["listing_mode", "TEXT NOT NULL DEFAULT 'normal'"],
    ["deal_expires_at", "TEXT"],
    ["can_sell_individually", "INTEGER"],
    ["is_wholesale", "INTEGER NOT NULL DEFAULT 0"],
    ["pack_size", "INTEGER"],
    ["bulk_units", "TEXT"],
    ["category", "TEXT"],
    ["subcategory", "TEXT"],
    ["item_type", "TEXT"],
    ["spec_values", "TEXT"],
    ["university", "TEXT"],
    ["is_seller", "INTEGER NOT NULL DEFAULT 1"],
    ["photos", "TEXT"],
    ["video_url", "TEXT"],
    ["condition", "TEXT NOT NULL DEFAULT 'used'"],
    ["views_count", "INTEGER NOT NULL DEFAULT 0"],
    ["whatsapp_clicks", "INTEGER NOT NULL DEFAULT 0"],
    ["is_hidden", "INTEGER NOT NULL DEFAULT 0"],
    ["quantity", "INTEGER NOT NULL DEFAULT 1"],
    ["sold_quantity", "INTEGER NOT NULL DEFAULT 0"],
    ["created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"],
  ] as const) {
    try {
      const columns = db.prepare("PRAGMA table_info(listings)").all() as Array<{ name: string }>;
      if (!columns.some((row) => row.name === column)) {
        db.exec(`ALTER TABLE listings ADD COLUMN ${column} ${definition}`);
      }
    } catch (error) {
      console.warn(`Listings column migration failed for ${column}:`, error);
    }
  }

  for (const [column, definition] of [
    ["profile_picture", "TEXT"],
    ["is_seller", "INTEGER NOT NULL DEFAULT 0"],
    ["university", "TEXT"],
    ["bio", "TEXT"],
    ["business_name", "TEXT"],
    ["business_logo", "TEXT"],
    ["is_verified", "INTEGER NOT NULL DEFAULT 0"],
    ["is_suspended", "INTEGER NOT NULL DEFAULT 0"],
    ["profile_views", "INTEGER NOT NULL DEFAULT 0"],
    ["join_date", "TEXT"],
  ] as const) {
    try {
      const columns = db.prepare("PRAGMA table_info(sellers)").all() as Array<{ name: string }>;
      if (!columns.some((row) => row.name === column)) {
        db.exec(`ALTER TABLE sellers ADD COLUMN ${column} ${definition}`);
      }
    } catch (error) {
      console.warn(`Sellers column migration failed for ${column}:`, error);
    }
  }

  try {
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_seller_applications_ensure_seller
      BEFORE INSERT ON seller_applications
      FOR EACH ROW
      BEGIN
        INSERT INTO sellers (uid, email, is_verified, is_seller)
        VALUES (
          NEW.applicant_uid,
          COALESCE(NEW.applicant_email, ''),
          0,
          0
        )
        ON CONFLICT(uid) DO UPDATE SET
          email = CASE
            WHEN sellers.email = '' AND excluded.email <> '' THEN excluded.email
            ELSE sellers.email
          END;
      END;
    `);
  } catch (error) {
    console.warn("Seller application bootstrap trigger setup failed:", error);
  }

  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_listings_hard_delete_after
      ON listings (hard_delete_after)
      WHERE deleted_at IS NOT NULL
    `);
  } catch (error) {
    console.warn("Listings soft-delete purge index setup failed:", error);
  }

  return db;
}
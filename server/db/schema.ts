export const schemaSql = `
CREATE TABLE IF NOT EXISTS sellers (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  business_name TEXT,
  business_logo TEXT,
  profile_picture TEXT,
  university TEXT,
  bio TEXT,
  is_verified INTEGER DEFAULT 0,
  is_seller INTEGER NOT NULL DEFAULT 0,
  is_suspended INTEGER NOT NULL DEFAULT 0,
  profile_views INTEGER NOT NULL DEFAULT 0,
  join_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seller_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_uid TEXT NOT NULL,
  applicant_email TEXT,
  full_legal_name TEXT NOT NULL,
  institution TEXT NOT NULL,
  applicant_type TEXT NOT NULL,
  institution_id_number TEXT NOT NULL,
  whatsapp_number TEXT,
  business_name TEXT NOT NULL,
  what_to_sell TEXT NOT NULL,
  business_description TEXT NOT NULL,
  reason_for_applying TEXT NOT NULL,
  proof_document_url TEXT NOT NULL,
  agreed_to_rules INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by_uid TEXT,
  review_notes TEXT,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (applicant_uid) REFERENCES sellers(uid)
);

CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_uid TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  description TEXT,
  original_price REAL,
  discount_percent INTEGER,
  deal_label TEXT,
  listing_mode TEXT NOT NULL DEFAULT 'normal',
  deal_expires_at TEXT,
  can_sell_individually INTEGER,
  is_wholesale INTEGER NOT NULL DEFAULT 0,
  pack_size INTEGER,
  bulk_units TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  item_type TEXT,
  spec_values TEXT,
  university TEXT NOT NULL,
  is_seller INTEGER NOT NULL DEFAULT 1,
  photos TEXT,
  video_url TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  condition TEXT NOT NULL DEFAULT 'used',
  views_count INTEGER NOT NULL DEFAULT 0,
  whatsapp_clicks INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by_uid TEXT,
  hard_delete_after TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  sold_quantity INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_uid) REFERENCES sellers(uid)
);

CREATE INDEX IF NOT EXISTS idx_listings_hard_delete_after
ON listings (hard_delete_after)
WHERE deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'listing',
  listing_id INTEGER,
  subject TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  reporter_uid TEXT,
  reporter_email TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id)
);

CREATE TABLE IF NOT EXISTS seller_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_uid TEXT NOT NULL,
  rater_uid TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (seller_uid, rater_uid),
  FOREIGN KEY (seller_uid) REFERENCES sellers(uid)
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_uid TEXT,
  admin_email TEXT,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

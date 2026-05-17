CREATE TABLE IF NOT EXISTS sellers (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  business_name TEXT,
  business_logo TEXT,
  university TEXT,
  bio TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0,
  is_seller INTEGER NOT NULL DEFAULT 0,
  is_suspended INTEGER NOT NULL DEFAULT 0,
  profile_views INTEGER NOT NULL DEFAULT 0,
  join_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seller_payout_accounts (
  id TEXT PRIMARY KEY,
  seller_uid TEXT NOT NULL,
  destination_type TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  provider_ref_id TEXT,
  currency TEXT NOT NULL DEFAULT 'MWK',
  account_name TEXT NOT NULL,
  account_number_encrypted TEXT,
  mobile_encrypted TEXT,
  masked_account TEXT NOT NULL,
  destination_fingerprint TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verification_attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  verified_at TIMESTAMPTZ,
  replaced_from_id TEXT,
  replaced_by_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_uid) REFERENCES sellers(uid) ON DELETE CASCADE,
  FOREIGN KEY (replaced_from_id) REFERENCES seller_payout_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (replaced_by_id) REFERENCES seller_payout_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS seller_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (applicant_uid) REFERENCES sellers(uid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS listings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seller_uid TEXT NOT NULL,
  name TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  original_price DOUBLE PRECISION,
  discount_percent INTEGER,
  deal_label TEXT,
  listing_mode TEXT NOT NULL DEFAULT 'normal',
  deal_expires_at TEXT,
  is_wholesale INTEGER NOT NULL DEFAULT 0,
  can_sell_individually INTEGER,
  description TEXT,
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
  quantity INTEGER NOT NULL DEFAULT 1,
  sold_quantity INTEGER NOT NULL DEFAULT 0,
  single_item_price DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_uid) REFERENCES sellers(uid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  buyer_uid TEXT NOT NULL,
  seller_uid TEXT NOT NULL,
  last_message_preview TEXT,
  last_message_at DATETIME,
  buyer_unread_count INTEGER NOT NULL DEFAULT 0,
  seller_unread_count INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (listing_id, buyer_uid, seller_uid),
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_uid TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_listing
ON conversations (listing_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer
ON conversations (buyer_uid, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_seller
ON conversations (seller_uid, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
ON messages (conversation_id, created_at ASC, id ASC);

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'listing',
  listing_id BIGINT,
  subject TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  reporter_uid TEXT,
  reporter_email TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seller_ratings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seller_uid TEXT NOT NULL,
  rater_uid TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (seller_uid, rater_uid),
  FOREIGN KEY (seller_uid) REFERENCES sellers(uid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS listing_reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id BIGINT NOT NULL,
  seller_uid TEXT NOT NULL,
  reviewer_uid TEXT NOT NULL,
  reviewer_email TEXT,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  is_verified_purchase INTEGER NOT NULL DEFAULT 0,
  seller_reply TEXT,
  seller_reply_at TIMESTAMPTZ,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (listing_id, reviewer_uid),
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_uid) REFERENCES sellers(uid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_uid TEXT,
  admin_email TEXT,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seller_applications_applicant_uid
ON seller_applications (applicant_uid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_seller_uid
ON listings (seller_uid);

CREATE INDEX IF NOT EXISTS idx_listings_category
ON listings (category);

CREATE INDEX IF NOT EXISTS idx_listings_university
ON listings (university);

CREATE INDEX IF NOT EXISTS idx_reports_listing_id
ON reports (listing_id);

CREATE INDEX IF NOT EXISTS idx_listing_reviews_listing_id
ON listing_reviews (listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_reviews_seller_uid
ON listing_reviews (seller_uid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_reviews_reviewer_uid
ON listing_reviews (reviewer_uid, created_at DESC);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  provider_reference TEXT,
  currency TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  checkout_url TEXT,
  paid_at TIMESTAMPTZ,
  verified INTEGER NOT NULL DEFAULT 0,
  verification TEXT,
  raw_metadata TEXT,
  raw_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id
ON payments (order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  currency TEXT NOT NULL,
  subtotal_amount DOUBLE PRECISION NOT NULL,
  subtotal_currency TEXT NOT NULL,
  fees_amount DOUBLE PRECISION,
  fees_currency TEXT,
  total_amount DOUBLE PRECISION NOT NULL,
  total_currency TEXT NOT NULL,
  payment_provider TEXT,
  payment_reference TEXT,
  escrow_id TEXT,
  items TEXT NOT NULL,
  placed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  raw_metadata TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_payment_reference
ON orders (payment_reference);

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  order_id TEXT,
  escrow_id TEXT,
  release_entry_id TEXT,
  destination_account_id TEXT,
  amount DOUBLE PRECISION NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  provider TEXT,
  provider_ref_id TEXT,
  provider_charge_id TEXT,
  provider_transaction_id TEXT,
  provider_status TEXT,
  failure_reason TEXT,
  manual_review_reason TEXT,
  requested_by TEXT,
  approved_by TEXT,
  requested_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  last_attempt_id TEXT,
  raw_request TEXT,
  raw_response TEXT,
  processed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (destination_account_id) REFERENCES seller_payout_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payouts_seller_id
ON payouts (seller_id);

CREATE INDEX IF NOT EXISTS idx_payouts_destination_account_id
ON payouts (destination_account_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_release_escrow
ON payouts (escrow_id)
WHERE escrow_id IS NOT NULL AND release_entry_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_provider_charge_id
ON payouts (provider_charge_id)
WHERE provider_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payouts_status
ON payouts (status, created_at DESC);

CREATE TABLE IF NOT EXISTS payout_attempts (
  id TEXT PRIMARY KEY,
  payout_id TEXT NOT NULL,
  attempt_no INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_charge_id TEXT NOT NULL UNIQUE,
  request_payload TEXT NOT NULL,
  response_payload TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  failure_reason TEXT,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payout_attempts_payout_id
ON payout_attempts (payout_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payout_attempts_status
ON payout_attempts (status, created_at DESC);

CREATE TABLE IF NOT EXISTS payout_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payout_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  note TEXT,
  payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seller_payout_account_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_uid TEXT NOT NULL,
  account_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  note TEXT,
  payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES seller_payout_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_uid) REFERENCES sellers(uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payout_events_payout_id
ON payout_events (payout_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payout_events_seller_id
ON payout_events (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seller_payout_account_events_seller_uid
ON seller_payout_account_events (seller_uid, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_payout_accounts_destination_fingerprint
ON seller_payout_accounts (seller_uid, destination_fingerprint);

CREATE INDEX IF NOT EXISTS idx_seller_payout_accounts_seller_uid
ON seller_payout_accounts (seller_uid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seller_payout_accounts_verification_status
ON seller_payout_accounts (seller_uid, verification_status, is_active);

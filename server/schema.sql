CREATE TABLE IF NOT EXISTS sellers (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  business_name TEXT,
  business_logo TEXT,
  university TEXT,
  bio TEXT,
  whatsapp_number TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0,
  is_seller INTEGER NOT NULL DEFAULT 0,
  is_suspended INTEGER NOT NULL DEFAULT 0,
  profile_views INTEGER NOT NULL DEFAULT 0,
  join_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seller_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  applicant_uid TEXT NOT NULL,
  applicant_email TEXT,
  full_legal_name TEXT NOT NULL,
  institution TEXT NOT NULL,
  applicant_type TEXT NOT NULL,
  institution_id_number TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
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
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  item_type TEXT,
  spec_values TEXT,
  university TEXT NOT NULL,
  is_seller INTEGER NOT NULL DEFAULT 1,
  photos TEXT,
  video_url TEXT,
  whatsapp_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  condition TEXT NOT NULL DEFAULT 'used',
  views_count INTEGER NOT NULL DEFAULT 0,
  whatsapp_clicks INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  sold_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_uid) REFERENCES sellers(uid) ON DELETE CASCADE
);

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

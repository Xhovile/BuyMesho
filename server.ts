import express, { type NextFunction, type Request, type Response } from "express";
import { mountTotpRoutes } from "./server/totpServer.js";
import { registerSessionRoutes } from "./server/auth/sessionRoutes.js";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { attachOptionalAuth, requireAuth } from "./server/middleware/requireAuth.js";
import { requireFirebaseUser } from "./server/middleware/requireFirebaseUser.js";
import { getFirebaseAdmin } from "./server/auth/firebaseAdmin.js";
import { getConfiguredAdminEmails, hasAdminAccess } from "./server/auth/adminAccess.js";
import { registerVerificationEmailRoutes } from "./server/auth/verificationEmailRoutes.js";
import { createPaymentRouter } from "./server/modules/payments/payment.routes.js";
import { createPaymentAdminRouter } from "./server/modules/payments/payment.admin.routes.js";
import { createEscrowRouter, createDisputeRouter, createPayoutRouter } from "./server/routes/escrowRoutes.js";
import { getPaymentDb } from "./server/sqlite.js";
import { CATEGORIES } from "./src/constants.js";
import {
  getListingSubcategories,
  getListingItemTypes,
} from "./src/listingSchemas/index.js";
dotenv.config();

console.log("SERVER STARTING: Environment loaded");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

const TITLE_MIN_ALNUM_CHARS = 3;

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

const withAsyncRoute = (handler: AsyncRouteHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next);
  };
};

function isMeaningfulTitle(input: unknown): boolean {
  if (typeof input !== "string") return false;
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (trimmed.length < 3) return false;

  const alnumMatches = trimmed.match(/[a-zA-Z0-9]/g) ?? [];
  if (alnumMatches.length < TITLE_MIN_ALNUM_CHARS) return false;

  const uniqueChars = new Set(trimmed.toLowerCase().replace(/\s+/g, ""));
  return uniqueChars.size >= 2;
}

function isValidListingHierarchy(
  category: string,
  subcategory?: string | null,
  itemType?: string | null
): boolean {
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return false;
  }

  const safeSubcategory = subcategory?.trim();
  const safeItemType = itemType?.trim();

  if (!safeSubcategory && !safeItemType) {
    return true;
  }

  if (!safeSubcategory || !safeItemType) {
    return false;
  }

  const validSubcategories = getListingSubcategories(category);
  if (!validSubcategories.includes(safeSubcategory)) {
    return false;
  }

  const validItemTypes = getListingItemTypes(category, safeSubcategory);
  return validItemTypes.includes(safeItemType);
}

let db: Database.Database;
try {
  db = new Database("market.db");
  console.log("Database initialized successfully");
} catch (err) {
  console.error("Failed to initialize database:", err);
  // Fallback or exit? For now, let's just log and see.
  process.exit(1);
}

// Simple migration check (SAFE):
// If old schema is detected, DO NOT auto-drop tables.
// Only reset when RESET_DB=true is set.
try {
  const tableInfo = db.prepare("PRAGMA table_info(sellers)").all() as any[];
  const hasUid = tableInfo.some((col) => col.name === "uid");

  if (tableInfo.length > 0 && !hasUid) {
    const shouldReset = process.env.RESET_DB === "true";

    console.warn("⚠️ Old schema detected in sellers table.");
    console.warn("⚠️ To reset database, set RESET_DB=true and restart the server.");

    if (shouldReset) {
      console.warn("🧨 RESET_DB=true → resetting database now...");
      db.exec("DROP TABLE IF EXISTS reports");
      db.exec("DROP TABLE IF EXISTS listings");
      db.exec("DROP TABLE IF EXISTS sellers");
    }
  }
} catch (e) {
  // Table might not exist yet, which is fine
}

// Initialize database
db.exec(`
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
  verified_at DATETIME,
  replaced_from_id TEXT,
  replaced_by_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_uid) REFERENCES sellers(uid) ON DELETE CASCADE,
  FOREIGN KEY (replaced_from_id) REFERENCES seller_payout_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (replaced_by_id) REFERENCES seller_payout_accounts(id) ON DELETE SET NULL
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
  quantity INTEGER NOT NULL DEFAULT 1,
  sold_quantity INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_uid) REFERENCES sellers(uid)
);

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
`); 

try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_seller_applications_applicant_uid
    ON seller_applications (applicant_uid, created_at DESC)
  `);
} catch (e) {
  console.warn("Seller applications index migration failed:", e);
}

try {
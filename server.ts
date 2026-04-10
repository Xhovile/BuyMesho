import express, { type NextFunction, type Request, type Response } from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { requireAuth } from "./server/middleware/requireAuth.js";
import { getFirebaseAdmin } from "./server/auth/firebaseAdmin.js";
import { registerVerificationEmailRoutes } from "./server/auth/verificationEmailRoutes.js";
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
  whatsapp_number TEXT,
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

// ✅ Migration: add video_url column if it doesn't exist
try {
  const cols = db.prepare("PRAGMA table_info(listings)").all() as any[];
  const hasVideo = cols.some((c) => c.name === "video_url");
  if (!hasVideo) {
    db.exec("ALTER TABLE listings ADD COLUMN video_url TEXT");
    console.log("Migration: Added listings.video_url");
  }
} catch (e) {
  console.warn("Migration check failed:", e);
}

try {
  const cols = db.prepare("PRAGMA table_info(listings)").all() as any[];
  const hasStatus = cols.some((c) => c.name === "status");
  if (!hasStatus) {
    db.exec("ALTER TABLE listings ADD COLUMN status TEXT NOT NULL DEFAULT 'available'");
    console.log("Migration: Added listings.status");
  }
} catch (e) {
  console.warn("Listings status migration check failed:", e);
}

try {
  const cols = db.prepare("PRAGMA table_info(sellers)").all() as any[];
  const hasWhatsapp = cols.some((c) => c.name === "whatsapp_number");
  if (!hasWhatsapp) {
    db.exec("ALTER TABLE sellers ADD COLUMN whatsapp_number TEXT");
    console.log("Migration: Added sellers.whatsapp_number");
  }
} catch (e) {
  console.warn("Sellers migration check failed:", e);
}

try {
  const cols = db.prepare("PRAGMA table_info(sellers)").all() as any[];
  const hasBusinessLogo = cols.some((c) => c.name === "business_logo");
  if (!hasBusinessLogo) {
    db.exec("ALTER TABLE sellers ADD COLUMN business_logo TEXT");
    console.log("Migration: Added sellers.business_logo");
  }
} catch (e) {
  console.warn("Sellers business_logo migration check failed:", e);
}

try {
  const cols = db.prepare("PRAGMA table_info(sellers)").all() as any[];
  const hasProfilePicture = cols.some((c) => c.name === "profile_picture");
  if (!hasProfilePicture) {
    db.exec("ALTER TABLE sellers ADD COLUMN profile_picture TEXT");
    console.log("Migration: Added sellers.profile_picture");
  }
} catch (e) {
  console.warn("Sellers profile_picture migration check failed:", e);
}

try {
  const cols = db.prepare("PRAGMA table_info(listings)").all() as any[];
  const hasCondition = cols.some((c) => c.name === "condition");

  if (!hasCondition) {
    db.exec("ALTER TABLE listings ADD COLUMN condition TEXT NOT NULL DEFAULT 'used'");
    console.log("Migration: Added listings.condition");
  }
} catch (e) {
  console.warn("Listings condition migration check failed:", e);
}

try {
  const cols = db.prepare("PRAGMA table_info(sellers)").all() as any[];
  const hasIsSeller = cols.some((c) => c.name === "is_seller");
  if (!hasIsSeller) {
    db.exec("ALTER TABLE sellers ADD COLUMN is_seller INTEGER NOT NULL DEFAULT 1");
    console.log("Migration: Added sellers.is_seller");
  }
} catch (e) {
  console.warn("Sellers is_seller migration check failed:", e);
}

try {
  const cols = db.prepare("PRAGMA table_info(listings)").all() as any[];

  const hasViewsCount = cols.some((c) => c.name === "views_count");
  if (!hasViewsCount) {
    db.exec("ALTER TABLE listings ADD COLUMN views_count INTEGER NOT NULL DEFAULT 0");
    console.log("Migration: Added listings.views_count");
  }

  const hasWhatsappClicks = cols.some((c) => c.name === "whatsapp_clicks");
  if (!hasWhatsappClicks) {
    db.exec("ALTER TABLE listings ADD COLUMN whatsapp_clicks INTEGER NOT NULL DEFAULT 0");
    console.log("Migration: Added listings.whatsapp_clicks");
  }

  const hasIsHidden = cols.some((c) => c.name === "is_hidden");
  if (!hasIsHidden) {
    db.exec("ALTER TABLE listings ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0");
    console.log("Migration: Added listings.is_hidden");
  }
} catch (e) {
  console.warn("Listings analytics migration check failed:", e);
}

try {
  const cols = db.prepare("PRAGMA table_info(listings)").all() as any[];
  const hasUpdatedAt = cols.some((c) => c.name === "updated_at");

  if (!hasUpdatedAt) {
    db.exec("ALTER TABLE listings ADD COLUMN updated_at DATETIME");
    db.exec("UPDATE listings SET updated_at = created_at WHERE updated_at IS NULL");
  }
} catch (e) {
  console.warn("Listings updated_at migration check failed:", e);
}

try {
  const cols = db.prepare("PRAGMA table_info(listings)").all() as any[];

  const hasQuantity = cols.some((c) => c.name === "quantity");
  if (!hasQuantity) {
    db.exec("ALTER TABLE listings ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1");
    console.log("Migration: Added listings.quantity");
  }

  const hasSoldQuantity = cols.some((c) => c.name === "sold_quantity");
  if (!hasSoldQuantity) {
    db.exec("ALTER TABLE listings ADD COLUMN sold_quantity INTEGER NOT NULL DEFAULT 0");
    console.log("Migration: Added listings.sold_quantity");
  }
} catch (e) {
  console.warn("Listings inventory migration check failed:", e);
}

try {
  const cols = db.prepare("PRAGMA table_info(listings)").all() as any[];

  const hasSubcategory = cols.some((c) => c.name === "subcategory");
  if (!hasSubcategory) {
    db.exec("ALTER TABLE listings ADD COLUMN subcategory TEXT");
    console.log("Migration: Added listings.subcategory");
  }

  const hasItemType = cols.some((c) => c.name === "item_type");
  if (!hasItemType) {
    db.exec("ALTER TABLE listings ADD COLUMN item_type TEXT");
    console.log("Migration: Added listings.item_type");
  }

  const hasSpecValues = cols.some((c) => c.name === "spec_values");
  if (!hasSpecValues) {
    db.exec("ALTER TABLE listings ADD COLUMN spec_values TEXT");
    console.log("Migration: Added listings.spec_values");
  }
} catch (e) {
  console.warn("Listings specs migration check failed:", e);
}

try {
  const cols = db.prepare("PRAGMA table_info(sellers)").all() as any[];

  const hasProfileViews = cols.some((c) => c.name === "profile_views");
  if (!hasProfileViews) {
    db.exec("ALTER TABLE sellers ADD COLUMN profile_views INTEGER NOT NULL DEFAULT 0");
    console.log("Migration: Added sellers.profile_views");
  }
} catch (e) {
  console.warn("Sellers analytics migration check failed:", e);
}

try {
  const cols = db.prepare("PRAGMA table_info(sellers)").all() as any[];
  const hasIsSuspended = cols.some((c) => c.name === "is_suspended");

  if (!hasIsSuspended) {
    db.exec("ALTER TABLE sellers ADD COLUMN is_suspended INTEGER NOT NULL DEFAULT 0");
    console.log("Migration: Added sellers.is_suspended");
  }
} catch (e) {
  console.warn("Sellers suspension migration check failed:", e);
}

try {
  const cols = db.prepare("PRAGMA table_info(reports)").all() as any[];

  const hasType = cols.some((c) => c.name === "type");
  if (!hasType) {
    db.exec("ALTER TABLE reports ADD COLUMN type TEXT NOT NULL DEFAULT 'listing'");
    console.log("Migration: Added reports.type");
  }

  const hasSubject = cols.some((c) => c.name === "subject");
  if (!hasSubject) {
    db.exec("ALTER TABLE reports ADD COLUMN subject TEXT");
    console.log("Migration: Added reports.subject");
  }

  const hasDetails = cols.some((c) => c.name === "details");
  if (!hasDetails) {
    db.exec("ALTER TABLE reports ADD COLUMN details TEXT");
    console.log("Migration: Added reports.details");
  }

  const hasReporterUid = cols.some((c) => c.name === "reporter_uid");
  if (!hasReporterUid) {
    db.exec("ALTER TABLE reports ADD COLUMN reporter_uid TEXT");
    console.log("Migration: Added reports.reporter_uid");
  }

  const hasReporterEmail = cols.some((c) => c.name === "reporter_email");
  if (!hasReporterEmail) {
    db.exec("ALTER TABLE reports ADD COLUMN reporter_email TEXT");
    console.log("Migration: Added reports.reporter_email");
  }

  const hasStatus = cols.some((c) => c.name === "status");
  if (!hasStatus) {
    db.exec("ALTER TABLE reports ADD COLUMN status TEXT NOT NULL DEFAULT 'open'");
    console.log("Migration: Added reports.status");
  }
} catch (e) {
  console.warn("Reports migration check failed:", e);
}
try {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_ratings_unique
    ON seller_ratings (seller_uid, rater_uid)
  `);
} catch (e) {
  console.warn("Seller ratings index setup failed:", e);
}

const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS ||
  process.env.VITE_ADMIN_EMAILS ||
  ""
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

if (ADMIN_EMAILS.length === 0) {
  console.warn(
    "Admin email list is empty. Set ADMIN_EMAILS (or VITE_ADMIN_EMAILS) to enable admin access."
  );
}

const ADMIN_UIDS = (
  process.env.ADMIN_UIDS ||
  process.env.VITE_ADMIN_UIDS ||
  ""
)
  .split(",")
  .map((uid) => uid.trim())
  .filter(Boolean);

function isAdminUser(identity?: { email?: string | null; uid?: string | null }) {
  const email = identity?.email ? String(identity.email).toLowerCase() : "";
  if (email && ADMIN_EMAILS.includes(email)) return true;

  const uid = identity?.uid ? String(identity.uid) : "";
  if (uid && ADMIN_UIDS.includes(uid)) return true;

  return false;
}

function hasAdminAccess(identity?: {
  email?: string | null;
  uid?: string | null;
  is_admin?: boolean;
}) {
  if (identity?.is_admin === true) return true;
  return isAdminUser(identity);
}

function logAdminAction({
  admin_uid,
  admin_email,
  action_type,
  target_type,
  target_id,
  details,
}: {
  admin_uid?: string | null;
  admin_email?: string | null;
  action_type: string;
  target_type: string;
  target_id?: string | null;
  details?: any;
}) {
  try {
    db.prepare(`
      INSERT INTO admin_actions (
        admin_uid,
        admin_email,
        action_type,
        target_type,
        target_id,
        details
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      admin_uid ?? null,
      admin_email ?? null,
      action_type,
      target_type,
      target_id ?? null,
      details ? JSON.stringify(details) : null
    );
  } catch (e) {
    console.warn("Failed to log admin action:", e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  registerVerificationEmailRoutes(app);

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // API Routes
  app.get("/api/upload", (req, res) => {
    res.json({ status: "ready", method: "POST required" });
  });

  app.post(["/api/upload", "/api/upload/"], (req, res, next) => {
    console.log("POST /api/upload - Multer starting");
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error("Multer error:", err);
        return res.status(400).json({ error: "File upload error", details: err.message });
      } else if (err) {
        console.error("Unknown upload error:", err);
        return res.status(500).json({ error: "Upload failed", details: err.message });
      }
      console.log("Multer finished - File:", req.file ? req.file.originalname : "None");
      next();
    });
  }, async (req, res) => {
    console.log("Upload handler starting...");
    try {
      if (!req.file) {
        console.log("No file in request after Multer");
        return res.status(400).json({ error: "No file uploaded" });
      }
      // ✅ MIME type validation (allow only images/videos)
    const mime = req.file.mimetype || "";
    const isAllowed = mime.startsWith("image/") || mime.startsWith("video/");
    if (!isAllowed) {
      return res.status(400).json({ error: "Unsupported file type" });
    }
      
      console.log("Cloudinary uploading...");
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        resource_type: "auto",
      });

      console.log("Cloudinary success:", result.secure_url);
      res.json({ url: result.secure_url });
    } catch (error) {
      console.error("Cloudinary/Handler error:", error);
      res.status(500).json({ 
        error: "Upload failed", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

type IncomingSpecFilters = Record<string, unknown>;
const SPEC_FILTER_KEY_PATTERN = /^[A-Za-z0-9_]+$/;

function parseSpecFilters(raw: unknown): Record<string, string | string[] | boolean> {
  if (typeof raw !== "string" || !raw.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as IncomingSpecFilters;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const safe: Record<string, string | string[] | boolean> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (!key || key.length > 120 || !SPEC_FILTER_KEY_PATTERN.test(key)) {
        continue;
      }

      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed) {
          safe[key] = trimmed;
        }
        continue;
      }

      if (typeof value === "boolean") {
        safe[key] = value;
        continue;
      }

      if (Array.isArray(value)) {
        const cleaned = value
          .filter((item) => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
          .slice(0, 25);

        if (cleaned.length > 0) {
          safe[key] = cleaned;
        }
      }
    }

    return safe;
  } catch {
    return {};
  }
}

  app.get("/api/listings", (req, res) => {
  const {
    category,
    university,
    search,
    sortBy,
    subcategory,
    itemType,
    minPrice,
    maxPrice,
    status,
    condition,
    hideSoldOut,
    page = "1",
    pageSize = "12",
    specFilters,
  } = req.query;

  let baseQuery = `
    FROM listings l
    JOIN sellers s ON l.seller_uid = s.uid
    WHERE l.is_hidden = 0
  `;

  const params: any[] = [];

  if (category && typeof category === "string") {
    baseQuery += " AND l.category = ?";
    params.push(category);
  }

  if (subcategory && typeof subcategory === "string") {
    baseQuery += " AND l.subcategory = ?";
    params.push(subcategory);
  }

  if (itemType && typeof itemType === "string") {
    baseQuery += " AND l.item_type = ?";
    params.push(itemType);
  }

  if (university && typeof university === "string") {
    baseQuery += " AND l.university = ?";
    params.push(university);
  }

  if (search && typeof search === "string") {
    baseQuery += " AND (l.name LIKE ? OR l.description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  if (condition && typeof condition === "string") {
    baseQuery += " AND l.condition = ?";
    params.push(condition);
  }

  const normalizedStatus = typeof status === "string" ? status.trim().toLowerCase() : "";
  const shouldFilterAvailable =
    normalizedStatus === "available" ||
    (!normalizedStatus && (hideSoldOut === "1" || hideSoldOut === "true"));

  if (normalizedStatus === "sold") {
    baseQuery += " AND (l.status = 'sold' OR l.sold_quantity >= l.quantity)";
  } else if (shouldFilterAvailable) {
    baseQuery += " AND (l.status != 'sold' AND l.sold_quantity < l.quantity)";
  }

  if (minPrice !== undefined && minPrice !== "" && !Number.isNaN(Number(minPrice))) {
    baseQuery += " AND l.price >= ?";
    params.push(Number(minPrice));
  }

  if (maxPrice !== undefined && maxPrice !== "" && !Number.isNaN(Number(maxPrice))) {
    baseQuery += " AND l.price <= ?";
    params.push(Number(maxPrice));
  }

  const safeSpecFilters = parseSpecFilters(specFilters);

  for (const [fieldKey, value] of Object.entries(safeSpecFilters)) {
    const jsonPath = `$.${fieldKey}`;

    if (typeof value === "string") {
      baseQuery += " AND json_extract(l.spec_values, ?) = ?";
      params.push(jsonPath, value);
      continue;
    }

    if (typeof value === "boolean") {
      baseQuery += " AND json_extract(l.spec_values, ?) = ?";
      params.push(jsonPath, value ? 1 : 0);
      continue;
    }

    if (Array.isArray(value) && value.length > 0) {
      const placeholders = value.map(() => "?").join(", ");
      baseQuery += ` AND EXISTS (
        SELECT 1
        FROM json_each(json_extract(l.spec_values, ?))
        WHERE json_each.value IN (${placeholders})
      )`;
      params.push(jsonPath, ...value);
    }
  }

  let orderBy =
    " ORDER BY CASE WHEN l.status = 'sold' OR l.sold_quantity >= l.quantity THEN 1 ELSE 0 END ASC, l.created_at DESC";
  if (sortBy === "price_asc") {
    orderBy =
      " ORDER BY CASE WHEN l.status = 'sold' OR l.sold_quantity >= l.quantity THEN 1 ELSE 0 END ASC, l.price ASC, l.created_at DESC";
  } else if (sortBy === "price_desc") {
    orderBy =
      " ORDER BY CASE WHEN l.status = 'sold' OR l.sold_quantity >= l.quantity THEN 1 ELSE 0 END ASC, l.price DESC, l.created_at DESC";
  } else if (sortBy === "popular") {
  orderBy =
    " ORDER BY CASE WHEN l.status = 'sold' OR l.sold_quantity >= l.quantity THEN 1 ELSE 0 END ASC, l.views_count DESC, l.created_at DESC";
  } else if (sortBy === "oldest") {
    orderBy =
      " ORDER BY CASE WHEN l.status = 'sold' OR l.sold_quantity >= l.quantity THEN 1 ELSE 0 END ASC, l.created_at ASC";
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Math.min(48, Number(pageSize) || 12));
  const offset = (safePage - 1) * safePageSize;

  try {
    const totalRow = db
      .prepare(`SELECT COUNT(*) as total ${baseQuery}`)
      .get(...params) as { total: number };

    const rows = db
      .prepare(`
        SELECT l.*, s.business_name, s.business_logo, s.is_verified
        ${baseQuery}
        ${orderBy}
        LIMIT ? OFFSET ?
      `)
      .all(...params, safePageSize, offset);

    const total = totalRow?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));

    res.json({
      items: rows.map((l: any) => ({
        ...l,
        photos: JSON.parse(l.photos || "[]"),
        spec_values: JSON.parse(l.spec_values || "{}"),
      })),
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
    });
  } catch (error) {
    console.error("Fetch listings error:", error);
    res.status(500).json({ error: "Failed to load listings" });
  }
});

  app.get("/api/listings/:id", (req, res) => {
    const listingId = Number(req.params.id);
    if (!Number.isInteger(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    try {
      const row = db
        .prepare(`
          SELECT l.*, s.business_name, s.business_logo, s.is_verified
          FROM listings l
          JOIN sellers s ON l.seller_uid = s.uid
          WHERE l.id = ? AND l.is_hidden = 0
          LIMIT 1
        `)
        .get(listingId) as any;

      if (!row) {
        return res.status(404).json({ error: "Listing not found" });
      }

      res.json({
        ...row,
        photos: JSON.parse(row.photos || "[]"),
        spec_values: JSON.parse(row.spec_values || "{}"),
      });
    } catch (error) {
      console.error("Fetch listing by id error:", error);
      res.status(500).json({ error: "Failed to load listing" });
    }
  });

  app.get("/api/listings/:id/related", (req, res) => {
    const listingId = Number(req.params.id);
    const requestedLimit = Number(req.query.limit);
    const parsedLimit = Number.isInteger(requestedLimit) ? requestedLimit : 5;
    const limit = Math.max(1, Math.min(12, parsedLimit));

    if (!Number.isInteger(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    try {
      const currentListing = db
        .prepare(`
          SELECT id, category, subcategory, item_type, university
          FROM listings
          WHERE id = ? AND is_hidden = 0
          LIMIT 1
        `)
        .get(listingId) as
        | {
            id: number;
            category: string;
            subcategory: string | null;
            item_type: string | null;
            university: string;
          }
        | undefined;

      if (!currentListing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      const rows = db
        .prepare(`
          SELECT l.*, s.business_name, s.business_logo, s.is_verified
          FROM listings l
          JOIN sellers s ON l.seller_uid = s.uid
          WHERE l.is_hidden = 0
            AND l.id != ?
            AND l.category = ?
            AND l.university = ?
          ORDER BY
            CASE WHEN l.subcategory = ? THEN 0 ELSE 1 END ASC,
            CASE WHEN l.item_type = ? THEN 0 ELSE 1 END ASC,
            CASE WHEN l.status = 'sold' OR l.sold_quantity >= l.quantity THEN 1 ELSE 0 END ASC,
            l.created_at DESC
          LIMIT ?
        `)
        .all(
          listingId,
          currentListing.category,
          currentListing.university,
          currentListing.subcategory,
          currentListing.item_type,
          limit
        );

      res.json(
        rows.map((l: any) => ({
          ...l,
          photos: JSON.parse(l.photos || "[]"),
          spec_values: JSON.parse(l.spec_values || "{}"),
        }))
      );
    } catch (error) {
      console.error("Fetch related listings error:", error);
      res.status(500).json({ error: "Failed to load related listings" });
    }
  });
  
  app.post("/api/sellers", requireAuth, (req, res) => {
    const uid = req.user!.uid; // secure UID from Firebase
const {
  email,
  business_name,
  university,
  bio,
  whatsapp_number,
  is_verified,
  is_seller
} = req.body;
    try {
  // Convert incoming boolean to 0/1 safely
const incomingVerified = (req.user as any).email_verified || is_verified ? 1 : 0;
const incomingSeller = is_seller === true || is_seller === 1 ? 1 : 0;

const safeBusinessName = typeof business_name === "string" && business_name.trim() ? business_name.trim() : null;
const safeUniversity = typeof university === "string" && university.trim() ? university.trim() : null;
const safeBio = typeof bio === "string" && bio.trim() ? bio.trim() : null;
const safeWhatsapp = typeof whatsapp_number === "string" && whatsapp_number.trim() ? whatsapp_number.trim() : null;
      
db.prepare(`
  INSERT INTO sellers (uid, email, business_name, university, bio, whatsapp_number, is_verified, is_seller)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(uid) DO UPDATE SET
    email = excluded.email,
    business_name = excluded.business_name,
    university = excluded.university,
    whatsapp_number = excluded.whatsapp_number,
    is_seller = excluded.is_seller,
    bio = excluded.bio,
    -- important: only allow upgrading to verified, never downgrade
    is_verified = CASE
      WHEN excluded.is_verified = 1 THEN 1
      ELSE sellers.is_verified
    END
`).run(
  uid,
  email,
  safeBusinessName,
  safeUniversity,
  safeBio,
  safeWhatsapp,
  incomingVerified,
  incomingSeller
);
  res.json({ success: true });
} catch (error) {
  console.error("Seller sync error:", error);
  res.status(500).json({ error: "Failed to sync seller profile" });
}
  });

  app.post("/api/profile/bootstrap", requireAuth, async (req, res) => {
    const uid = req.user!.uid;
    const email = req.user?.email || req.body?.email || "";
    const requestedUniversity =
      typeof req.body?.university === "string" ? req.body.university.trim() : "";
    const safeUniversity = requestedUniversity || "University Not Set";
    const nowIso = new Date().toISOString();
    const hasExistingListings = !!db
      .prepare(
        `
          SELECT 1
          FROM listings
          WHERE seller_uid = ?
          LIMIT 1
        `
      )
      .get(uid);

    const existingSellerRow = db
      .prepare(
        `
          SELECT is_seller
          FROM sellers
          WHERE uid = ?
          LIMIT 1
        `
      )
      .get(uid) as { is_seller?: number } | undefined;

    const hasApprovedApplication = !!db
      .prepare(
        `
          SELECT 1
          FROM seller_applications
          WHERE applicant_uid = ?
            AND status = 'approved'
          LIMIT 1
        `
      )
      .get(uid);

    const recoveredIsSeller =
      existingSellerRow?.is_seller === 1 || hasExistingListings || hasApprovedApplication;

    const fallbackProfile = {
      uid,
      email,
      university: safeUniversity,
      is_verified: !!req.user?.email_verified,
      is_seller: recoveredIsSeller,
      join_date: nowIso,
    };

    try {
      db.prepare(
        `
          INSERT INTO sellers (
            uid, email, business_name, university, bio, whatsapp_number, is_verified, is_seller, join_date
          ) VALUES (?, ?, NULL, ?, NULL, NULL, ?, ?, ?)
          ON CONFLICT(uid) DO UPDATE SET
            email = excluded.email,
            university = COALESCE(sellers.university, excluded.university),
            is_seller = CASE
              WHEN sellers.is_seller = 1 THEN 1
              WHEN excluded.is_seller = 1 THEN 1
              ELSE 0
            END,
            is_verified = CASE
              WHEN excluded.is_verified = 1 THEN 1
              ELSE sellers.is_verified
            END
        `
      ).run(
        uid,
        email,
        safeUniversity,
        req.user?.email_verified ? 1 : 0,
        recoveredIsSeller ? 1 : 0,
        nowIso
      );

      const adminApp = getFirebaseAdmin();
      await adminApp.firestore().collection("users").doc(uid).set(fallbackProfile, {
        merge: true,
      });

      return res.json({ ok: true, profile: fallbackProfile });
    } catch (error) {
      console.error("Profile bootstrap failed:", error);
      return res.status(500).json({ error: "Failed to bootstrap profile" });
    }
  });

  app.get("/api/profile", requireAuth, (req, res) => {
    const uid = req.user!.uid;
    try {
      const profile = db
        .prepare(
          "SELECT uid, email, business_name, business_logo, profile_picture, university, bio, whatsapp_number, is_verified, is_seller, join_date FROM sellers WHERE uid = ?"
        )
        .get(uid);
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json(profile);
    } catch (e: any) {
      console.error("GET /api/profile error:", e);
      res.status(500).json({ error: "Failed to load profile" });
    }
  });

  app.put("/api/profile", requireAuth, async (req, res) => {
  const uid = req.user!.uid;
  const { business_name, business_logo, university, bio, whatsapp_number } = req.body;

  if (!business_name || typeof business_name !== "string") {
    return res.status(400).json({ error: "business_name is required" });
  }

  if (!university || typeof university !== "string") {
    return res.status(400).json({ error: "university is required" });
  }

  try {
    const existing = db
      .prepare("SELECT uid FROM sellers WHERE uid = ?")
      .get(uid) as { uid: string } | undefined;

    if (!existing) {
      return res.status(404).json({ error: "Seller profile not found" });
    }

    const safeLogoUrl = typeof business_logo === "string" && business_logo.trim() ? business_logo.trim() : null;

    db.prepare(`
      UPDATE sellers
      SET business_name = ?, business_logo = ?, university = ?, bio = ?, whatsapp_number = ?
      WHERE uid = ?
    `).run(
      business_name,
      safeLogoUrl,
      university,
      bio ?? null,
      whatsapp_number ?? null,
      uid
    );

    // Sync profile fields to Firestore via Admin SDK (bypasses client-side security rules)
    try {
      const adminApp = getFirebaseAdmin();
      await adminApp.firestore().collection("users").doc(uid).set({
        business_name,
        business_logo: safeLogoUrl,
        university,
        bio: bio ?? null,
        whatsapp_number: whatsapp_number ?? null,
      }, { merge: true });
    } catch (firestoreSyncError) {
      console.warn("Failed to sync profile update to Firestore:", firestoreSyncError);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.put("/api/account", requireAuth, async (req, res) => {
  const uid = req.user!.uid;
  const { university, profile_picture } = req.body;

  if (!university || typeof university !== "string") {
    return res.status(400).json({ error: "university is required" });
  }

  try {
    const existing = db
      .prepare("SELECT uid FROM sellers WHERE uid = ?")
      .get(uid) as { uid: string } | undefined;

    if (!existing) {
      return res.status(404).json({ error: "Account not found" });
    }

    const safePicture = typeof profile_picture === "string" && profile_picture.trim() ? profile_picture.trim() : null;

    db.prepare(`
      UPDATE sellers
      SET university = ?, profile_picture = ?
      WHERE uid = ?
    `).run(university, safePicture, uid);

    try {
      const adminApp = getFirebaseAdmin();
      await adminApp.firestore().collection("users").doc(uid).set({
        university,
        profile_picture: safePicture,
      }, { merge: true });
    } catch (firestoreSyncError) {
      console.warn("Failed to sync account update to Firestore:", firestoreSyncError);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Account update error:", error);
    res.status(500).json({ error: "Failed to update account" });
  }
});

app.get("/api/profile/seller-application", requireAuth, (req, res) => {
  const uid = req.user!.uid;

  try {
    const latestApplication = db.prepare(`
      SELECT id, status, created_at, updated_at, reviewed_at, review_notes
      FROM seller_applications
      WHERE applicant_uid = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(uid);

    res.json(latestApplication || null);
  } catch (error) {
    console.error("Get seller application error:", error);
    res.status(500).json({ error: "Failed to load seller application status" });
  }
});

 app.post("/api/profile/become-seller", requireAuth, (req, res) => {
  const uid = req.user!.uid;
  const email = (req.user as any)?.email || null;
  const {
    full_legal_name,
    institution,
    applicant_type,
    institution_id_number,
    whatsapp_number,
    business_name,
    what_to_sell,
    business_description,
    reason_for_applying,
    proof_document_url,
    agreed_to_rules,
  } = req.body;

  if (!full_legal_name || typeof full_legal_name !== "string") {
    return res.status(400).json({ error: "full_legal_name is required" });
  }

  if (!institution || typeof institution !== "string") {
    return res.status(400).json({ error: "institution is required" });
  }

  if (!applicant_type || typeof applicant_type !== "string") {
    return res.status(400).json({ error: "applicant_type is required" });
  }

  if (!["student", "staff", "registered_business"].includes(applicant_type)) {
    return res.status(400).json({ error: "Invalid applicant_type" });
  }

  if (!institution_id_number || typeof institution_id_number !== "string") {
    return res.status(400).json({ error: "institution_id_number is required" });
  }

  if (!whatsapp_number || typeof whatsapp_number !== "string") {
    return res.status(400).json({ error: "whatsapp_number is required" });
  }

  if (!business_name || typeof business_name !== "string") {
    return res.status(400).json({ error: "business_name is required" });
  }

  if (!what_to_sell || typeof what_to_sell !== "string") {
    return res.status(400).json({ error: "what_to_sell is required" });
  }

  if (!business_description || typeof business_description !== "string") {
    return res.status(400).json({ error: "business_description is required" });
  }

  if (!reason_for_applying || typeof reason_for_applying !== "string") {
    return res.status(400).json({ error: "reason_for_applying is required" });
  }

  if (!proof_document_url || typeof proof_document_url !== "string") {
    return res.status(400).json({ error: "proof_document_url is required" });
  }

  if (agreed_to_rules !== true && agreed_to_rules !== 1) {
    return res.status(400).json({ error: "You must agree to seller rules and prohibited-items policy" });
  }

  try {
    const existing = db.prepare(`
      SELECT id
      FROM seller_applications
      WHERE applicant_uid = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(uid) as { id: number } | undefined;

    if (existing) {
      db.prepare(`
        UPDATE seller_applications
        SET
          applicant_email = ?,
          full_legal_name = ?,
          institution = ?,
          applicant_type = ?,
          institution_id_number = ?,
          whatsapp_number = ?,
          business_name = ?,
          what_to_sell = ?,
          business_description = ?,
          reason_for_applying = ?,
          proof_document_url = ?,
          agreed_to_rules = 1,
          status = 'pending',
          reviewed_by_uid = NULL,
          review_notes = NULL,
          reviewed_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        email,
        full_legal_name.trim(),
        institution.trim(),
        applicant_type,
        institution_id_number.trim(),
        whatsapp_number.trim(),
        business_name.trim(),
        what_to_sell.trim(),
        business_description.trim(),
        reason_for_applying.trim(),
        proof_document_url.trim(),
        existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO seller_applications (
          applicant_uid,
          applicant_email,
          full_legal_name,
          institution,
          applicant_type,
          institution_id_number,
          whatsapp_number,
          business_name,
          what_to_sell,
          business_description,
          reason_for_applying,
          proof_document_url,
          agreed_to_rules,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending')
      `).run(
        uid,
        email,
        full_legal_name.trim(),
        institution.trim(),
        applicant_type,
        institution_id_number.trim(),
        whatsapp_number.trim(),
        business_name.trim(),
        what_to_sell.trim(),
        business_description.trim(),
        reason_for_applying.trim(),
        proof_document_url.trim()
      );
    }

    const latestApplication = db.prepare(`
      SELECT id, status, created_at, updated_at
      FROM seller_applications
      WHERE applicant_uid = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(uid);

    const seller = db.prepare("SELECT is_seller FROM sellers WHERE uid = ?").get(uid) as { is_seller?: number } | undefined;
    if (!seller) {
      db.prepare(`
        INSERT INTO sellers (uid, email, is_verified, is_seller)
        VALUES (?, ?, ?, 0)
      `).run(uid, email, (req.user as any)?.email_verified ? 1 : 0);
    }

    res.json({
      success: true,
      application: latestApplication,
      message: "Application submitted and pending review",
    });
  } catch (error) {
    console.error("Become seller error:", error);
    res.status(500).json({ error: "Failed to submit seller application" });
  }
});

  app.post("/api/listings", requireAuth, (req, res) => {
  // ✅ seller_uid MUST come from verified token
  const seller_uid = req.user!.uid;
  const v = db
  .prepare("SELECT is_verified, is_seller, is_suspended FROM sellers WHERE uid = ?")
  .get(seller_uid) as { is_verified?: number; is_seller?: number; is_suspended?: number } | undefined;

if (!v) {
  return res.status(404).json({ error: "Seller profile not found" });
}
if (v.is_seller !== 1) {
  return res.status(403).json({ error: "Seller account required" });
}
if (v.is_verified !== 1) {
  return res.status(403).json({ error: "Account not verified" });
}
if (v.is_suspended === 1) {
  return res.status(403).json({ error: "Seller account is suspended" });
}
  const {
    name,
    price,
    description,
    category,
    subcategory,
    item_type,
    spec_values,
    university,
    photos,
    video_url,
    whatsapp_number,
    status,
    condition,
    quantity,
    sold_quantity,
  } = req.body;
  const allowedConditions = ["new", "used", "refurbished"];
const safeCondition = allowedConditions.includes(condition) ? condition : "used";
const safeName = typeof name === "string" ? name.trim() : "";
const safeCategory = typeof category === "string" ? category.trim() : "";
const safeUniversity = typeof university === "string" ? university.trim() : "";
const safeWhatsappNumber =
  typeof whatsapp_number === "string" ? whatsapp_number.trim() : "";
const numericPrice = Number(price);
  
    // ✅ Validate photos + video
const safePhotos = Array.isArray(photos) ? photos.filter((x) => typeof x === "string") : [];
if (safePhotos.length < 1) {
  return res.status(400).json({ error: "At least 1 photo is required" });
}
if (safePhotos.length > 5) {
  return res.status(400).json({ error: "Max 5 photos allowed" });
}

const safeVideoUrl =
  video_url && typeof video_url === "string" && video_url.trim().length > 0
    ? video_url.trim()
    : null;

const safeStatus = status === "sold" ? "sold" : "available";
const safeQuantity = Math.max(1, Number(quantity) || 1);
const safeSoldQuantity = Math.max(0, Math.min(safeQuantity, Number(sold_quantity) || 0));
const safeSubcategory =
  typeof subcategory === "string" && subcategory.trim().length > 0
    ? subcategory.trim()
    : null;

const safeItemType =
  typeof item_type === "string" && item_type.trim().length > 0
    ? item_type.trim()
    : null;

const safeSpecValues =
  spec_values && typeof spec_values === "object" && !Array.isArray(spec_values)
    ? JSON.stringify(spec_values)
    : JSON.stringify({});

if (!isMeaningfulTitle(safeName)) {
  return res.status(400).json({ error: "Title is missing or not meaningful" });
}

if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
  return res.status(400).json({ error: "price must be greater than 0" });
}

if (!safeCategory) {
  return res.status(400).json({ error: "category is required" });
}

if (!safeUniversity) {
  return res.status(400).json({ error: "university is required" });
}

if (!safeWhatsappNumber) {
  return res.status(400).json({ error: "whatsapp_number is required" });
}

if (!isValidListingHierarchy(safeCategory, safeSubcategory, safeItemType)) {
  return res.status(400).json({ error: "category/subcategory/item_type mismatch" });
}

  try {
    const info = db.prepare(`
      INSERT INTO listings (
        seller_uid, name, price, description, category, subcategory, item_type, spec_values, university,
        photos, video_url, whatsapp_number, status, condition,
        quantity, sold_quantity, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`).run(
  seller_uid,
  safeName,
  numericPrice,
  description,
  safeCategory,
  safeSubcategory,
  safeItemType,
  safeSpecValues,
  safeUniversity,
  JSON.stringify(safePhotos),
  safeVideoUrl,
  safeWhatsappNumber,
  safeStatus,
  safeCondition,
  safeQuantity,
  safeSoldQuantity
);

    res.json({ id: info.lastInsertRowid });
  } catch (error) {
    console.error("Listing error:", error);
    res.status(500).json({ error: "Failed to create listing" });
  }
});

  // ✅ Public seller profile by uid
app.get("/api/users/:uid", (req, res) => {
  const { uid } = req.params;

  try {
    const seller = db
      .prepare(
        "SELECT uid, business_name, business_logo, university, bio, is_verified, is_seller, join_date FROM sellers WHERE uid = ?"
      )
      .get(uid);

    if (!seller) return res.status(404).json({ error: "User not found" });

    res.json(seller);
  } catch (e: any) {
    console.error("GET /api/users/:uid error:", e);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// ✅ Public listings for a seller
app.get("/api/users/:uid/listings", (req, res) => {
  const { uid } = req.params;

  try {
    const rows = db
      .prepare(`
        SELECT l.*, s.business_name, s.business_logo, s.is_verified
        FROM listings l
        JOIN sellers s ON l.seller_uid = s.uid
        WHERE l.seller_uid = ? AND l.is_hidden = 0
        ORDER BY l.created_at DESC
      `)
      .all(uid);

    res.json(
      rows.map((l: any) => ({
        ...l,
        photos: JSON.parse(l.photos || "[]"),
        spec_values: JSON.parse(l.spec_values || "{}"),
      }))
    );
  } catch (e: any) {
    console.error("GET /api/users/:uid/listings error:", e);
    res.status(500).json({ error: "Failed to load user listings" });
  }
});

app.get("/api/users/:uid/rating-summary", requireAuth, (req, res) => {
  const { uid } = req.params;
  const rater_uid = req.user!.uid;

  try {
    const seller = db
      .prepare("SELECT uid FROM sellers WHERE uid = ?")
      .get(uid) as { uid: string } | undefined;

    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }

    const summary = db
      .prepare(`
        SELECT 
          COUNT(*) as ratingCount,
          ROUND(AVG(stars), 1) as averageRating
        FROM seller_ratings
        WHERE seller_uid = ?
      `)
      .get(uid) as { ratingCount: number; averageRating: number | null };

    const mine = db
      .prepare(`
        SELECT stars
        FROM seller_ratings
        WHERE seller_uid = ? AND rater_uid = ?
      `)
      .get(uid, rater_uid) as { stars: number } | undefined;

    const rows = db
      .prepare(
        `
          SELECT stars, COUNT(*) as count
          FROM seller_ratings
          WHERE seller_uid = ?
          GROUP BY stars
        `
      )
      .all(uid) as Array<{ stars: number; count: number }>;

    const distribution = [5, 4, 3, 2, 1].map((star) => {
      const match = rows.find((row) => row.stars === star);
      const count = match?.count ?? 0;
      const ratingCount = summary?.ratingCount ?? 0;
      const percentage = ratingCount > 0 ? Math.round((count / ratingCount) * 100) : 0;
      return { stars: star, count, percentage };
    });

    return res.json({
      averageRating: summary?.averageRating ?? 0,
      ratingCount: summary?.ratingCount ?? 0,
      myRating: mine?.stars ?? null,
      distribution,
    });
  } catch (e: any) {
    console.error("GET /api/users/:uid/rating-summary error:", e);
    return res.status(500).json({ error: "Failed to load rating summary" });
  }
});

app.post("/api/users/:uid/rating", requireAuth, (req, res) => {
  const seller_uid = req.params.uid;
  const rater_uid = req.user!.uid;
  const { stars } = req.body;

  const safeStars = Number(stars);

  if (!Number.isInteger(safeStars) || safeStars < 1 || safeStars > 5) {
    return res.status(400).json({ error: "stars must be an integer from 1 to 5" });
  }

  if (seller_uid === rater_uid) {
    return res.status(400).json({ error: "You cannot rate yourself" });
  }

  try {
    const seller = db
      .prepare("SELECT uid FROM sellers WHERE uid = ?")
      .get(seller_uid) as { uid: string } | undefined;

    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }

    db.prepare(`
      INSERT INTO seller_ratings (seller_uid, rater_uid, stars)
      VALUES (?, ?, ?)
      ON CONFLICT(seller_uid, rater_uid)
      DO UPDATE SET
        stars = excluded.stars,
        updated_at = CURRENT_TIMESTAMP
    `).run(seller_uid, rater_uid, safeStars);

    const summary = db
      .prepare(`
        SELECT 
          COUNT(*) as ratingCount,
          ROUND(AVG(stars), 1) as averageRating
        FROM seller_ratings
        WHERE seller_uid = ?
      `)
      .get(seller_uid) as { ratingCount: number; averageRating: number | null };

    return res.json({
      success: true,
      averageRating: summary?.averageRating ?? 0,
      ratingCount: summary?.ratingCount ?? 0,
      myRating: safeStars,
    });
  } catch (e: any) {
    console.error("POST /api/users/:uid/rating error:", e);
    return res.status(500).json({ error: "Failed to save rating" });
  }
});

app.delete("/api/users/:uid/rating", requireAuth, (req, res) => {
  const seller_uid = req.params.uid;
  const rater_uid = req.user!.uid;

  try {
    const seller = db
      .prepare("SELECT uid FROM sellers WHERE uid = ?")
      .get(seller_uid) as { uid: string } | undefined;

    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }

    db.prepare(`
      DELETE FROM seller_ratings
      WHERE seller_uid = ? AND rater_uid = ?
    `).run(seller_uid, rater_uid);

    const summary = db
      .prepare(`
        SELECT 
          COUNT(*) as ratingCount,
          ROUND(AVG(stars), 1) as averageRating
        FROM seller_ratings
        WHERE seller_uid = ?
      `)
      .get(seller_uid) as { ratingCount: number; averageRating: number | null };

    return res.json({
      success: true,
      averageRating: summary?.averageRating ?? 0,
      ratingCount: summary?.ratingCount ?? 0,
      myRating: null,
    });
  } catch (e: any) {
    console.error("DELETE /api/users/:uid/rating error:", e);
    return res.status(500).json({ error: "Failed to remove rating" });
  }
});
  
  app.delete("/api/listings/:id", requireAuth, async (req, res) => {
  const uid = req.user!.uid;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  try {
    // Load listing row: seller_uid, photos, video_url
    const listing = db
      .prepare("SELECT id, seller_uid, photos, video_url FROM listings WHERE id = ?")
      .get(id) as { id: number; seller_uid: string; photos?: string | null; video_url?: string | null } | undefined;

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Ownership check (keep exactly as before)
    if (listing.seller_uid !== uid) {
      return res.status(403).json({ error: "Forbidden: not your listing" });
    }

    // Parse photos JSON safely + add video_url if present
    const mediaUrls: string[] = [];
    try {
      const arr = JSON.parse(listing.photos || "[]");
      if (Array.isArray(arr)) {
        mediaUrls.push(...arr.filter((x) => typeof x === "string"));
      }
    } catch (e) {
      console.warn("Failed to parse photos JSON for listing", id, e);
    }

    if (listing.video_url && typeof listing.video_url === "string" && listing.video_url.trim().length > 0) {
      mediaUrls.push(listing.video_url);
    }

    // Convert URLs to public_ids using existing cloudinaryPublicIdFromUrl helper
    const publicIds = Array.from(
      new Set(
        mediaUrls
          .map((u) => (typeof u === "string" ? cloudinaryPublicIdFromUrl(u) : null))
          .filter((x): x is string => Boolean(x))
      )
    );

    // Delete each public_id as both image and video resource_type (best-effort)
    const cloudinaryResults: any[] = [];
for (const pid of publicIds) {
  try {
    let r = await cloudinary.uploader.destroy(pid, { resource_type: "image" });

    if (r?.result === "not found") {
      r = await cloudinary.uploader.destroy(pid, { resource_type: "video" });
    }
    cloudinaryResults.push({ public_id: pid, result: r });
  } catch (e: any) {
    cloudinaryResults.push({ public_id: pid, error: e?.message || String(e) });
  }
}

    // Log Cloudinary results for server-side debugging (do not include in API response)
    if (cloudinaryResults.length > 0) {
      console.info("Cloudinary deletion results for listing", id, cloudinaryResults);
    }

    // Delete reports for that listing id (optional) then delete the listing row
    try {
      db.prepare("DELETE FROM reports WHERE listing_id = ?").run(id);
    } catch (e) {
      console.warn("Failed to delete reports for listing", id, e);
    }

    db.prepare("DELETE FROM listings WHERE id = ?").run(id);

    // Respond with minimal payload only
    return res.json({ success: true, deletedAssets: publicIds.length });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ error: "Failed to delete listing" });
  }
});


  app.put("/api/listings/:id", requireAuth, (req, res) => {
  const uid = req.user!.uid;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }
    
  const v = db
  .prepare("SELECT is_verified, is_seller, is_suspended FROM sellers WHERE uid = ?")
  .get(uid) as { is_verified?: number; is_seller?: number; is_suspended?: number } | undefined;

if (!v) {
  return res.status(404).json({ error: "Seller profile not found" });
}
if (v.is_seller !== 1) {
  return res.status(403).json({ error: "Seller account required" });
}
if (v.is_verified !== 1) {
  return res.status(403).json({ error: "Account not verified" });
}
if (v.is_suspended === 1) {
  return res.status(403).json({ error: "Seller account is suspended" });
}

    const {
      name,
      price,
      description,
      category,
      subcategory,
      item_type,
      spec_values,
      university,
      photos,
      video_url,
      whatsapp_number,
      status,
      condition,
      quantity,
      sold_quantity,
    } = req.body;
    const allowedConditions = ["new", "used", "refurbished"];
    const safeCondition = allowedConditions.includes(condition) ? condition : "used";
    const safeName = typeof name === "string" ? name.trim() : "";
    const safeCategory = typeof category === "string" ? category.trim() : "";
    const safeUniversity = typeof university === "string" ? university.trim() : "";
    const safeWhatsappNumber =
      typeof whatsapp_number === "string" ? whatsapp_number.trim() : "";
    const numericPrice = Number(price);
    const safePhotos = Array.isArray(photos) ? photos.filter((x) => typeof x === "string") : [];
if (safePhotos.length < 1) {
  return res.status(400).json({ error: "At least 1 photo is required" });
}
if (safePhotos.length > 5) {
  return res.status(400).json({ error: "Max 5 photos allowed" });
}

const safeVideoUrl =
  video_url && typeof video_url === "string" && video_url.trim().length > 0
    ? video_url.trim()
    : null;

const safeStatus = status === "sold" ? "sold" : "available";
const safeQuantity = Math.max(1, Number(quantity) || 1);
const safeSoldQuantity = Math.max(0, Math.min(safeQuantity, Number(sold_quantity) || 0));
const safeSubcategory =
  typeof subcategory === "string" && subcategory.trim().length > 0
    ? subcategory.trim()
    : null;

const safeItemType =
  typeof item_type === "string" && item_type.trim().length > 0
    ? item_type.trim()
    : null;

const safeSpecValues =
  spec_values && typeof spec_values === "object" && !Array.isArray(spec_values)
    ? JSON.stringify(spec_values)
    : JSON.stringify({});
    
  // Minimal validation
  if (!isMeaningfulTitle(safeName)) {
    return res.status(400).json({ error: "Title is missing or not meaningful" });
  }

  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({ error: "price must be greater than 0" });
  }

  if (!safeCategory) {
    return res.status(400).json({ error: "category is required" });
  }

  if (!safeUniversity) {
    return res.status(400).json({ error: "university is required" });
  }

  if (!safeWhatsappNumber) {
    return res.status(400).json({ error: "whatsapp_number is required" });
  }

  if (!isValidListingHierarchy(safeCategory, safeSubcategory, safeItemType)) {
    return res.status(400).json({ error: "category/subcategory/item_type mismatch" });
  }

  try {
    const listing = db.prepare(
      "SELECT id, seller_uid FROM listings WHERE id = ?"
    ).get(id) as { id: number; seller_uid: string } | undefined;

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // 🔐 Ownership enforcement
    if (listing.seller_uid !== uid) {
      return res.status(403).json({ error: "Forbidden: not your listing" });
    }

    db.prepare(`
      UPDATE listings
      SET
        name = ?,
        price = ?,
        description = ?,
        category = ?,
        subcategory = ?,
        item_type = ?,
        spec_values = ?,
        university = ?,
        photos = ?,
        video_url = ?,
        whatsapp_number = ?,
        status = ?,
        condition = ?,
        quantity = ?,
        sold_quantity = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      safeName,
      numericPrice,
      description ?? null,
      safeCategory,
      safeSubcategory,
      safeItemType,
      safeSpecValues,
      safeUniversity,
      JSON.stringify(safePhotos),
      safeVideoUrl,
      safeWhatsappNumber,
      safeStatus,
      safeCondition,
      safeQuantity,
      safeSoldQuantity,
      id
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Failed to update listing" });
  }
});
app.patch("/api/listings/:id/status", requireAuth, (req, res) => {
  const uid = req.user!.uid;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid listing id" });

  const { status } = req.body;
  const safeStatus = status === "sold" ? "sold" : "available";

  try {
    const listing = db
      .prepare("SELECT id, seller_uid FROM listings WHERE id = ?")
      .get(id) as { id: number; seller_uid: string } | undefined;

    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.seller_uid !== uid) return res.status(403).json({ error: "Forbidden: not your listing" });

    db.prepare("UPDATE listings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(safeStatus, id);

    res.json({ success: true, status: safeStatus });
  } catch (error) {
    console.error("PATCH /api/listings/:id/status error:", error);
    res.status(500).json({ error: "Failed to update listing status" });
  }
});

// --- helper: get Cloudinary public_id from a Cloudinary URL ---
function cloudinaryPublicIdFromUrl(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    const parts = u.pathname.split("/").filter(Boolean);

    // Find the "upload" segment
    const uploadIndex = parts.findIndex(p => p === "upload");
    if (uploadIndex === -1) return null;

    // Everything after "upload"
    let after = parts.slice(uploadIndex + 1);

    // Remove transformations (they contain commas/underscores like c_fill,w_400)
    // Keep skipping until we reach either v123 or the actual folder/file
    while (after.length && !/^v\d+$/.test(after[0]) && after[0].includes(",")) {
      after = after.slice(1);
    }

    // Drop version segment if present
    if (after.length && /^v\d+$/.test(after[0])) after = after.slice(1);

    if (!after.length) return null;

    // Last part is filename.ext
    const filename = after[after.length - 1];
    const dot = filename.lastIndexOf(".");
    if (dot === -1) return null;

    // Replace last segment with filename without extension
    after[after.length - 1] = filename.slice(0, dot);

    // public_id is the remaining path
    return after.join("/");
  } catch {
    return null;
  }
}

// ✅ Delete profile + all listings + all Cloudinary images
app.delete(
  "/api/profile",
  (req, _res, next) => {
    console.log("🔥 DELETE /api/profile request received");
    next();
  },
  requireAuth,
  async (req, res) => {
    console.log("🔥 PROFILE DELETE ROUTE HIT (after auth)");

    const uid = req.user!.uid;

    try {
      // 1) Load seller logo + listings
      const seller = db
        .prepare("SELECT business_logo, profile_picture FROM sellers WHERE uid = ?")
        .get(uid) as { business_logo?: string | null; profile_picture?: string | null } | undefined;

      const listings = db
  .prepare("SELECT id, photos, video_url FROM listings WHERE seller_uid = ?")
  .all(uid) as { id: number; photos: string | null; video_url?: string | null }[];

const listingIds = listings.map((l) => l.id);

// 2) Collect media URLs (photos + video + seller logo)
const photoUrls: string[] = [];
for (const l of listings) {
  // photos
  try {
    const arr = JSON.parse(l.photos || "[]");
    if (Array.isArray(arr)) photoUrls.push(...arr);
  } catch {}

  // video
  if (l.video_url && typeof l.video_url === "string") {
    photoUrls.push(l.video_url);
  }
}

if (seller?.business_logo) {
  photoUrls.push(seller.business_logo);
}

if (seller?.profile_picture) {
  photoUrls.push(seller.profile_picture);
}

      // 3) Convert to Cloudinary public_ids
      const publicIds = Array.from(
        new Set(
          photoUrls
            .map(u => (typeof u === "string" ? cloudinaryPublicIdFromUrl(u) : null))
            .filter((x): x is string => Boolean(x))
        )
      );

      // 4) Delete images from Cloudinary
      const cloudinaryResults: any[] = [];
      for (const pid of publicIds) {
  // Try delete as image
  try {
    const rImg = await cloudinary.uploader.destroy(pid, { resource_type: "image" });
    cloudinaryResults.push({ public_id: pid, type: "image", result: rImg });
   } catch (e: any) {
    cloudinaryResults.push({ public_id: pid, type: "image", error: e?.message || String(e) });
      }

  // Try delete as video
  try {
    const rVid = await cloudinary.uploader.destroy(pid, { resource_type: "video" });
    cloudinaryResults.push({ public_id: pid, type: "video", result: rVid });
      } catch (e: any) {
    cloudinaryResults.push({ public_id: pid, type: "video", error: e?.message || String(e) });
        }
      }

      // 5) Delete DB rows
      if (listingIds.length > 0) {
        const placeholders = listingIds.map(() => "?").join(",");
        db.prepare(`DELETE FROM reports WHERE listing_id IN (${placeholders})`).run(...listingIds);
        db.prepare("DELETE FROM listings WHERE seller_uid = ?").run(uid);
      }

      db.prepare("DELETE FROM seller_ratings WHERE seller_uid = ? OR rater_uid = ?").run(uid, uid);
      db.prepare("DELETE FROM seller_applications WHERE applicant_uid = ?").run(uid);

      db.prepare("DELETE FROM sellers WHERE uid = ?").run(uid);

      res.json({
        success: true,
        deletedListings: listingIds.length,
        deletedCloudinaryAssets: publicIds.length,
        cloudinaryResults,
      });
    } catch (error: any) {
      console.error("Delete profile error:", error);
      res.status(500).json({ error: "Failed to delete profile", details: error?.message || String(error) });
    }
  }
);
  
  app.post("/api/reports", requireAuth, (req, res) => {
  const reporter_uid = req.user?.uid || null;
  const reporter_email = (req.user as any)?.email || null;

  const {
    type,
    listing_id,
    subject,
    reason,
    details,
  } = req.body;

  const safeType = type === "problem" ? "problem" : "listing";
  const safeListingId =
    listing_id !== undefined && listing_id !== null && listing_id !== ""
      ? Number(listing_id)
      : null;

  const safeSubject =
    typeof subject === "string" && subject.trim().length > 0
      ? subject.trim()
      : null;

  const safeReason =
    typeof reason === "string" && reason.trim().length > 0
      ? reason.trim()
      : null;

  const safeDetails =
    typeof details === "string" && details.trim().length > 0
      ? details.trim()
      : null;

  if (!safeReason) {
    return res.status(400).json({ error: "reason is required" });
  }

  if (safeType === "listing") {
    if (!safeListingId || Number.isNaN(safeListingId)) {
      return res.status(400).json({ error: "listing_id is required for listing reports" });
    }

    const listing = db
      .prepare("SELECT id FROM listings WHERE id = ?")
      .get(safeListingId);

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }
  }

  try {
    const result = db.prepare(`
      INSERT INTO reports (
        type,
        listing_id,
        subject,
        reason,
        details,
        reporter_uid,
        reporter_email,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
    `).run(
      safeType,
      safeListingId,
      safeSubject,
      safeReason,
      safeDetails,
      reporter_uid,
      reporter_email
    );

    res.json({
      success: true,
      id: result.lastInsertRowid,
      message:
        safeType === "listing"
          ? "Listing report submitted successfully."
          : "Problem report submitted successfully.",
    });
  } catch (error) {
    console.error("Submit report error:", error);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

  app.get("/api/admin/reports", requireAuth, (req, res) => {
  const requesterEmail = (req.user as any)?.email || null;
  const requesterUid = req.user?.uid || null;

  if (!hasAdminAccess({ email: requesterEmail, uid: requesterUid, is_admin: req.user?.is_admin })) {
    return res.status(403).json({ error: "Forbidden: admin access required" });
  }

  const { status, type } = req.query;

  let query = `
    SELECT
      r.id,
      r.type,
      r.listing_id,
      r.subject,
      r.reason,
      r.details,
      r.reporter_uid,
      r.reporter_email,
      r.status,
      r.created_at,
      l.name AS listing_name,
      l.category AS listing_category,
      l.university AS listing_university,
      l.is_hidden AS listing_is_hidden,
      l.seller_uid AS seller_uid,
      s.business_name AS seller_business_name,
      s.is_suspended AS seller_is_suspended
    FROM reports r
    LEFT JOIN listings l ON r.listing_id = l.id
    LEFT JOIN sellers s ON l.seller_uid = s.uid
    WHERE 1=1
  `;

  const params: any[] = [];

  if (status && typeof status === "string") {
    query += " AND r.status = ?";
    params.push(status);
  }

  if (type && typeof type === "string") {
    query += " AND r.type = ?";
    params.push(type);
  }

  query += " ORDER BY r.created_at DESC";

  try {
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error) {
    console.error("Admin reports fetch error:", error);
    res.status(500).json({ error: "Failed to load reports" });
  }
});

app.get("/api/admin/seller-applications", requireAuth, (req, res) => {
  const requesterEmail = (req.user as any)?.email || null;
  const requesterUid = req.user?.uid || null;

  if (!hasAdminAccess({ email: requesterEmail, uid: requesterUid, is_admin: req.user?.is_admin })) {
    return res.status(403).json({ error: "Forbidden: admin access required" });
  }

  const { status } = req.query;

  let query = `
    SELECT
      sa.id,
      sa.applicant_uid,
      sa.applicant_email,
      sa.full_legal_name,
      sa.institution,
      sa.applicant_type,
      sa.institution_id_number,
      sa.whatsapp_number,
      sa.business_name,
      sa.what_to_sell,
      sa.business_description,
      sa.reason_for_applying,
      sa.proof_document_url,
      sa.agreed_to_rules,
      sa.status,
      sa.review_notes,
      sa.reviewed_by_uid,
      sa.reviewed_at,
      sa.created_at,
      sa.updated_at,
      s.is_seller,
      s.is_suspended
    FROM seller_applications sa
    LEFT JOIN sellers s ON sa.applicant_uid = s.uid
    WHERE 1=1
  `;

  const params: any[] = [];

  if (status && typeof status === "string") {
    query += " AND sa.status = ?";
    params.push(status);
  }

  query += " ORDER BY sa.created_at DESC";

  try {
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error) {
    console.error("Admin seller applications fetch error:", error);
    res.status(500).json({ error: "Failed to load seller applications" });
  }
});

app.get("/api/admin/access", requireAuth, (req, res) => {
  const requesterEmail = (req.user as any)?.email || null;
  const requesterUid = req.user?.uid || null;

  if (!hasAdminAccess({ email: requesterEmail, uid: requesterUid, is_admin: req.user?.is_admin })) {
    return res.status(403).json({ error: "Forbidden: admin access required" });
  }

  return res.json({ isAdmin: true });
});

app.get("/api/admin/actions", requireAuth, (req, res) => {
  const requesterEmail = (req.user as any)?.email || null;
  const requesterUid = req.user?.uid || null;

  if (!hasAdminAccess({ email: requesterEmail, uid: requesterUid, is_admin: req.user?.is_admin })) {
    return res.status(403).json({ error: "Forbidden: admin access required" });
  }

  try {
    const rows = db
      .prepare(`
        SELECT id, admin_uid, admin_email, action_type, target_type, target_id, details, created_at
        FROM admin_actions
        ORDER BY created_at DESC
        LIMIT 100
      `)
      .all();

    res.json(
      rows.map((row: any) => ({
        ...row,
        details: row.details ? JSON.parse(row.details) : null,
      }))
    );
  } catch (error) {
    console.error("Admin actions fetch error:", error);
    res.status(500).json({ error: "Failed to load admin actions" });
  }
});

app.patch("/api/admin/reports/:id/status", requireAuth, (req, res) => {
  const requesterEmail = (req.user as any)?.email || null;
  const requesterUid = req.user?.uid || null;

  if (!hasAdminAccess({ email: requesterEmail, uid: requesterUid, is_admin: req.user?.is_admin })) {
    return res.status(403).json({ error: "Forbidden: admin access required" });
  }

  const id = Number(req.params.id);
  const { status } = req.body;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid report id" });
  }

  const allowedStatuses = ["open", "reviewed", "resolved"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const existing = db.prepare("SELECT id FROM reports WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ error: "Report not found" });
    }

    db.prepare("UPDATE reports SET status = ? WHERE id = ?").run(status, id);

    res.json({ success: true });
  } catch (error) {
    console.error("Admin report status update error:", error);
    res.status(500).json({ error: "Failed to update report status" });
  }
});

app.patch(
  "/api/admin/seller-applications/:id/status",
  requireAuth,
  withAsyncRoute(async (req, res) => {
    const requesterEmail = (req.user as any)?.email || null;
    const requesterUid = req.user?.uid || null;

    if (!hasAdminAccess({ email: requesterEmail, uid: requesterUid, is_admin: req.user?.is_admin })) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    const id = Number(req.params.id);
    const { status, review_notes } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid application id" });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Allowed values: approved, rejected",
      });
    }

    const application = db.prepare(`
      SELECT *
      FROM seller_applications
      WHERE id = ?
    `).get(id) as any;

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.status !== "pending") {
      return res.status(409).json({
        error:
          "Status transition not allowed. Only pending applications can be reviewed.",
      });
    }

    if (status === "approved") {
      const applicantEmail =
        typeof application.applicant_email === "string"
          ? application.applicant_email.trim()
          : "";

      if (!applicantEmail) {
        return res.status(422).json({
          error:
            "Cannot approve application without applicant_email. Ask applicant to update profile email.",
        });
      }
    }

    const normalizedReviewNotes =
      typeof review_notes === "string" && review_notes.trim()
        ? review_notes.trim()
        : null;

    db.prepare(`
      UPDATE seller_applications
      SET
        status = ?,
        review_notes = ?,
        reviewed_by_uid = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, normalizedReviewNotes, requesterUid, id);

    const updatedApplication = db.prepare(`
      SELECT
        id,
        status,
        review_notes,
        reviewed_at,
        reviewed_by_uid,
        updated_at
      FROM seller_applications
      WHERE id = ?
      LIMIT 1
    `).get(id);

    if (status === "approved") {
      db.prepare(`
        INSERT INTO sellers (
          uid,
          email,
          business_name,
          university,
          whatsapp_number,
          is_verified,
          is_seller
        )
        VALUES (?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(uid) DO UPDATE SET
          email = COALESCE(excluded.email, sellers.email),
          business_name = excluded.business_name,
          university = excluded.university,
          whatsapp_number = excluded.whatsapp_number,
          is_seller = 1
      `).run(
        application.applicant_uid,
        application.applicant_email,
        application.business_name,
        application.institution,
        application.whatsapp_number,
        1
      );

      try {
        const firebaseAdmin = getFirebaseAdmin();
        await firebaseAdmin
          .firestore()
          .collection("users")
          .doc(application.applicant_uid)
          .set({
            is_seller: true,
            business_name: application.business_name ?? null,
            whatsapp_number: application.whatsapp_number ?? null,
            university: application.institution ?? null,
          }, { merge: true });
      } catch (firestoreSyncError) {
        console.warn(
          "Failed to sync approved seller status to Firestore:",
          firestoreSyncError
        );
      }
    }

    logAdminAction({
      admin_uid: requesterUid,
      admin_email: requesterEmail,
      action_type:
        status === "approved"
          ? "approve_seller_application"
          : "reject_seller_application",
      target_type: "seller_application",
      target_id: String(id),
      details: {
        applicant_uid: application.applicant_uid,
        business_name: application.business_name,
        status,
      },
    });

    return res.json({ success: true, application: updatedApplication });
  })

);

app.post("/api/admin/listings/:id/hide", requireAuth, (req, res) => {
  const requesterEmail = (req.user as any)?.email || null;
  const requesterUid = req.user?.uid || null;
  const id = Number(req.params.id);

  if (!hasAdminAccess({ email: requesterEmail, uid: requesterUid, is_admin: req.user?.is_admin })) {
    return res.status(403).json({ error: "Forbidden: admin access required" });
  }

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  try {
    const listing = db
      .prepare("SELECT id, seller_uid, is_hidden FROM listings WHERE id = ?")
      .get(id) as { id: number; seller_uid: string; is_hidden: number } | undefined;

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    db.prepare("UPDATE listings SET is_hidden = 1 WHERE id = ?").run(id);

    logAdminAction({
      admin_uid: requesterUid,
      admin_email: requesterEmail,
      action_type: "hide_listing",
      target_type: "listing",
      target_id: String(id),
      details: { seller_uid: listing.seller_uid },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Hide listing error:", error);
    res.status(500).json({ error: "Failed to hide listing" });
  }
});

app.post("/api/admin/listings/:id/unhide", requireAuth, (req, res) => {
  const requesterEmail = (req.user as any)?.email || null;
  const requesterUid = req.user?.uid || null;
  const id = Number(req.params.id);

  if (!hasAdminAccess({ email: requesterEmail, uid: requesterUid, is_admin: req.user?.is_admin })) {
    return res.status(403).json({ error: "Forbidden: admin access required" });
  }

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  try {
    const listing = db
      .prepare("SELECT id, seller_uid, is_hidden FROM listings WHERE id = ?")
      .get(id) as { id: number; seller_uid: string; is_hidden: number } | undefined;

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    db.prepare("UPDATE listings SET is_hidden = 0 WHERE id = ?").run(id);

    logAdminAction({
      admin_uid: requesterUid,
      admin_email: requesterEmail,
      action_type: "unhide_listing",
      target_type: "listing",
      target_id: String(id),
      details: { seller_uid: listing.seller_uid },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Unhide listing error:", error);
    res.status(500).json({ error: "Failed to unhide listing" });
  }
});

app.post("/api/admin/sellers/:uid/suspend", requireAuth, (req, res) => {
  const requesterEmail = (req.user as any)?.email || null;
  const requesterUid = req.user?.uid || null;
  const { uid } = req.params;

  if (!hasAdminAccess({ email: requesterEmail, uid: requesterUid, is_admin: req.user?.is_admin })) {
    return res.status(403).json({ error: "Forbidden: admin access required" });
  }

  try {
    const seller = db
      .prepare("SELECT uid, business_name, is_suspended FROM sellers WHERE uid = ?")
      .get(uid) as { uid: string; business_name: string | null; is_suspended: number } | undefined;

    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }

    db.prepare("UPDATE sellers SET is_suspended = 1 WHERE uid = ?").run(uid);

    logAdminAction({
      admin_uid: requesterUid,
      admin_email: requesterEmail,
      action_type: "suspend_seller",
      target_type: "seller",
      target_id: uid,
      details: { business_name: seller.business_name },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Suspend seller error:", error);
    res.status(500).json({ error: "Failed to suspend seller" });
  }
});

app.post("/api/admin/sellers/:uid/unsuspend", requireAuth, (req, res) => {
  const requesterEmail = (req.user as any)?.email || null;
  const requesterUid = req.user?.uid || null;
  const { uid } = req.params;

  if (!hasAdminAccess({ email: requesterEmail, uid: requesterUid, is_admin: req.user?.is_admin })) {
    return res.status(403).json({ error: "Forbidden: admin access required" });
  }

  try {
    const seller = db
      .prepare("SELECT uid, business_name, is_suspended FROM sellers WHERE uid = ?")
      .get(uid) as { uid: string; business_name: string | null; is_suspended: number } | undefined;

    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }

    db.prepare("UPDATE sellers SET is_suspended = 0 WHERE uid = ?").run(uid);

    logAdminAction({
      admin_uid: requesterUid,
      admin_email: requesterEmail,
      action_type: "unsuspend_seller",
      target_type: "seller",
      target_id: uid,
      details: { business_name: seller.business_name },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Unsuspend seller error:", error);
    res.status(500).json({ error: "Failed to unsuspend seller" });
  }
});

app.post("/api/listings/:id/view", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  try {
    const listing = db
      .prepare("SELECT id FROM listings WHERE id = ?")
      .get(id) as { id: number } | undefined;

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    db.prepare(`
      UPDATE listings
      SET views_count = views_count + 1
      WHERE id = ?
    `).run(id);

    res.json({ success: true });
  } catch (error) {
    console.error("Listing view tracking error:", error);
    res.status(500).json({ error: "Failed to track listing view" });
  }
});

  app.post("/api/listings/:id/whatsapp-click", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  try {
    const listing = db
      .prepare("SELECT id FROM listings WHERE id = ?")
      .get(id) as { id: number } | undefined;

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    db.prepare(`
      UPDATE listings
      SET whatsapp_clicks = whatsapp_clicks + 1
      WHERE id = ?
    `).run(id);

    res.json({ success: true });
  } catch (error) {
    console.error("WhatsApp click tracking error:", error);
    res.status(500).json({ error: "Failed to track WhatsApp click" });
  }
});

  app.post("/api/users/:uid/profile-view", (req, res) => {
  const { uid } = req.params;
  const viewerUid = req.body?.viewer_uid || null;

  try {
    const seller = db
      .prepare("SELECT uid FROM sellers WHERE uid = ?")
      .get(uid) as { uid: string } | undefined;

    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }

    if (viewerUid && viewerUid === uid) {
      return res.json({ success: true, skipped: true });
    }

    db.prepare(`
      UPDATE sellers
      SET profile_views = profile_views + 1
      WHERE uid = ?
    `).run(uid);

    res.json({ success: true });
  } catch (error) {
    console.error("Profile view tracking error:", error);
    res.status(500).json({ error: "Failed to track profile view" });
  }
});

  app.get("/api/seller/dashboard", requireAuth, (req, res) => {
  const uid = req.user!.uid;

  try {
    const seller = db
      .prepare(`
        SELECT uid, business_name, profile_views
        FROM sellers
        WHERE uid = ?
      `)
      .get(uid) as
      | { uid: string; business_name: string | null; profile_views: number }
      | undefined;

    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }

    const listingStats = db
      .prepare(`
        SELECT
          COUNT(*) as total_listings,
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as active_listings,
          SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold_listings,
          COALESCE(SUM(views_count), 0) as total_views,
          COALESCE(SUM(whatsapp_clicks), 0) as total_whatsapp_clicks
        FROM listings
        WHERE seller_uid = ?
      `)
      .get(uid) as {
      total_listings: number;
      active_listings: number;
      sold_listings: number;
      total_views: number;
      total_whatsapp_clicks: number;
    };

    const topListing = db
      .prepare(`
        SELECT
          id,
          name,
          views_count,
          status,
          created_at
        FROM listings
        WHERE seller_uid = ?
        ORDER BY views_count DESC, created_at DESC
        LIMIT 1
      `)
      .get(uid);

    const repeatSellerActivity = listingStats.total_listings > 1;

    const byCampus = db
      .prepare(`
        SELECT
          university,
          COUNT(*) as count
        FROM listings
        WHERE seller_uid = ?
        GROUP BY university
        ORDER BY count DESC
      `)
      .all(uid);

    res.json({
      seller: {
        uid: seller.uid,
        business_name: seller.business_name,
        profile_views: seller.profile_views ?? 0,
      },
      stats: {
        total_listings: listingStats.total_listings ?? 0,
        active_listings: listingStats.active_listings ?? 0,
        sold_listings: listingStats.sold_listings ?? 0,
        total_views: listingStats.total_views ?? 0,
        total_whatsapp_clicks: listingStats.total_whatsapp_clicks ?? 0,
        repeat_seller_activity: repeatSellerActivity,
      },
      byCampus,
      top_listing: topListing || null,
    });
  } catch (error) {
    console.error("Seller dashboard error:", error);
    res.status(500).json({ error: "Failed to load seller dashboard" });
  }
});
  
  // API 404 Handler
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found", path: req.path });
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global error:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { requireAuth } from "./server/middleware/requireAuth.js";
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
  university TEXT,
  bio TEXT,
  whatsapp_number TEXT,
  is_verified INTEGER DEFAULT 0,
  is_seller INTEGER NOT NULL DEFAULT 0,
  is_suspended INTEGER NOT NULL DEFAULT 0,
  profile_views INTEGER NOT NULL DEFAULT 0,
  join_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

  CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_uid TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
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

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "isaacmtsiriza310@gmail.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(String(email).toLowerCase());
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
        folder: "buymesho",
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

  app.get("/api/listings", (req, res) => {
  const {
    category,
    university,
    search,
    sortBy,
    minPrice,
    maxPrice,
    condition,
    page = "1",
    pageSize = "12",
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

  if (minPrice !== undefined && minPrice !== "" && !Number.isNaN(Number(minPrice))) {
    baseQuery += " AND l.price >= ?";
    params.push(Number(minPrice));
  }

  if (maxPrice !== undefined && maxPrice !== "" && !Number.isNaN(Number(maxPrice))) {
    baseQuery += " AND l.price <= ?";
    params.push(Number(maxPrice));
  }

  let orderBy = " ORDER BY l.created_at DESC";
  if (sortBy === "price_asc") {
    orderBy = " ORDER BY l.price ASC";
  } else if (sortBy === "price_desc") {
    orderBy = " ORDER BY l.price DESC";
  } else if (sortBy === "popular") {
  orderBy = " ORDER BY l.views_count DESC, l.created_at DESC";
  } else if (sortBy === "oldest") {
    orderBy = " ORDER BY l.created_at ASC";
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
  
  app.post("/api/sellers", requireAuth, (req, res) => {
    const uid = req.user!.uid; // secure UID from Firebase
const {
  email,
  business_name,
  business_logo,
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
const safeBusinessLogo = typeof business_logo === "string" && business_logo.trim() ? business_logo.trim() : null;
const safeUniversity = typeof university === "string" && university.trim() ? university.trim() : null;
const safeBio = typeof bio === "string" && bio.trim() ? bio.trim() : null;
const safeWhatsapp = typeof whatsapp_number === "string" && whatsapp_number.trim() ? whatsapp_number.trim() : null;
      
db.prepare(`
  INSERT INTO sellers (uid, email, business_name, business_logo, university, bio, whatsapp_number, is_verified, is_seller)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(uid) DO UPDATE SET
    email = excluded.email,
    business_name = excluded.business_name,
    business_logo = excluded.business_logo,
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
  safeBusinessLogo,
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

  app.put("/api/profile", requireAuth, (req, res) => {
  const uid = req.user!.uid;
  const { business_name, business_logo, university, bio, whatsapp_number } = req.body;

  if (!business_name || typeof business_name !== "string") {
    return res.status(400).json({ error: "business_name is required" });
  }

  if (!business_logo || typeof business_logo !== "string") {
    return res.status(400).json({ error: "business_logo is required" });
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

    db.prepare(`
      UPDATE sellers
      SET business_name = ?, business_logo = ?, university = ?, bio = ?, whatsapp_number = ?
      WHERE uid = ?
    `).run(
      business_name,
      business_logo,
      university,
      bio ?? null,
      whatsapp_number ?? null,
      uid
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

 app.post("/api/profile/become-seller", requireAuth, (req, res) => {
  const uid = req.user!.uid;
  const email = (req.user as any)?.email || null;
  const tokenVerified = (req.user as any)?.email_verified ? 1 : 0;
  const { business_name, business_logo, university, bio, whatsapp_number } = req.body;

  if (!business_name || typeof business_name !== "string") {
    return res.status(400).json({ error: "business_name is required" });
  }

  if (!business_logo || typeof business_logo !== "string") {
    return res.status(400).json({ error: "business_logo is required" });
  }

  if (!university || typeof university !== "string") {
    return res.status(400).json({ error: "university is required" });
  }

  if (!whatsapp_number || typeof whatsapp_number !== "string") {
    return res.status(400).json({ error: "whatsapp_number is required" });
  }

  try {
    db.prepare(`
      INSERT INTO sellers (
        uid, email, business_name, business_logo, university, bio, whatsapp_number, is_verified, is_seller
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(uid) DO UPDATE SET
        email = COALESCE(excluded.email, sellers.email),
        business_name = excluded.business_name,
        business_logo = excluded.business_logo,
        university = excluded.university,
        bio = excluded.bio,
        whatsapp_number = excluded.whatsapp_number,
        is_seller = 1,
        is_verified = CASE
          WHEN excluded.is_verified = 1 THEN 1
          ELSE sellers.is_verified
        END
    `).run(
      uid,
      email,
      business_name,
      business_logo,
      university,
      bio ?? null,
      whatsapp_number,
      tokenVerified
    );

    const updated = db.prepare(`
      SELECT uid, email, business_name, business_logo, university, bio, whatsapp_number, is_verified, is_seller, join_date
      FROM sellers
      WHERE uid = ?
    `).get(uid);

    res.json(updated);
  } catch (error) {
    console.error("Become seller error:", error);
    res.status(500).json({ error: "Failed to upgrade account to seller" });
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
  
    // ✅ Validate photos + video
const safePhotos = Array.isArray(photos) ? photos.filter((x) => typeof x === "string") : [];
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

  try {
    const info = db.prepare(`
      INSERT INTO listings (
        seller_uid, name, price, description, category, university,
        photos, video_url, whatsapp_number, status, condition,
        quantity, sold_quantity, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`).run(
  seller_uid,
  name,
  price,
  description,
  category,
  university,
  JSON.stringify(safePhotos),
  safeVideoUrl,
  whatsapp_number,
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

    return res.json({
      averageRating: summary?.averageRating ?? 0,
      ratingCount: summary?.ratingCount ?? 0,
      myRating: mine?.stars ?? null,
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
    const safePhotos = Array.isArray(photos) ? photos.filter((x) => typeof x === "string") : [];
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
    
  // Minimal validation
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }

  if (price === undefined || Number.isNaN(Number(price))) {
    return res.status(400).json({ error: "price must be a number" });
  }

  if (!category || typeof category !== "string") {
    return res.status(400).json({ error: "category is required" });
  }

  if (!university || typeof university !== "string") {
    return res.status(400).json({ error: "university is required" });
  }

  if (!whatsapp_number || typeof whatsapp_number !== "string") {
    return res.status(400).json({ error: "whatsapp_number is required" });
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
      name,
      Number(price),
      description ?? null,
      category,
      university,
      JSON.stringify(safePhotos),
      safeVideoUrl,
      whatsapp_number,
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
      // 1) Load seller + listings
      const seller = db
        .prepare("SELECT business_logo FROM sellers WHERE uid = ?")
        .get(uid) as { business_logo?: string } | undefined;

      const listings = db
  .prepare("SELECT id, photos, video_url FROM listings WHERE seller_uid = ?")
  .all(uid) as { id: number; photos: string | null; video_url?: string | null }[];

const listingIds = listings.map((l) => l.id);

// 2) Collect media URLs (photos + video)
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

  if (!isAdminEmail(requesterEmail)) {
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

app.get("/api/admin/actions", requireAuth, (req, res) => {
  const requesterEmail = (req.user as any)?.email || null;

  if (!isAdminEmail(requesterEmail)) {
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

  if (!isAdminEmail(requesterEmail)) {
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

app.post("/api/admin/listings/:id/hide", requireAuth, (req, res) => {
  const requesterEmail = (req.user as any)?.email || null;
  const requesterUid = req.user?.uid || null;
  const id = Number(req.params.id);

  if (!isAdminEmail(requesterEmail)) {
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

  if (!isAdminEmail(requesterEmail)) {
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

  if (!isAdminEmail(requesterEmail)) {
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

  if (!isAdminEmail(requesterEmail)) {
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

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
    business_name TEXT NOT NULL,
    business_logo TEXT NOT NULL,
    university TEXT NOT NULL,
    bio TEXT,
    is_verified INTEGER DEFAULT 0,
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
    photos TEXT, -- JSON array of URLs
    video_url TEXT, -- ✅ optional video URL
    whatsapp_number TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_uid) REFERENCES sellers(uid)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id)
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
    const { category, university, search, sortBy } = req.query;
    let query = `
      SELECT l.*, s.business_name, s.business_logo, s.is_verified 
      FROM listings l 
      JOIN sellers s ON l.seller_uid = s.uid 
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += " AND l.category = ?";
      params.push(category);
    }
    if (university) {
      query += " AND l.university = ?";
      params.push(university);
    }
    if (search) {
      query += " AND (l.name LIKE ? OR l.description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (sortBy === 'price_asc') {
      query += " ORDER BY l.price ASC";
    } else if (sortBy === 'price_desc') {
      query += " ORDER BY l.price DESC";
    } else {
      query += " ORDER BY l.created_at DESC";
    }
    
    const listings = db.prepare(query).all(...params);
    res.json(listings.map((l: any) => ({
      ...l,
      photos: JSON.parse(l.photos || "[]")
    })));
  });

  app.post("/api/sellers", requireAuth, (req, res) => {
    const uid = req.user!.uid; // secure UID from Firebase
const { email, business_name, business_logo, university, bio } = req.body;
    try {
  db.prepare(`
    INSERT INTO sellers (uid, email, business_name, business_logo, university, bio)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET
      email = excluded.email,
      business_name = excluded.business_name,
      business_logo = excluded.business_logo,
      university = excluded.university,
      bio = excluded.bio
  `).run(uid, email, business_name, business_logo, university, bio);

  res.json({ success: true });
} catch (error) {
  console.error("Seller sync error:", error);
  res.status(500).json({ error: "Failed to sync seller profile" });
}
  });

  app.post("/api/listings", requireAuth, (req, res) => {
  // ✅ seller_uid MUST come from verified token
  const seller_uid = req.user!.uid;
  const v = db
    .prepare("SELECT is_verified FROM sellers WHERE uid = ?")
    .get(seller_uid) as { is_verified?: number } | undefined;

  if (!v) {
    return res.status(404).json({ error: "Seller profile not found" });
  }
  if (v.is_verified !== 1) {
    return res.status(403).json({ error: "Account not verified" });
  }
  const { name, price, description, category, university, photos, video_url, whatsapp_number } = req.body;
    // ✅ Validate photos + video
const safePhotos = Array.isArray(photos) ? photos.filter((x) => typeof x === "string") : [];
if (safePhotos.length > 5) {
  return res.status(400).json({ error: "Max 5 photos allowed" });
}

const safeVideoUrl =
  video_url && typeof video_url === "string" && video_url.trim().length > 0
    ? video_url.trim()
    : null;

  try {
    const info = db.prepare(`
      INSERT INTO listings (seller_uid, name, price, description, category, university, photos, video_url, whatsapp_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      seller_uid,
      name,
      price,
      description,
      category,
      university,
      JSON.stringify(safePhotos),
      safeVideoUrl,
      whatsapp_number
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
        "SELECT uid, business_name, business_logo, university, bio, is_verified, join_date FROM sellers WHERE uid = ?"
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
        WHERE l.seller_uid = ?
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
        const rImg = await cloudinary.uploader.destroy(pid, { resource_type: "image" });
        cloudinaryResults.push({ public_id: pid, type: "image", result: rImg });
      } catch (e: any) {
        cloudinaryResults.push({ public_id: pid, type: "image", error: e?.message || String(e) });
      }

      try {
        const rVid = await cloudinary.uploader.destroy(pid, { resource_type: "video" });
        cloudinaryResults.push({ public_id: pid, type: "video", result: rVid });
      } catch (e: any) {
        cloudinaryResults.push({ public_id: pid, type: "video", error: e?.message || String(e) });
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
    .prepare("SELECT is_verified FROM sellers WHERE uid = ?")
    .get(uid) as { is_verified?: number } | undefined;

  if (!v) {
    return res.status(404).json({ error: "Seller profile not found" });
  }
  if (v.is_verified !== 1) {
    return res.status(403).json({ error: "Account not verified" });
  }

  const { name, price, description, category, university, photos, video_url, whatsapp_number } = req.body;
    const safePhotos = Array.isArray(photos) ? photos.filter((x) => typeof x === "string") : [];
if (safePhotos.length > 5) {
  return res.status(400).json({ error: "Max 5 photos allowed" });
}

const safeVideoUrl =
  video_url && typeof video_url === "string" && video_url.trim().length > 0
    ? video_url.trim()
    : null;
    
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
      SET name = ?, price = ?, description = ?, category = ?, university = ?, photos = ?, video_url = ?, whatsapp_number = ?
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
  
  app.post("/api/reports", (req, res) => {
    const { listing_id, reason } = req.body;
    try {
      db.prepare(`INSERT INTO reports (listing_id, reason) VALUES (?, ?)`).run(listing_id, reason);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit report" });
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

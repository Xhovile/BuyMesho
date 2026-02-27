import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { requireAuth } from "./server/middleware/requireAuth";

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

// Simple migration: check if 'sellers' table has 'uid' column
try {
  const tableInfo = db.prepare("PRAGMA table_info(sellers)").all() as any[];
  const hasUid = tableInfo.some(col => col.name === 'uid');
  if (tableInfo.length > 0 && !hasUid) {
    console.log("Old schema detected, resetting database...");
    db.exec("DROP TABLE IF EXISTS reports");
    db.exec("DROP TABLE IF EXISTS listings");
    db.exec("DROP TABLE IF EXISTS sellers");
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
    res.json(listings.map(l => ({
      ...l,
      photos: JSON.parse(l.photos || "[]")
    })));
  });

  app.post("/api/sellers", requireAuth, (req, res) => {
    const uid = req.user!.uid; // secure UID from Firebase
const { email, business_name, business_logo, university, bio } = req.body;
    try {
      db.prepare(`
        INSERT OR REPLACE INTO sellers (uid, email, business_name, business_logo, university, bio)
        VALUES (?, ?, ?, ?, ?, ?)
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

  const { name, price, description, category, university, photos, whatsapp_number } = req.body;

  try {
    const info = db.prepare(`
      INSERT INTO listings (seller_uid, name, price, description, category, university, photos, whatsapp_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      seller_uid,
      name,
      price,
      description,
      category,
      university,
      JSON.stringify(photos ?? []),
      whatsapp_number
    );

    res.json({ id: info.lastInsertRowid });
  } catch (error) {
    console.error("Listing error:", error);
    res.status(500).json({ error: "Failed to create listing" });
  }
});
  
  app.delete("/api/listings/:id", requireAuth, (req, res) => {
  const uid = req.user!.uid;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  try {
    const listing = db.prepare(
      "SELECT id, seller_uid FROM listings WHERE id = ?"
    ).get(id) as { id: number; seller_uid: string } | undefined;

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // 🔐 Ownership check
    if (listing.seller_uid !== uid) {
      return res.status(403).json({ error: "Forbidden: not your listing" });
    }

    db.prepare("DELETE FROM listings WHERE id = ?").run(id);

    res.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

  app.put("/api/listings/:id", requireAuth, (req, res) => {
  const uid = req.user!.uid;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  const { name, price, description, category, university, photos, whatsapp_number } = req.body;

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
      SET name = ?, price = ?, description = ?, category = ?, university = ?, photos = ?, whatsapp_number = ?
      WHERE id = ?
    `).run(
      name,
      Number(price),
      description ?? null,
      category,
      university,
      JSON.stringify(photos ?? []),
      whatsapp_number,
      id
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Failed to update listing" });
  }
});

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

import type { Express, NextFunction, Request, Response } from "express";
import multer from "multer";
import { uploadBufferToCloudinary } from "../lib/cloudinaryUpload.js";
import { parseSpecFilters, serializeListingRow } from "../lib/listingHelpers.js";
import { getFirebaseAdmin } from "../auth/firebaseAdmin.js";
import { requireAuth } from "../middleware/requireAuth.js";

export type MarketplaceRouteDeps = {
  db: any;
};

export function registerMarketplaceRoutes(app: Express, deps: MarketplaceRouteDeps) {
  const { db } = deps;
  const storage = multer.memoryStorage();
  const upload = multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  app.get("/api/db-test", (_req, res) => {
    try {
      const row = db.prepare("SELECT 1 AS ok, CURRENT_TIMESTAMP AS now").get() as {
        ok?: number;
        now?: string;
      } | undefined;

      return res.json({
        success: true,
        db: row ?? null,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/upload", (_req, res) => {
    res.json({ status: "ready", method: "POST required" });
  });

  app.post(["/api/upload", "/api/upload/"], (req, res, next) => {
    console.log("POST /api/upload - Multer starting");
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error("Multer error:", err);
        return res.status(400).json({ error: "File upload error", details: err.message });
      }
      if (err) {
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

      const url = await uploadBufferToCloudinary({
        buffer: req.file.buffer,
        mimetype: req.file.mimetype || "",
      });

      console.log("Cloudinary success:", url);
      res.json({ url });
    } catch (error) {
      console.error("Cloudinary/Handler error:", error);
      res.status(500).json({
        error: "Upload failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

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
        AND l.deleted_at IS NULL
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
        items: rows.map((l: any) => serializeListingRow(l)),
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
          WHERE l.id = ? AND l.is_hidden = 0 AND l.deleted_at IS NULL
          LIMIT 1
        `)
        .get(listingId) as any;

      if (!row) {
        return res.status(404).json({ error: "Listing not found" });
      }

      res.json(serializeListingRow(row));
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
          WHERE id = ? AND is_hidden = 0 AND deleted_at IS NULL
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
            AND l.deleted_at IS NULL
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

      res.json(rows.map((l: any) => serializeListingRow(l)));
    } catch (error) {
      console.error("Fetch related listings error:", error);
      res.status(500).json({ error: "Failed to load related listings" });
    }
  });

  app.post("/api/sellers", requireAuth, (req, res) => {
    const uid = req.user!.uid;
    const { email, business_name, university, bio, is_verified, is_seller } = req.body;

    try {
      const incomingVerified = (req.user as any).email_verified || is_verified ? 1 : 0;
      const incomingSeller = is_seller === true || is_seller === 1 ? 1 : 0;

      const safeBusinessName = typeof business_name === "string" && business_name.trim() ? business_name.trim() : null;
      const safeUniversity = typeof university === "string" && university.trim() ? university.trim() : null;
      const safeBio = typeof bio === "string" && bio.trim() ? bio.trim() : null;

      db.prepare(`
        INSERT INTO sellers (uid, email, business_name, university, bio, is_verified, is_seller)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(uid) DO UPDATE SET
          email = excluded.email,
          business_name = excluded.business_name,
          university = excluded.university,
          is_seller = excluded.is_seller,
          bio = excluded.bio,
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
    const requestedUniversity = typeof req.body?.university === "string" ? req.body.university.trim() : "";
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
            uid, email, business_name, university, bio, is_verified, is_seller, join_date
          ) VALUES (?, ?, NULL, ?, NULL, ?, ?, ?)
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
}

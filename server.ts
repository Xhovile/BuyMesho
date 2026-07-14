import express, { type NextFunction, type Request, type Response } from "express";
import { mountTotpRoutes } from "./server/totpServer.js";
import { registerSessionRoutes } from "./server/auth/sessionRoutes.js";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { runMigrations } from "./server/db/migrations/index.js";
import { attachOptionalAuth, requireAuth } from "./server/middleware/requireAuth.js";
import { requireFirebaseUser } from "./server/middleware/requireFirebaseUser.js";
import { getFirebaseAdmin } from "./server/auth/firebaseAdmin.js";
import { registerAccountDeletionRoutes } from "./server/auth/accountDeletionRoutes.js";
import { getConfiguredAdminEmails } from "./server/auth/adminAccess.js";
import { registerVerificationEmailRoutes } from "./server/auth/verificationEmailRoutes.js";
import { registerMessageModerationRoutes, registerMessageRoutes } from "./server/routes/messageHubRoutes.js";
import { registerMessagesRoutes } from "./server/routes/messagesRoutes.js";
import { registerReviewsRoutes } from "./server/routes/reviewsRoutes.js";
import { createPaymentRouter } from "./server/modules/payments/payment.routes.js";
import { createConnectRouter } from "./server/modules/connect/connect.routes.js";
import { createPaymentAdminRouter } from "./server/modules/payments/payment.admin.routes.js";
import { createAdminModerationRouter } from "./server/modules/admin/admin.moderation.routes.js";
import { createAdminActionsRouter } from "./server/modules/admin/admin.actions.routes.js";
import { createAdminAccessRouter } from "./server/modules/admin/admin.access.routes.js";
import { createAdminSummaryRouter } from "./server/modules/admin/admin.summary.routes.js";
import { startPayoutReconciliationScheduler } from "./server/modules/payouts/payout.reconciliation.scheduler.js";
import { createEscrowRouter, createDisputeRouter, createPayoutRouter } from "./server/routes/escrowRoutes.js";
import { createCartRouter } from "./server/routes/cart.routes.js";
import { uploadBufferToCloudinary } from "./server/lib/cloudinaryUpload.js";
import {
  isMeaningfulTitle,
  isValidListingHierarchy,
  parseSpecFilters,
  normalizeListingPricing,
  serializeListingRow,
  toFiniteNumber,
  toTrimmedString,
} from "./server/lib/listingHelpers.js";
import { createAdminAuditLogger } from "./server/lib/adminAudit.js";
dotenv.config();

console.log("SERVER STARTING: Environment loaded");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  }
});

const db: any = runMigrations();
const logAdminAction = createAdminAuditLogger(db);

if (getConfiguredAdminEmails().length === 0) {
  console.warn(
    "Admin email list is empty. Set ADMIN_EMAILS (or VITE_ADMIN_EMAILS) to enable admin access."
  );
}

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const PORT = Number(process.env.PORT) || 3000;
  
  // Ensure PayChangu webhook receives raw JSON bytes for signature verification.
  app.use('/api/payments/paychangu/webhook', express.raw({ type: 'application/json' }));
  app.use('/api/payments/paychangu-payout/webhook', express.raw({ type: 'application/json' }));
  app.use('/api/cart', createCartRouter(requireFirebaseUser));

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

 
  registerVerificationEmailRoutes(app);
  registerSessionRoutes(app);
  registerAccountDeletionRoutes(app);
  registerMessageRoutes(app);
  registerMessageModerationRoutes(app);
  registerMessagesRoutes(app);
  registerReviewsRoutes(app);
  mountTotpRoutes(app);
  app.use('/api/payments', createPaymentRouter(requireFirebaseUser));
  app.use('/api/connect', createConnectRouter(requireFirebaseUser));
  app.use('/api/admin', createPaymentAdminRouter(requireAuth));
  app.use('/api/admin', createAdminAccessRouter(requireAuth));
  app.use('/api/admin', createAdminActionsRouter({ requireAuth, db: db as any }));
  app.use('/api/admin', createAdminSummaryRouter({ requireAuth, db: db as any }));
  app.use('/api/admin', createAdminModerationRouter({ requireAuth, db: db as any, logAdminAction }));
  app.use('/api/escrow', createEscrowRouter(requireFirebaseUser));
  app.use('/api/disputes', createDisputeRouter(requireFirebaseUser));
  app.use('/api/payouts', createPayoutRouter(requireFirebaseUser));
  
  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

app.get("/api/db-test", (req, res) => {
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
  // `hideSoldOut` remains for backward compatibility with existing clients.
  // Newer clients can pass `status=available` for the same behavior.
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
            CASE WHEN l.sold_quantity >= l.quantity OR l.status = 'sold' THEN 1 ELSE 0 END ASC,
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
        ) as any[];

      res.json({
        items: rows.map((l) => serializeListingRow(l)),
      });
    } catch (error) {
      console.error("Related listings error:", error);
      res.status(500).json({ error: "Failed to load related listings" });
    }
  });

  app.get("/api/user-profile/:uid", requireFirebaseUser, async (req, res) => {
    const uid = String(req.params.uid || "");

    if (!uid) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const viewerUid = req.user?.uid ?? null;
    const isSelf = viewerUid === uid;

    try {
      const seller = db
        .prepare(`
          SELECT
            uid,
            email,
            business_name,
            university,
            bio,
            profile_picture,
            business_logo,
            shop_slug,
            is_verified,
            location,
            whatsapp_number,
            phone_number,
            seller_type,
            market_name,
            avg_rating,
            rating_count,
            profile_views,
            business_type,
            business_category,
            created_at,
            updated_at,
            seller_since,
            deleted_at,
            deleted_by,
            delete_requested_at,
            delete_effective_at,
            delete_reason,
            deletion_notice_sent_at,
            deletion_notice_sent_by,
            delete_notice_token,
            delete_notice_sent_to,
            restore_requested_at
          FROM sellers
          WHERE uid = ?
          LIMIT 1
        `)
        .get(uid) as any;

      if (!seller || seller.deleted_at) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      const items = db
        .prepare(`
          SELECT l.*, s.business_name, s.business_logo, s.is_verified
          FROM listings l
          JOIN sellers s ON l.seller_uid = s.uid
          WHERE l.seller_uid = ?
            AND l.is_hidden = 0
            AND l.deleted_at IS NULL
          ORDER BY
            CASE WHEN l.status = 'sold' OR l.sold_quantity >= l.quantity THEN 1 ELSE 0 END ASC,
            l.created_at DESC
        `)
        .all(uid) as any[];

      const visibleItems = items.filter((item) => {
        const isHiddenSeller = item.is_hidden === 1;
        const isSoldOut = item.status === "sold" || item.sold_quantity >= item.quantity;
        if (isSelf) return true;
        return !isHiddenSeller && !isSoldOut;
      });

      res.json({
        seller: {
          uid: seller.uid,
          email: seller.email ?? null,
          business_name: seller.business_name ?? null,
          university: seller.university ?? null,
          bio: seller.bio ?? null,
          profile_picture: seller.profile_picture ?? null,
          business_logo: seller.business_logo ?? null,
          shop_slug: seller.shop_slug ?? null,
          is_verified: Boolean(seller.is_verified),
          location: seller.location ?? null,
          whatsapp_number: seller.whatsapp_number ?? null,
          phone_number: seller.phone_number ?? null,
          seller_type: seller.seller_type ?? null,
          market_name: seller.market_name ?? null,
          avg_rating: seller.avg_rating ?? null,
          rating_count: seller.rating_count ?? null,
          profile_views: seller.profile_views ?? null,
          business_type: seller.business_type ?? null,
          business_category: seller.business_category ?? null,
          created_at: seller.created_at ?? null,
          updated_at: seller.updated_at ?? null,
          seller_since: seller.seller_since ?? null,
        },
        items: visibleItems.map((item) => serializeListingRow(item)),
      });
    } catch (error) {
      console.error("User profile fetch error:", error);
      res.status(500).json({ error: "Failed to load seller profile" });
    }
  });

  app.patch("/api/user-profile/:uid", requireAuth, async (req, res) => {
    const uid = String(req.params.uid || "");
    const viewerUid = req.user?.uid ?? null;
    const body = req.body as any;

    if (!viewerUid || viewerUid !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      const existing = db
        .prepare(`SELECT uid, deleted_at, business_name, profile_picture, bio, university, shop_slug, location, whatsapp_number, phone_number FROM sellers WHERE uid = ? LIMIT 1`)
        .get(uid) as any;

      if (!existing || existing.deleted_at) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      const nextBusinessName = toTrimmedString(body.business_name ?? existing.business_name ?? "");
      const nextProfilePicture = toTrimmedString(body.profile_picture ?? existing.profile_picture ?? "");
      const nextBio = toTrimmedString(body.bio ?? existing.bio ?? "");
      const nextUniversity = toTrimmedString(body.university ?? existing.university ?? "");
      const nextShopSlug = toTrimmedString(body.shop_slug ?? existing.shop_slug ?? "");
      const nextLocation = toTrimmedString(body.location ?? existing.location ?? "");
      const nextWhatsapp = toTrimmedString(body.whatsapp_number ?? existing.whatsapp_number ?? "");
      const nextPhone = toTrimmedString(body.phone_number ?? existing.phone_number ?? "");

      if (!nextBusinessName) {
        return res.status(400).json({ error: "Business name is required" });
      }

      db.prepare(`
        UPDATE sellers
        SET business_name = ?, profile_picture = ?, bio = ?, university = ?, shop_slug = ?, location = ?, whatsapp_number = ?, phone_number = ?, updated_at = CURRENT_TIMESTAMP
        WHERE uid = ?
      `).run(
        nextBusinessName,
        nextProfilePicture || null,
        nextBio || null,
        nextUniversity || null,
        nextShopSlug || null,
        nextLocation || null,
        nextWhatsapp || null,
        nextPhone || null,
        uid
      );

      return res.json({
        success: true,
        seller: {
          ...existing,
          business_name: nextBusinessName,
          profile_picture: nextProfilePicture || null,
          bio: nextBio || null,
          university: nextUniversity || null,
          shop_slug: nextShopSlug || null,
          location: nextLocation || null,
          whatsapp_number: nextWhatsapp || null,
          phone_number: nextPhone || null,
        },
      });
    } catch (error) {
      console.error("User profile update error:", error);
      res.status(500).json({ error: "Failed to update seller profile" });
    }
  });

  app.delete("/api/user-profile/:uid", requireAuth, async (req, res) => {
    const uid = String(req.params.uid || "");
    const viewerUid = req.user?.uid ?? null;

    if (!viewerUid || viewerUid !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      const seller = db
        .prepare(`SELECT uid, deleted_at, delete_effective_at FROM sellers WHERE uid = ? LIMIT 1`)
        .get(uid) as any;

      if (!seller || seller.deleted_at) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      const existingOpenListings = db
        .prepare(`SELECT COUNT(*) AS count FROM listings WHERE seller_uid = ? AND deleted_at IS NULL AND (status != 'sold' AND sold_quantity < quantity)`)
        .get(uid) as { count?: number } | undefined;

      if ((existingOpenListings?.count ?? 0) > 0) {
        return res.status(400).json({ error: "Please close or sell all listings before deleting your profile" });
      }

      db.prepare(`
        UPDATE sellers
        SET deleted_at = CURRENT_TIMESTAMP,
            delete_requested_at = CURRENT_TIMESTAMP,
            delete_effective_at = DATETIME(CURRENT_TIMESTAMP, '+7 days'),
            updated_at = CURRENT_TIMESTAMP
        WHERE uid = ?
      `).run(uid);

      return res.json({ success: true });
    } catch (error) {
      console.error("User profile delete request error:", error);
      res.status(500).json({ error: "Failed to delete seller profile" });
    }
  });

  app.get("/api/listings/:id/ratings", (req, res) => {
    const listingId = Number(req.params.id);

    if (!Number.isInteger(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    try {
      const listing = db
        .prepare(`SELECT id, seller_uid FROM listings WHERE id = ? LIMIT 1`)
        .get(listingId) as { id?: number; seller_uid?: string } | undefined;

      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      const summary = db
        .prepare(`
          SELECT
            AVG(rating) AS average_rating,
            COUNT(*) AS rating_count
          FROM seller_ratings
          WHERE seller_uid = ? AND listing_id = ?
        `)
        .get(listing.seller_uid, listingId) as { average_rating?: number | null; rating_count?: number | null } | undefined;

      const userRating = req.user?.uid
        ? db
            .prepare(`
              SELECT rating
              FROM seller_ratings
              WHERE seller_uid = ? AND listing_id = ? AND rater_uid = ?
              LIMIT 1
            `)
            .get(listing.seller_uid, listingId, req.user.uid) as { rating?: number } | undefined
        : undefined;

      res.json({
        averageRating: summary?.average_rating ?? 0,
        ratingCount: summary?.rating_count ?? 0,
        myRating: userRating?.rating ?? null,
      });
    } catch (error) {
      console.error("Listing ratings fetch error:", error);
      res.status(500).json({ error: "Failed to load ratings" });
    }
  });

  app.post("/api/listings/:id/ratings", requireFirebaseUser, async (req, res) => {
    const listingId = Number(req.params.id);
    const ratingValue = Number((req.body as any)?.rating);

    if (!Number.isInteger(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    try {
      const listing = db
        .prepare(`SELECT id, seller_uid FROM listings WHERE id = ? LIMIT 1`)
        .get(listingId) as { id?: number; seller_uid?: string } | undefined;

      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      if (!req.user?.uid) {
        return res.status(401).json({ error: "Authentication required" });
      }

      if (listing.seller_uid === req.user.uid) {
        return res.status(400).json({ error: "You cannot rate your own listing" });
      }

      db.prepare(`
        INSERT INTO seller_ratings (seller_uid, listing_id, rater_uid, rating)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(seller_uid, listing_id, rater_uid) DO UPDATE SET
          rating = excluded.rating,
          updated_at = CURRENT_TIMESTAMP
      `).run(listing.seller_uid, listingId, req.user.uid, ratingValue);

      const summary = db
        .prepare(`
          SELECT AVG(rating) AS average_rating, COUNT(*) AS rating_count
          FROM seller_ratings
          WHERE seller_uid = ? AND listing_id = ?
        `)
        .get(listing.seller_uid, listingId) as { average_rating?: number | null; rating_count?: number | null } | undefined;

      return res.json({
        success: true,
        averageRating: summary?.average_rating ?? ratingValue,
        ratingCount: summary?.rating_count ?? 1,
        myRating: ratingValue,
      });
    } catch (error) {
      console.error("Listing rating save error:", error);
      res.status(500).json({ error: "Failed to save rating" });
    }
  });

  app.get("/api/sellers", async (req, res) => {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const search = toTrimmedString(req.query.search);

    try {
      let query = `
        SELECT uid, business_name, university, business_logo, profile_picture, is_verified, shop_slug, location, seller_type,
               avg_rating, rating_count, profile_views, business_type, business_category, created_at, updated_at
        FROM sellers
        WHERE deleted_at IS NULL
      `;
      const params: any[] = [];
      if (search) {
        query += ` AND (business_name LIKE ? OR university LIKE ? OR location LIKE ? OR seller_type LIKE ? OR business_type LIKE ? OR business_category LIKE ?)`;
        const like = `%${search}%`;
        params.push(like, like, like, like, like, like);
      }
      query += ` ORDER BY is_verified DESC, COALESCE(avg_rating, 0) DESC, rating_count DESC, COALESCE(profile_views, 0) DESC, business_name ASC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const rows = db.prepare(query).all(...params) as any[];
      res.json({ sellers: rows });
    } catch (error) {
      console.error("Seller list fetch error:", error);
      res.status(500).json({ error: "Failed to load sellers" });
    }
  });

  app.get("/api/sellers/:uid", async (req, res) => {
    const uid = String(req.params.uid || "").trim();
    if (!uid) {
      return res.status(400).json({ error: "Invalid seller id" });
    }

    try {
      const seller = db
        .prepare(`
          SELECT uid, email, business_name, university, bio, profile_picture, business_logo, shop_slug, is_verified,
                 location, whatsapp_number, phone_number, seller_type, market_name, avg_rating, rating_count,
                 profile_views, business_type, business_category, created_at, updated_at, seller_since, deleted_at
          FROM sellers
          WHERE uid = ?
          LIMIT 1
        `)
        .get(uid) as any;

      if (!seller || seller.deleted_at) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      const listings = db
        .prepare(`
          SELECT l.*, s.business_name, s.business_logo, s.is_verified
          FROM listings l
          JOIN sellers s ON l.seller_uid = s.uid
          WHERE l.seller_uid = ?
            AND l.is_hidden = 0
            AND l.deleted_at IS NULL
          ORDER BY
            CASE WHEN l.status = 'sold' OR l.sold_quantity >= l.quantity THEN 1 ELSE 0 END ASC,
            l.created_at DESC
        `)
        .all(uid) as any[];

      res.json({
        seller: {
          uid: seller.uid,
          email: seller.email ?? null,
          business_name: seller.business_name ?? null,
          university: seller.university ?? null,
          bio: seller.bio ?? null,
          profile_picture: seller.profile_picture ?? null,
          business_logo: seller.business_logo ?? null,
          shop_slug: seller.shop_slug ?? null,
          is_verified: Boolean(seller.is_verified),
          location: seller.location ?? null,
          whatsapp_number: seller.whatsapp_number ?? null,
          phone_number: seller.phone_number ?? null,
          seller_type: seller.seller_type ?? null,
          market_name: seller.market_name ?? null,
          avg_rating: seller.avg_rating ?? null,
          rating_count: seller.rating_count ?? null,
          profile_views: seller.profile_views ?? null,
          business_type: seller.business_type ?? null,
          business_category: seller.business_category ?? null,
          created_at: seller.created_at ?? null,
          updated_at: seller.updated_at ?? null,
          seller_since: seller.seller_since ?? null,
        },
        items: listings.map((item) => serializeListingRow(item)),
      });
    } catch (error) {
      console.error("Seller profile fetch error:", error);
      res.status(500).json({ error: "Failed to load seller profile" });
    }
  });

  app.post("/api/sellers/:uid/increment-view", async (req, res) => {
    const uid = String(req.params.uid || "").trim();
    if (!uid) {
      return res.status(400).json({ error: "Invalid seller id" });
    }

    try {
      db.prepare(`UPDATE sellers SET profile_views = COALESCE(profile_views, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE uid = ?`).run(uid);
      res.json({ success: true });
    } catch (error) {
      console.error("Seller view increment error:", error);
      res.status(500).json({ error: "Failed to increment profile views" });
    }
  });

  app.post("/api/listings/:id/views", (req, res) => {
    const listingId = Number(req.params.id);
    if (!Number.isInteger(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    try {
      const result = db.prepare(`UPDATE listings SET views_count = COALESCE(views_count, 0) + 1 WHERE id = ?`).run(listingId);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Increment listing views error:", error);
      res.status(500).json({ error: "Failed to increment listing views" });
    }
  });

  // ✅ NEW: get all hidden sellers
  app.get("/api/hidden-sellers", requireAuth, async (req, res) => {
    try {
      const rows = db
        .prepare(`
          SELECT seller_uid
          FROM hidden_sellers
          WHERE uid = ?
          ORDER BY created_at DESC
        `)
        .all(req.user!.uid) as { seller_uid: string }[];

      res.json(rows.map((r) => r.seller_uid));
    } catch (error) {
      console.error("Hidden sellers fetch error:", error);
      res.status(500).json({ error: "Failed to load hidden sellers" });
    }
  });

  // ✅ NEW: hide seller
  app.post("/api/hidden-sellers", requireAuth, async (req, res) => {
    const sellerUid = String((req.body as any)?.seller_uid || "").trim();

    if (!sellerUid) {
      return res.status(400).json({ error: "seller_uid is required" });
    }

    try {
      db.prepare(`
        INSERT INTO hidden_sellers (uid, seller_uid)
        VALUES (?, ?)
        ON CONFLICT(uid, seller_uid) DO NOTHING
      `).run(req.user!.uid, sellerUid);

      res.json({ success: true });
    } catch (error) {
      console.error("Hide seller error:", error);
      res.status(500).json({ error: "Failed to hide seller" });
    }
  });

  // ✅ NEW: unhide seller
  app.delete("/api/hidden-sellers/:sellerUid", requireAuth, async (req, res) => {
    const sellerUid = String(req.params.sellerUid || "").trim();

    try {
      db.prepare(`DELETE FROM hidden_sellers WHERE uid = ? AND seller_uid = ?`).run(req.user!.uid, sellerUid);
      res.json({ success: true });
    } catch (error) {
      console.error("Unhide seller error:", error);
      res.status(500).json({ error: "Failed to unhide seller" });
    }
  });

  // ✅ NEW: get all hidden listing IDs
  app.get("/api/hidden-listings", requireAuth, async (req, res) => {
    try {
      const rows = db
        .prepare(`
          SELECT listing_id
          FROM hidden_listings
          WHERE uid = ?
          ORDER BY created_at DESC
        `)
        .all(req.user!.uid) as { listing_id: number }[];

      res.json(rows.map((r) => r.listing_id));
    } catch (error) {
      console.error("Hidden listings fetch error:", error);
      res.status(500).json({ error: "Failed to load hidden listings" });
    }
  });

  // ✅ NEW: hide listing
  app.post("/api/hidden-listings", requireAuth, async (req, res) => {
    const listingId = Number((req.body as any)?.listing_id);

    if (!Number.isInteger(listingId)) {
      return res.status(400).json({ error: "listing_id must be a number" });
    }

    try {
      db.prepare(`
        INSERT INTO hidden_listings (uid, listing_id)
        VALUES (?, ?)
        ON CONFLICT(uid, listing_id) DO NOTHING
      `).run(req.user!.uid, listingId);

      res.json({ success: true });
    } catch (error) {
      console.error("Hide listing error:", error);
      res.status(500).json({ error: "Failed to hide listing" });
    }
  });

  // ✅ NEW: unhide listing
  app.delete("/api/hidden-listings/:listingId", requireAuth, async (req, res) => {
    const listingId = Number(req.params.listingId);

    if (!Number.isInteger(listingId)) {
      return res.status(400).json({ error: "listingId must be a number" });
    }

    try {
      db.prepare(`DELETE FROM hidden_listings WHERE uid = ? AND listing_id = ?`).run(req.user!.uid, listingId);
      res.json({ success: true });
    } catch (error) {
      console.error("Unhide listing error:", error);
      res.status(500).json({ error: "Failed to unhide listing" });
    }
  });

  // ✅ NEW: save listing
  app.post("/api/saved-listings", requireAuth, async (req, res) => {
    const listingId = Number((req.body as any)?.listing_id);

    if (!Number.isInteger(listingId)) {
      return res.status(400).json({ error: "listing_id must be a number" });
    }

    try {
      db.prepare(`
        INSERT INTO saved_listings (uid, listing_id)
        VALUES (?, ?)
        ON CONFLICT(uid, listing_id) DO NOTHING
      `).run(req.user!.uid, listingId);

      res.json({ success: true });
    } catch (error) {
      console.error("Save listing error:", error);
      res.status(500).json({ error: "Failed to save listing" });
    }
  });

  // ✅ NEW: remove saved listing
  app.delete("/api/saved-listings/:listingId", requireAuth, async (req, res) => {
    const listingId = Number(req.params.listingId);

    if (!Number.isInteger(listingId)) {
      return res.status(400).json({ error: "listingId must be a number" });
    }

    try {
      db.prepare(`DELETE FROM saved_listings WHERE uid = ? AND listing_id = ?`).run(req.user!.uid, listingId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove saved listing error:", error);
      res.status(500).json({ error: "Failed to remove saved listing" });
    }
  });

  // ✅ NEW: get saved listings
  app.get("/api/saved-listings", requireAuth, async (req, res) => {
    try {
      const rows = db
        .prepare(`
          SELECT listing_id
          FROM saved_listings
          WHERE uid = ?
          ORDER BY created_at DESC
        `)
        .all(req.user!.uid) as { listing_id: number }[];

      res.json(rows.map((r) => r.listing_id));
    } catch (error) {
      console.error("Saved listings fetch error:", error);
      res.status(500).json({ error: "Failed to load saved listings" });
    }
  });

  app.post("/api/reports", requireAuth, async (req, res) => {
    const payload = req.body as any;
    const listingId = Number(payload?.listing_id);
    const reason = toTrimmedString(payload?.reason);
    const details = toTrimmedString(payload?.details);

    if (!Number.isInteger(listingId)) {
      return res.status(400).json({ error: "listing_id must be a number" });
    }

    if (!reason) {
      return res.status(400).json({ error: "reason is required" });
    }

    try {
      const inserted = db
        .prepare(`
          INSERT INTO reports (
            listing_id,
            reporter_uid,
            reason,
            details,
            status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .run(listingId, req.user!.uid, reason, details || null);

      res.json({ success: true, report_id: inserted.lastInsertRowid });
    } catch (error) {
      console.error("Create report error:", error);
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  app.get("/api/reports", requireAuth, async (req, res) => {
    try {
      const rows = db
        .prepare(`
          SELECT r.*, l.name AS listing_name, l.photos AS listing_photos, l.category AS listing_category
          FROM reports r
          LEFT JOIN listings l ON l.id = r.listing_id
          WHERE r.reporter_uid = ?
          ORDER BY r.created_at DESC
        `)
        .all(req.user!.uid) as any[];

      res.json({
        reports: rows.map((row) => ({
          id: row.id,
          listing_id: row.listing_id,
          listing_name: row.listing_name ?? null,
          listing_photos: row.listing_photos ?? null,
          listing_category: row.listing_category ?? null,
          reason: row.reason,
          details: row.details ?? null,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
        })),
      });
    } catch (error) {
      console.error("Reports fetch error:", error);
      res.status(500).json({ error: "Failed to load reports" });
    }
  });

  app.get("/api/home-data", async (_req, res) => {
    try {
      const featuredListings = db
        .prepare(`
          SELECT l.*, s.business_name, s.business_logo, s.is_verified
          FROM listings l
          JOIN sellers s ON l.seller_uid = s.uid
          WHERE l.is_hidden = 0
            AND l.deleted_at IS NULL
          ORDER BY CASE WHEN l.status = 'sold' OR l.sold_quantity >= l.quantity THEN 1 ELSE 0 END ASC,
                   l.views_count DESC,
                   l.created_at DESC
          LIMIT 12
        `)
        .all() as any[];

      const topRatedSellers = db
        .prepare(`
          SELECT uid, business_name, university, business_logo, profile_picture, is_verified, avg_rating, rating_count, profile_views, business_type, business_category
          FROM sellers
          WHERE deleted_at IS NULL
          ORDER BY is_verified DESC, COALESCE(avg_rating, 0) DESC, rating_count DESC, COALESCE(profile_views, 0) DESC, business_name ASC
          LIMIT 8
        `)
        .all() as any[];

      const statsRow = db
        .prepare(`
          SELECT
            COUNT(*) AS total_listings,
            COUNT(DISTINCT seller_uid) AS total_sellers,
            COUNT(CASE WHEN status = 'sold' OR sold_quantity >= quantity THEN 1 END) AS sold_listings,
            COUNT(CASE WHEN deleted_at IS NULL AND is_hidden = 0 THEN 1 END) AS active_listings
          FROM listings
        `)
        .get() as any;

      res.json({
        featuredListings: featuredListings.map((listing) => serializeListingRow(listing)),
        topRatedSellers,
        stats: {
          totalListings: statsRow?.total_listings ?? 0,
          totalSellers: statsRow?.total_sellers ?? 0,
          soldListings: statsRow?.sold_listings ?? 0,
          activeListings: statsRow?.active_listings ?? 0,
        },
      });
    } catch (error) {
      console.error("Home data fetch error:", error);
      res.status(500).json({ error: "Failed to load home data" });
    }
  });

  app.get("/api/user-summary", requireAuth, async (req, res) => {
    try {
      const user = db
        .prepare(`
          SELECT
            uid,
            business_name,
            university,
            email,
            bio,
            profile_picture,
            business_logo,
            shop_slug,
            is_verified,
            location,
            whatsapp_number,
            phone_number,
            seller_type,
            market_name,
            avg_rating,
            rating_count,
            profile_views,
            business_type,
            business_category,
            created_at,
            updated_at,
            seller_since
          FROM sellers
          WHERE uid = ?
          LIMIT 1
        `)
        .get(req.user!.uid) as any;

      const totals = db
        .prepare(`
          SELECT
            COUNT(*) AS total_listings,
            COUNT(CASE WHEN status = 'available' AND deleted_at IS NULL AND is_hidden = 0 THEN 1 END) AS active_listings,
            COUNT(CASE WHEN status = 'sold' OR sold_quantity >= quantity THEN 1 END) AS sold_listings,
            COUNT(CASE WHEN deleted_at IS NULL AND is_hidden = 0 THEN 1 END) AS visible_listings,
            COALESCE(SUM(CASE WHEN deleted_at IS NULL AND is_hidden = 0 THEN price ELSE 0 END), 0) AS inventory_value,
            COALESCE(SUM(views_count), 0) AS total_views,
            COALESCE(SUM(whatsapp_clicks), 0) AS total_whatsapp_clicks
          FROM listings
          WHERE seller_uid = ?
        `)
        .get(req.user!.uid) as any;

      const sellerRatings = db
        .prepare(`
          SELECT
            COALESCE(AVG(rating), 0) AS average_rating,
            COUNT(*) AS rating_count
          FROM seller_ratings
          WHERE seller_uid = ?
        `)
        .get(req.user!.uid) as any;

      const recentListings = db
        .prepare(`
          SELECT l.*, s.business_name, s.business_logo, s.is_verified
          FROM listings l
          JOIN sellers s ON l.seller_uid = s.uid
          WHERE l.seller_uid = ?
          ORDER BY l.created_at DESC
          LIMIT 5
        `)
        .all(req.user!.uid) as any[];

      const ratingTotal = Number(sellerRatings?.rating_count ?? 0);
      const repeatSellerActivity = ratingTotal >= 10 ? "strong" : ratingTotal >= 3 ? "developing" : "new";

      const byCampusRows = db
        .prepare(`
          SELECT university, COUNT(*) AS count
          FROM listings
          WHERE seller_uid = ? AND deleted_at IS NULL
          GROUP BY university
          ORDER BY count DESC, university ASC
        `)
        .all(req.user!.uid) as { university: string; count: number }[];

      const byCampus = byCampusRows.map((row) => ({
        university: row.university,
        count: row.count,
      }));

      const topListing = recentListings[0]
        ? {
            id: recentListings[0].id,
            name: recentListings[0].name,
            price: recentListings[0].price,
            views_count: recentListings[0].views_count ?? 0,
            whatsapp_clicks: recentListings[0].whatsapp_clicks ?? 0,
          }
        : null;

      res.json({
        profile: {
          uid: user?.uid ?? req.user!.uid,
          business_name: user?.business_name ?? null,
          university: user?.university ?? null,
          email: user?.email ?? null,
          bio: user?.bio ?? null,
          profile_picture: user?.profile_picture ?? null,
          business_logo: user?.business_logo ?? null,
          shop_slug: user?.shop_slug ?? null,
          is_verified: Boolean(user?.is_verified),
          location: user?.location ?? null,
          whatsapp_number: user?.whatsapp_number ?? null,
          phone_number: user?.phone_number ?? null,
          seller_type: user?.seller_type ?? null,
          market_name: user?.market_name ?? null,
          avg_rating: user?.avg_rating ?? null,
          rating_count: user?.rating_count ?? null,
          profile_views: user?.profile_views ?? 0,
          business_type: user?.business_type ?? null,
          business_category: user?.business_category ?? null,
          created_at: user?.created_at ?? null,
          updated_at: user?.updated_at ?? null,
          seller_since: user?.seller_since ?? null,
        },
        stats: {
          total_listings: totals.total_listings ?? 0,
          active_listings: totals.active_listings ?? 0,
          sold_listings: totals.sold_listings ?? 0,
          total_views: totals.total_views ?? 0,
          total_whatsapp_clicks: totals.total_whatsapp_clicks ?? 0,
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

  /**
   * Codespaces tunnel callback guard.
   * Some forwarded-port flows can hit this path before landing on the app root.
   * Redirecting to "/" avoids a white-screen 404 handoff in those cases.
   */
  app.get("/auth/postback/tunnel", (_req, res) => {
    res.redirect(302, "/");
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
    const staticDir = path.resolve(__dirname, "..", "dist");
    app.use(express.static(staticDir));
    app.get("*", (req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
}

startServer();
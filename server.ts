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
import { createPaymentAdminRouter } from "./server/modules/payments/payment.admin.routes.js";
import { createAdminModerationRouter } from "./server/modules/admin/admin.moderation.routes.js";
import { createAdminActionsRouter } from "./server/modules/admin/admin.actions.routes.js";
import { createAdminAccessRouter } from "./server/modules/admin/admin.access.routes.js";
import { createAdminSummaryRouter } from "./server/modules/admin/admin.summary.routes.js";
import { startPayoutReconciliationScheduler } from "./server/modules/payouts/payout.reconciliation.scheduler.js";
import { createEscrowRouter, createDisputeRouter, createPayoutRouter } from "./server/routes/escrowRoutes.js";
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

const db = runMigrations();
const logAdminAction = createAdminAuditLogger(db);

if (getConfiguredAdminEmails().length === 0) {
  console.warn(
    "Admin email list is empty. Set ADMIN_EMAILS (or VITE_ADMIN_EMAILS) to enable admin access."
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure PayChangu webhook receives raw JSON bytes for signature verification.
  app.use('/api/payments/paychangu/webhook', express.raw({ type: 'application/json' }));
  app.use('/api/payments/paychangu-payout/webhook', express.raw({ type: 'application/json' }));

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
  app.use('/api/admin', createPaymentAdminRouter(requireAuth));
  app.use('/api/admin', createAdminAccessRouter(requireAuth));
  app.use('/api/admin', createAdminActionsRouter({ requireAuth, db }));
  app.use('/api/admin', createAdminSummaryRouter({ requireAuth, db }));
  app.use('/api/admin', createAdminModerationRouter({ requireAuth, db, logAdminAction }));
  app.use('/api/escrow', createEscrowRouter(requireFirebaseUser));
  app.use('/api/disputes', createDisputeRouter(requireFirebaseUser));
  app.use('/api/payouts', createPayoutRouter(requireFirebaseUser));
  startPayoutReconciliationScheduler();
  
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
        rows.map((l: any) => serializeListingRow(l))
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
      
db.prepare(`
  INSERT INTO sellers (uid, email, business_name, university, bio, is_verified, is_seller)
VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(uid) DO UPDATE SET
    email = excluded.email,
    business_name = excluded.business_name,
    university = excluded.university,
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

  app.get("/api/profile", requireAuth, (req, res) => {
    const uid = req.user!.uid;
    try {
      const profile = db
        .prepare(
          "SELECT uid, email, business_name, business_logo, profile_picture, university, bio, is_verified, is_seller, join_date FROM sellers WHERE uid = ?"
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
  const { business_name, business_logo, university, bio } = req.body;

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
      SET business_name = ?, business_logo = ?, university = ?, bio = ?
      WHERE uid = ?
    `).run(
      business_name,
      safeLogoUrl,
      university,
      bio ?? null,
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

const seller = db
  .prepare(`
    SELECT is_verified, is_seller, is_suspended
    FROM sellers
    WHERE uid = ?
  `)
  .get(seller_uid) as
    | { is_verified?: number; is_seller?: number; is_suspended?: number }
    | undefined;

if (!seller) {
  return res.status(404).json({ error: "Seller profile not found" });
}

if (seller.is_suspended === 1) {
  return res.status(403).json({ error: "Seller account is suspended" });
}

const approvedApplication = db
  .prepare(`
    SELECT status
    FROM seller_applications
    WHERE applicant_uid = ?
    ORDER BY created_at DESC
    LIMIT 1
  `)
  .get(seller_uid) as { status?: string } | undefined;

const canPostListing =
  seller.is_seller === 1 ||
  seller.is_verified === 1 ||
  approvedApplication?.status === "approved";

if (!canPostListing) {
  return res.status(403).json({ error: "Account not verified" });
}

// Optional safety sync for approved sellers
if (approvedApplication?.status === "approved" && seller.is_seller !== 1) {
  db.prepare(`UPDATE sellers SET is_seller = 1 WHERE uid = ?`).run(seller_uid);
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
  status,
  condition,
  quantity,
  sold_quantity,
  original_price,
  discount_percent,
  deal_label,
  deal_expires_at,
  can_sell_individually,
  listing_mode,
  is_wholesale,
  pack_size,
  bulk_units,
} = req.body;
const allowedConditions = ["new", "used", "refurbished"];
const safeCondition = allowedConditions.includes(condition) ? condition : "used";
const safeName = typeof name === "string" ? name.trim() : "";
const safeCategory = typeof category === "string" ? category.trim() : "";
const safeUniversity = typeof university === "string" ? university.trim() : "";
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

if (!isValidListingHierarchy(safeCategory, safeSubcategory, safeItemType)) {
  return res.status(400).json({ error: "category/subcategory/item_type mismatch" });
}

  const pricing = normalizeListingPricing(req.body);
  const safeListingMode = pricing.listing_mode;
  const isWholesale = safeListingMode === "wholesale" ? true : pricing.is_wholesale === 1;
  const safePackSize = toFiniteNumber(pack_size);
  const safeBulkUnits = toTrimmedString(bulk_units);
  const safeDealExpiresAt = pricing.deal_expires_at;
  const safeCanSellIndividually = pricing.can_sell_individually;

  if (pricing.price <= 0) {
    return res.status(400).json({ error: "Price must be greater than 0" });
  }

  if (
    pricing.discount_percent !== null &&
    (pricing.discount_percent <= 0 || pricing.discount_percent > 100)
  ) {
    return res.status(400).json({ error: "Discount percent must be between 1 and 100" });
  }

  if (isWholesale) {
    if (!safePackSize || safePackSize < 1 || !Number.isInteger(safePackSize)) {
      return res.status(400).json({ error: "Wholesale pack size must be a whole number of at least 1" });
    }

    if (!safeBulkUnits) {
      return res.status(400).json({ error: "Wholesale bulk units are required" });
    }
  }

  try {
    const info = db.prepare(`
  INSERT INTO listings (
    seller_uid,
    name,
    price,
    original_price,
    discount_percent,
    deal_label,
    deal_expires_at,
    can_sell_individually,
    single_item_price,
    listing_mode,
    is_wholesale,
    pack_size,
    bulk_units,
    description,
    category,
    subcategory,
    item_type,
    spec_values,
    university,
    photos,
    video_url,
    status,
    condition,
    quantity,
    sold_quantity
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  seller_uid,
  safeName,
  pricing.price,
  pricing.original_price,
  pricing.discount_percent,
  pricing.deal_label,
  safeDealExpiresAt,
  safeCanSellIndividually,
  pricing.single_item_price,
  safeListingMode,
  isWholesale ? 1 : 0,
  safePackSize ?? null,
  safeBulkUnits ?? null,
  description ?? null,
  safeCategory,
  safeSubcategory,
  safeItemType,
  safeSpecValues,
  safeUniversity,
  JSON.stringify(safePhotos),
  safeVideoUrl,
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
        WHERE l.seller_uid = ? AND l.is_hidden = 0 AND l.deleted_at IS NULL
        ORDER BY l.created_at DESC
      `)
      .all(uid);

    res.json(
      rows.map((l: any) => serializeListingRow(l))
    );
  } catch (e: any) {
    console.error("GET /api/users/:uid/listings error:", e);
    res.status(500).json({ error: "Failed to load user listings" });
  }
});

app.get("/api/users/:uid/rating-summary", attachOptionalAuth, (req, res) => {
  const { uid } = req.params;
  const rater_uid = req.user?.uid ?? null;

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

    const mine = rater_uid
      ? (db
          .prepare(`
            SELECT stars
            FROM seller_ratings
            WHERE seller_uid = ? AND rater_uid = ?
          `)
          .get(uid, rater_uid) as { stars: number } | undefined)
      : undefined;

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
    // Load listing row for ownership and soft-delete state
    const listing = db
      .prepare("SELECT id, seller_uid, deleted_at FROM listings WHERE id = ?")
      .get(id) as { id: number; seller_uid: string; deleted_at?: string | null } | undefined;

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Ownership check (keep exactly as before)
    if (listing.seller_uid !== uid) {
      return res.status(403).json({ error: "Forbidden: not your listing" });
    }

    if (listing.deleted_at) {
      return res.status(404).json({ error: "Listing not found" });
    }

    db.prepare(`
      UPDATE listings
      SET
        deleted_at = CURRENT_TIMESTAMP,
        deleted_by_uid = ?,
        hard_delete_after = datetime('now', '+90 days'),
        is_hidden = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(uid, id);

    return res.json({ success: true, hard_delete_after_days: 90 });
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
if (v.is_suspended === 1) {
  return res.status(403).json({ error: "Seller account is suspended" });
}

const approvedApplication = db
  .prepare(`
    SELECT status
    FROM seller_applications
    WHERE applicant_uid = ?
    ORDER BY created_at DESC
    LIMIT 1
  `)
  .get(uid) as { status?: string } | undefined;

const canEditListing =
  v.is_seller === 1 ||
  v.is_verified === 1 ||
  approvedApplication?.status === "approved";

if (!canEditListing) {
  return res.status(403).json({ error: "Seller approval required to edit listings" });
}

if (approvedApplication?.status === "approved" && v.is_seller !== 1) {
  db.prepare(`UPDATE sellers SET is_seller = 1 WHERE uid = ?`).run(uid);
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
      status,
      condition,
      quantity,
      sold_quantity,
      original_price,
      discount_percent,
      deal_label,
      deal_expires_at,
      can_sell_individually,
      listing_mode,
      is_wholesale,
      pack_size,
      bulk_units,
    } = req.body;
    const allowedConditions = ["new", "used", "refurbished"];
    const safeCondition = allowedConditions.includes(condition) ? condition : "used";
    const safeName = typeof name === "string" ? name.trim() : "";
    const safeCategory = typeof category === "string" ? category.trim() : "";
    const safeUniversity = typeof university === "string" ? university.trim() : "";
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

const existingListing = db
  .prepare("SELECT id, seller_uid, listing_mode FROM listings WHERE id = ? AND deleted_at IS NULL")
  .get(id) as { id: number; seller_uid: string; listing_mode: "normal" | "deal" | "wholesale" } | undefined;

if (!existingListing) {
  return res.status(404).json({ error: "Listing not found" });
}

if (existingListing.seller_uid !== uid) {
  return res.status(403).json({ error: "Forbidden: not your listing" });
}

const pricing = normalizeListingPricing(req.body, existingListing.listing_mode);
const safeListingMode = pricing.listing_mode;
const isWholesale = safeListingMode === "wholesale" ? true : pricing.is_wholesale === 1;
const safePackSize = toFiniteNumber(pack_size);
const safeBulkUnits = toTrimmedString(bulk_units);
const safeDealExpiresAt = pricing.deal_expires_at;
const safeCanSellIndividually = pricing.can_sell_individually;

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

  if (!isValidListingHierarchy(safeCategory, safeSubcategory, safeItemType)) {
    return res.status(400).json({ error: "category/subcategory/item_type mismatch" });
  }

  if (pricing.price <= 0) {
    return res.status(400).json({ error: "Price must be greater than 0" });
  }

  if (
    pricing.discount_percent !== null &&
    (pricing.discount_percent <= 0 || pricing.discount_percent > 100)
  ) {
    return res.status(400).json({ error: "Discount percent must be between 1 and 100" });
  }

  if (isWholesale) {
    if (!safePackSize || safePackSize < 1 || !Number.isInteger(safePackSize)) {
      return res.status(400).json({ error: "Wholesale pack size must be a whole number of at least 1" });
    }

    if (!safeBulkUnits) {
      return res.status(400).json({ error: "Wholesale bulk units are required" });
    }
  }

  try {
    db.prepare(`
      UPDATE listings
      SET
        name = ?,
        price = ?,
        original_price = ?,
        discount_percent = ?,
        deal_label = ?,
        deal_expires_at = ?,
        can_sell_individually = ?,
        single_item_price = ?,
        listing_mode = ?,
        is_wholesale = ?,
        pack_size = ?,
        bulk_units = ?,
        description = ?,
        category = ?,
        subcategory = ?,
        item_type = ?,
        spec_values = ?,
        university = ?,
        photos = ?,
        video_url = ?,
        status = ?,
        condition = ?,
        quantity = ?,
        sold_quantity = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      safeName,
      numericPrice,
      pricing.original_price,
      pricing.discount_percent,
      pricing.deal_label,
      safeDealExpiresAt,
      safeCanSellIndividually,
      pricing.single_item_price,
      safeListingMode,
      isWholesale ? 1 : 0,
      safePackSize ?? null,
      safeBulkUnits ?? null,
      description ?? null,
      safeCategory,
      safeSubcategory,
      safeItemType,
      safeSpecValues,
      safeUniversity,
      JSON.stringify(safePhotos),
      safeVideoUrl,
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
      .prepare("SELECT id, seller_uid FROM listings WHERE id = ? AND deleted_at IS NULL")
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

app.post("/api/listings/:id/record-sale", requireAuth, (req, res) => {
  const uid = req.user!.uid;
  const id = Number(req.params.id);
  const quantity = Number(req.body?.quantity ?? 1);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "quantity must be greater than 0" });
  }

  try {
    const listing = db
      .prepare(
        "SELECT id, seller_uid, quantity, sold_quantity, status FROM listings WHERE id = ? AND deleted_at IS NULL"
      )
      .get(id) as
      | {
          id: number;
          seller_uid: string;
          quantity: number;
          sold_quantity: number;
          status: string;
        }
      | undefined;

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    if (listing.seller_uid !== uid) {
      return res.status(403).json({ error: "Forbidden: not your listing" });
    }

    const available = Math.max(0, Number(listing.quantity) - Number(listing.sold_quantity));
    if (quantity > available) {
      return res.status(400).json({
        error: `Cannot record ${quantity} sale(s). Only ${available} item(s) available.`,
      });
    }

    const nextSoldQuantity = Number(listing.sold_quantity) + quantity;
    const nextStatus = nextSoldQuantity >= Number(listing.quantity) ? "sold" : listing.status;

    db.prepare(`
      UPDATE listings
      SET
        sold_quantity = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nextSoldQuantity, nextStatus, id);

    const updated = db
      .prepare(
        "SELECT id, quantity, sold_quantity, status FROM listings WHERE id = ? AND deleted_at IS NULL LIMIT 1"
      )
      .get(id);

    return res.json({
      success: true,
      listing: updated,
      available_quantity: Math.max(0, Number(listing.quantity) - nextSoldQuantity),
    });
  } catch (error) {
    console.error("POST /api/listings/:id/record-sale error:", error);
    return res.status(500).json({ error: "Failed to record sale" });
  }
});

app.post("/api/listings/:id/restock", requireAuth, (req, res) => {
  const uid = req.user!.uid;
  const id = Number(req.params.id);
  const quantity = Number(req.body?.quantity ?? 1);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "quantity must be greater than 0" });
  }

  try {
    const listing = db
      .prepare(
        "SELECT id, seller_uid, quantity, sold_quantity, status FROM listings WHERE id = ? AND deleted_at IS NULL"
      )
      .get(id) as
      | {
          id: number;
          seller_uid: string;
          quantity: number;
          sold_quantity: number;
          status: string;
        }
      | undefined;

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    if (listing.seller_uid !== uid) {
      return res.status(403).json({ error: "Forbidden: not your listing" });
    }

    const nextQuantity = Number(listing.quantity) + quantity;
    const nextStatus =
      listing.status === "sold" && Number(listing.sold_quantity) < nextQuantity
        ? "available"
        : listing.status;

    db.prepare(`
      UPDATE listings
      SET
        quantity = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nextQuantity, nextStatus, id);

    const updated = db
      .prepare(
        "SELECT id, quantity, sold_quantity, status FROM listings WHERE id = ? AND deleted_at IS NULL LIMIT 1"
      )
      .get(id);

    return res.json({
      success: true,
      listing: updated,
      available_quantity: Math.max(0, nextQuantity - Number(listing.sold_quantity)),
    });
  } catch (error) {
    console.error("POST /api/listings/:id/restock error:", error);
    return res.status(500).json({ error: "Failed to restock listing" });
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

type ExpiredListingRow = {
  id: number;
  photos: string | null;
  video_url?: string | null;
};

async function purgeExpiredSoftDeletedListings() {
  const expiredListings = db
    .prepare(`
      SELECT id, photos, video_url
      FROM listings
      WHERE deleted_at IS NOT NULL
        AND hard_delete_after IS NOT NULL
        AND hard_delete_after <= CURRENT_TIMESTAMP
      LIMIT 50
    `)
    .all() as ExpiredListingRow[];

  for (const listing of expiredListings) {
    const mediaUrls: string[] = [];
    try {
      const parsedPhotos = JSON.parse(listing.photos || "[]");
      if (Array.isArray(parsedPhotos)) {
        mediaUrls.push(...parsedPhotos.filter((url) => typeof url === "string"));
      }
    } catch (error) {
      console.warn("Failed to parse photos JSON for expired listing", listing.id, error);
    }

    if (listing.video_url && listing.video_url.trim().length > 0) {
      mediaUrls.push(listing.video_url);
    }

    const publicIds = Array.from(
      new Set(
        mediaUrls
          .map((url) => cloudinaryPublicIdFromUrl(url))
          .filter((publicId): publicId is string => Boolean(publicId))
      )
    );

    for (const publicId of publicIds) {
      try {
        let result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
        if (result?.result === "not found") {
          result = await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
        }
      } catch (error) {
        console.warn("Failed to purge Cloudinary asset for expired listing", listing.id, publicId, error);
      }
    }

    try {
      db.prepare("DELETE FROM reports WHERE listing_id = ?").run(listing.id);
      db.prepare("DELETE FROM listings WHERE id = ? AND deleted_at IS NOT NULL").run(listing.id);
    } catch (error) {
      console.warn("Failed to purge expired listing row", listing.id, error);
    }
  }
}

let listingPurgeRunning = false;
function scheduleExpiredListingPurge() {
  const runPurge = () => {
    if (listingPurgeRunning) return;
    listingPurgeRunning = true;
    purgeExpiredSoftDeletedListings()
      .catch((error) => console.warn("Expired listing purge failed:", error))
      .finally(() => {
        listingPurgeRunning = false;
      });
  };

  runPurge();
  setInterval(runPurge, 24 * 60 * 60 * 1000).unref?.();
}

scheduleExpiredListingPurge();

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
      .prepare("SELECT id FROM listings WHERE id = ? AND is_hidden = 0 AND deleted_at IS NULL")
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

  // Admin routes moved to server/modules/admin/*.routes.ts

app.post("/api/listings/:id/view", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  try {
    const listing = db
      .prepare("SELECT id FROM listings WHERE id = ? AND is_hidden = 0 AND deleted_at IS NULL")
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
      .prepare("SELECT id FROM listings WHERE id = ? AND is_hidden = 0 AND deleted_at IS NULL")
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
        WHERE seller_uid = ? AND deleted_at IS NULL
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
        WHERE seller_uid = ? AND deleted_at IS NULL
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
        WHERE seller_uid = ? AND deleted_at IS NULL
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

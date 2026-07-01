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
import { createConnectRouter } from "./server/modules/connect/connect.routes.js";
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
  app.set("trust proxy", 1);
  const PORT = Number(process.env.PORT) || 3000;
  
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
  app.use('/api/connect', createConnectRouter(requireFirebaseUser));
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
  orderBy = `
    ORDER BY CASE 
      WHEN l.status = 'sold' OR l.sold_quantity >= l.quantity THEN 1 
      ELSE 0 
    END ASC, 
    l.views_count DESC, 
    l.created_at DESC
  `;
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, Number(pageSize) || 12));
  const offset = (pageNum - 1) * pageSizeNum;

  const listings = db.prepare(`
    SELECT 
      l.id,
      l.name,
      l.price,
      l.original_price,
      l.discount_percent,
      l.deal_label,
      l.listing_mode,
      l.deal_expires_at,
      l.is_wholesale,
      l.can_sell_individually,
      l.description,
      l.category,
      l.subcategory,
      l.item_type,
      l.spec_values,
      l.university,
      l.is_seller,
      l.photos,
      l.video_url,
      l.status,
      l.condition,
      l.views_count,
      l.whatsapp_clicks,
      l.is_hidden,
      l.deleted_at,
      l.quantity,
      l.sold_quantity,
      l.single_item_price,
      l.created_at,
      l.updated_at,
      s.uid as seller_uid,
      s.email as seller_email,
      s.business_name,
      s.business_logo,
      s.is_verified,
      s.is_seller as seller_flag
    ${baseQuery}
    ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, pageSizeNum, offset).map(serializeListingRow);

  res.json(listings);
});

  // ... rest of file unchanged ...
}

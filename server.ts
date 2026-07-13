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
  app.use('/api/cart', createCartRouter(requireFirebaseUser));
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

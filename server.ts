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
  
  app.use('/api/payments/paychangu/webhook', express.raw({ type: 'application/json' }));
  app.use('/api/payments/paychangu-payout/webhook', express.raw({ type: 'application/json' }));

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
  
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

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
}

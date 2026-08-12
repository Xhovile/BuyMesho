import type { Express } from "express";
import { mountTotpRoutes } from "../totpServer.js";
import { registerSessionRoutes } from "../auth/sessionRoutes.js";
import { registerValidatorRoutes } from "./validator.routes.js";
import { registerValidatorProjectionRoutes } from "./validatorProjection.routes.js";
import { registerAccountDeletionRoutes } from "../auth/accountDeletionRoutes.js";
import { registerVerificationEmailRoutes } from "../auth/verificationEmailRoutes.js";
import { registerMessageModerationRoutes, registerMessageRoutes } from "./messageHubRoutes.js";
import { registerMessagesRoutes } from "./messagesRoutes.js";
import { registerReviewsRoutes } from "./reviewsRoutes.js";
import { registerDiagnosticsRoutes } from "./diagnostics.routes.js";
import { registerListingRoutes } from "./listings.routes.js";
import { registerEventRoutes } from "./events.routes.js";
import { registerEventCreatorOverviewRoutes } from "./eventCreatorOverview.routes.js";
import { registerAiRoutes } from "./ai.routes.js";
import { registerSellerApplicationRoutes } from "./sellerApplication.routes.js";
import { createPaymentRouter } from "../modules/payments/payment.routes.js";
import { createPaymentAdminActionRouter } from "../modules/payments/payment.admin.actions.routes.js";
import { createPaymentAdminPayoutDisplayRouter } from "../modules/payments/payment.admin.payout.display.routes.js";
import { createPaymentAdminPayoutRouter } from "../modules/payments/payment.admin.payout.routes.js";
import { createPaymentAdminRouter } from "../modules/payments/payment.admin.routes.js";
import { createPaymentAdminDetailRouter } from "../modules/payments/payment.admin.detail.routes.js";
import { createPaymentAdminReconcileRouter } from "../modules/payments/payment.admin.reconcile.routes.js";
import { createAdminModerationRouter } from "../modules/admin/admin.moderation.routes.js";
import { createAdminActionsRouter } from "../modules/admin/admin.actions.routes.js";
import { createAdminAccessRouter } from "../modules/admin/admin.access.routes.js";
import { createAdminSummaryRouter } from "../modules/admin/admin.summary.routes.js";
import { createAdminEventModerationRouter } from "../modules/admin/admin.events.routes.js";
import { createEscrowRouter } from "../routes/escrowRoutes.js";
import { createBuyerEscrowRouter } from "../routes/escrow/buyerEscrowRoutes.js";
import { createOrderRouter } from "./orderRoutes.js";
import { createDisputeRouter } from "../routes/escrow/disputeRoutes.js";
import { createPayoutRouter } from "../routes/escrow/payoutRoutes.js";
import { createCartRouter } from "./cart.routes.js";
import { getConfiguredAdminEmails } from "../auth/adminAccess.js";
import { getFirebaseAdmin } from "../auth/firebaseAdmin.js";
import { isAdminActionType, isAdminTargetType, type AdminActionType, type AdminTargetType } from "../../src/modules/admin/shared/adminAuditTypes.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireFirebaseUser } from "../middleware/requireFirebaseUser.js";

export type LogAdminActionArgs = {
  admin_uid?: string | null;
  admin_email?: string | null;
  action_type: AdminActionType;
  target_type: AdminTargetType;
  target_id?: string | null;
  details?: unknown;
};

export type RouteDeps = {
  db: any;
  requireAuth: typeof requireAuth;
  requireFirebaseUser: typeof requireFirebaseUser;
};

function installPostgresMessageSchemaGuard(db: any) {
  if (!process.env.DATABASE_URL || !db || typeof db.exec !== "function") return;

  const installedFlag = Symbol.for("buymesho.postgresMessageSchemaGuardInstalled");
  if (db[installedFlag]) return;
  db[installedFlag] = true;

  const originalExec = db.exec.bind(db) as (sql: string) => void;
  db.exec = (sql: string) => {
    const normalizedSql = sql.replace(
      /ALTER\s+TABLE\s+conversations\s+ADD\s+COLUMN\s+event_id\s+INTEGER(?!\s+IF\s+NOT\s+EXISTS)/gi,
      "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS event_id INTEGER",
    );
    return originalExec(normalizedSql);
  };

  if (typeof db.pragma === "function") {
    db.pragma = () => undefined;
  }
}

export function registerRoutes(app: Express, deps: RouteDeps) {
  const { db, requireAuth, requireFirebaseUser } = deps;

  if (getConfiguredAdminEmails().length === 0) {
    console.warn("Admin email list is empty. Set ADMIN_EMAILS (or VITE_ADMIN_EMAILS) to enable admin access.");
  }

  function logAdminAction({ admin_uid, admin_email, action_type, target_type, target_id, details }: LogAdminActionArgs) {
    if (!isAdminActionType(action_type) || !isAdminTargetType(target_type)) {
      console.warn("Skipped invalid admin action log entry", { action_type, target_type });
      return;
    }
    try {
      db.prepare(`INSERT INTO admin_actions (admin_uid, admin_email, action_type, target_id, details, target_type) VALUES (?, ?, ?, ?, ?, ?)`).run(
        admin_uid ?? null,
        admin_email ?? null,
        action_type,
        target_id ?? null,
        details ? JSON.stringify(details) : null,
        target_type,
      );
    } catch (error) {
      console.warn("Failed to log admin action:", error);
    }
  }

  registerVerificationEmailRoutes(app);

  registerValidatorProjectionRoutes(app);
  registerValidatorRoutes(app);
  registerSessionRoutes(app);

  registerAccountDeletionRoutes(app);
  registerMessageRoutes(app);
  registerMessageModerationRoutes(app);
  installPostgresMessageSchemaGuard(db);
  registerMessagesRoutes(app);
  registerReviewsRoutes(app);
  registerDiagnosticsRoutes(app, { db });
  registerListingRoutes(app, { db });
  registerEventRoutes(app, { db });
  registerEventCreatorOverviewRoutes(app, { db });
  registerAiRoutes(app, requireFirebaseUser, db);
  registerSellerApplicationRoutes(app, { db });
  mountTotpRoutes(app);

  // Buyer profile is authenticated and intentionally lives before the SPA fallback.
  app.get("/api/profile", requireFirebaseUser, async (req: any, res) => {
    const uid = String(req.user?.uid ?? "").trim();
    if (!uid) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      let profile: any = null;

      try {
        const firebaseAdmin = getFirebaseAdmin();
        const userSnap = await firebaseAdmin.firestore().collection("users").doc(uid).get();
        if (userSnap.exists) {
          profile = userSnap.data() ?? null;
        }
      } catch (error) {
        console.warn("Failed to read Firestore profile; continuing with server profile data", error);
      }

      let seller: any = null;
      try {
        seller = db.prepare(`
          SELECT uid, email, business_name, business_logo, university, bio,
                 is_verified, is_seller, join_date
          FROM sellers
          WHERE uid = ?
          LIMIT 1
        `).get(uid);
      } catch (error) {
        console.warn("Failed to read seller profile data", error);
      }

      const firebaseUser = req.user?.firebaseUser ?? req.firebaseUser ?? null;
      const email = profile?.email ?? seller?.email ?? firebaseUser?.email ?? "";

      return res.json({
        uid,
        email,
        display_name: profile?.display_name ?? profile?.displayName ?? null,
        university: profile?.university ?? seller?.university ?? null,
        phone: profile?.phone ?? null,
        bio: profile?.bio ?? seller?.bio ?? null,
        business_name: profile?.business_name ?? seller?.business_name ?? null,
        business_logo: profile?.business_logo ?? seller?.business_logo ?? null,
        is_verified: !!(profile?.is_verified ?? seller?.is_verified),
        is_seller: !!(profile?.is_seller ?? seller?.is_seller),
        join_date: profile?.join_date ?? seller?.join_date ?? null,
      });
    } catch (error) {
      console.error("Failed to load profile", error);
      return res.status(500).json({ error: "Failed to load profile" });
    }
  });

  app.use("/api/cart", createCartRouter(requireFirebaseUser));

  app.use("/api/payments/orders", createOrderRouter(requireAuth));
  app.use("/api/seller/escrows", createBuyerEscrowRouter(requireAuth));
  app.use("/api/payments", createPaymentRouter(requireFirebaseUser));
  app.use("/api/admin", createPaymentAdminActionRouter(requireAuth));
  app.use("/api/admin", createPaymentAdminPayoutDisplayRouter(requireAuth));
  app.use("/api/admin", createPaymentAdminPayoutRouter(requireAuth));
  app.use("/api/admin", createPaymentAdminRouter(requireAuth));
  app.use("/api/admin", createAdminAccessRouter(requireAuth));
  app.use("/api/admin", createAdminActionsRouter({ requireAuth, db }));
  app.use("/api/admin", createAdminSummaryRouter({ requireAuth, db }));
  app.use("/api/admin", createAdminModerationRouter({ requireAuth, db, logAdminAction }));
  app.use("/api/admin", createAdminEventModerationRouter({ requireAuth, db, logAdminAction }));
  app.use("/api/escrow", createEscrowRouter(requireFirebaseUser));
  app.use("/api/disputes", createDisputeRouter(requireFirebaseUser));
  app.use("/api/payouts", createPayoutRouter(requireFirebaseUser));
}

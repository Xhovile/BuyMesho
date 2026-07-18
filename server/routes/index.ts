import type { Express } from "express";
import { mountTotpRoutes } from "../totpServer.js";
import { registerSessionRoutes } from "../auth/sessionRoutes.js";
import { registerAccountDeletionRoutes } from "../auth/accountDeletionRoutes.js";
import { registerVerificationEmailRoutes } from "../auth/verificationEmailRoutes.js";
import { registerMessageModerationRoutes, registerMessageRoutes } from "./messageHubRoutes.js";
import { registerMessagesRoutes } from "./messagesRoutes.js";
import { registerReviewsRoutes } from "./reviewsRoutes.js";
import { registerDiagnosticsRoutes } from "./diagnostics.routes.js";
import { registerListingRoutes } from "./listings.routes.js";
import { createPaymentRouter } from "../modules/payments/payment.routes.js";
import { createPaymentAdminRouter } from "../modules/payments/payment.admin.routes.js";
import { createAdminModerationRouter } from "../modules/admin/admin.moderation.routes.js";
import { createAdminActionsRouter } from "../modules/admin/admin.actions.routes.js";
import { createAdminAccessRouter } from "../modules/admin/admin.access.routes.js";
import { createAdminSummaryRouter } from "../modules/admin/admin.summary.routes.js";
import { createEscrowRouter } from "../routes/escrowRoutes.js";
import { createBuyerEscrowRouter } from "../routes/escrow/buyerEscrowRoutes.js";
import { createOrderRouter } from "./orderRoutes.js";
import { createDisputeRouter } from "../routes/escrow/disputeRoutes.js";
import { createPayoutRouter } from "../routes/escrow/payoutRoutes.js";
import { getConfiguredAdminEmails } from "../auth/adminAccess.js";
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

export function registerRoutes(app: Express, deps: RouteDeps) {
  const { db, requireAuth, requireFirebaseUser } = deps;

  if (getConfiguredAdminEmails().length === 0) {
    console.warn(
      "Admin email list is empty. Set ADMIN_EMAILS (or VITE_ADMIN_EMAILS) to enable admin access."
    );
  }

  function logAdminAction({
    admin_uid,
    admin_email,
    action_type,
    target_type,
    target_id,
    details,
  }: LogAdminActionArgs) {
    if (!isAdminActionType(action_type) || !isAdminTargetType(target_type)) {
      console.warn("Skipped invalid admin action log entry", { action_type, target_type });
      return;
    }

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
    } catch (error) {
      console.warn("Failed to log admin action:", error);
    }
  }

  registerVerificationEmailRoutes(app);
  registerSessionRoutes(app);
  registerAccountDeletionRoutes(app);
  registerMessageRoutes(app);
  registerMessageModerationRoutes(app);
  registerMessagesRoutes(app);
  registerReviewsRoutes(app);
  registerDiagnosticsRoutes(app, { db });
  registerListingRoutes(app, { db });
  mountTotpRoutes(app);

  app.use("/api/payments/orders", createOrderRouter(requireAuth));
  app.use("/api/seller/escrows", createBuyerEscrowRouter(requireAuth));

  app.use("/api/payments", createPaymentRouter(requireFirebaseUser));
  app.use("/api/admin", createPaymentAdminRouter(requireAuth));
  app.use("/api/admin", createAdminAccessRouter(requireAuth));
  app.use("/api/admin", createAdminActionsRouter({ requireAuth, db }));
  app.use("/api/admin", createAdminSummaryRouter({ requireAuth, db }));
  app.use("/api/admin", createAdminModerationRouter({ requireAuth, db, logAdminAction }));
  app.use("/api/escrow", createEscrowRouter(requireFirebaseUser));
  app.use("/api/disputes", createDisputeRouter(requireFirebaseUser));
  app.use("/api/payouts", createPayoutRouter(requireFirebaseUser));
}

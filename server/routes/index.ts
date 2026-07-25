import type { Express, NextFunction, Request, Response } from "express";
import { mountTotpRoutes } from "../totpServer.js";
import { registerSessionRoutes } from "../auth/sessionRoutes.js";
import { registerAccountDeletionRoutes } from "../auth/accountDeletionRoutes.js";
import { registerVerificationEmailRoutes } from "../auth/verificationEmailRoutes.js";
import { registerMessageModerationRoutes, registerMessageRoutes } from "./messageHubRoutes.js";
import { registerMessagesRoutes } from "./messagesRoutes.js";
import { registerReviewsRoutes } from "./reviewsRoutes.js";
import { registerDiagnosticsRoutes } from "./diagnostics.routes.js";
import { registerListingRoutes } from "./listings.routes.js";
import { registerEventRoutes } from "./events.routes.js";
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
import { PAYOUT_POLICY, isRetryableFailureCode } from "../modules/payouts/payout.policy.js";

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

function logAdminActionFallback(message: string, error: unknown) {
  console.warn(message, error);
}

function findSellerVerifiedDefaultPayoutDestination(db: any, sellerId: string): {
  id: string;
  destination_type: string | null;
  masked_account: string | null;
  verification_status: string | null;
  is_active: number | null;
  last_error: string | null;
} | null {
  const row = db
    .prepare(
      `SELECT
         id,
         destination_type,
         masked_account,
         verification_status,
         is_active,
         last_error
       FROM seller_payout_accounts
       WHERE seller_uid = ?
         AND is_active = 1
         AND verification_status = 'verified'
       ORDER BY is_default DESC, updated_at DESC, created_at DESC
       LIMIT 1`,
    )
    .get(sellerId) as
    | {
        id: string;
        destination_type: string | null;
        masked_account: string | null;
        verification_status: string | null;
        is_active: number | null;
        last_error: string | null;
      }
    | undefined;

  return row ?? null;
}

function hydratePayoutDestinationRow(db: any, row: Record<string, unknown>): Record<string, unknown> {
  const sellerId = String(row.sellerId ?? row.seller_id ?? "").trim();
  if (!sellerId) return row;

  const destinationAccountId = String(row.destinationAccountId ?? row.destination_account_id ?? "").trim();
  const destinationVerificationStatus = String(row.destinationVerificationStatus ?? "missing").trim().toLowerCase();
  const destinationActive = Number(row.destinationIsActive ?? row.destination_active ?? 0) === 1;
  const destinationMissing = !destinationAccountId || destinationVerificationStatus === "missing";
  const destinationUnavailable = destinationVerificationStatus === "disabled" || !destinationActive;
  const shouldFallback = destinationMissing || destinationUnavailable;

  if (!shouldFallback) return row;

  const fallback = findSellerVerifiedDefaultPayoutDestination(db, sellerId);
  if (!fallback) return row;

  const currentStatus = String(row.status ?? "").trim().toLowerCase();
  const sellerSuspended = Number(row.sellerSuspended ?? row.seller_suspended ?? 0) === 1;
  const attemptCount = Number(row.attemptCount ?? row.attempt_count ?? 0);
  const failureReason = (row.failureReason ?? row.failure_reason ?? null) as string | null;
  const resolvedDestinationVerificationStatus = String(fallback.verification_status ?? "verified").trim().toLowerCase();
  const resolvedDestinationActive = Number(fallback.is_active ?? 1) === 1;

  const verificationBlockers: string[] = [];
  if (sellerSuspended) {
    verificationBlockers.push("Seller payouts are suspended");
  }
  if (resolvedDestinationVerificationStatus !== "verified" || !resolvedDestinationActive) {
    verificationBlockers.push(
      resolvedDestinationVerificationStatus === "failed"
        ? "Destination verification failed"
        : resolvedDestinationVerificationStatus === "disabled" || !resolvedDestinationActive
          ? "Destination is disabled"
          : "Destination pending verification",
    );
  }

  const hasRetryableFailureContext =
    currentStatus === "held"
      ? !failureReason || isRetryableFailureCode(failureReason)
      : isRetryableFailureCode(failureReason);

  const retryEligible =
    (currentStatus === "failed" || currentStatus === "held") &&
    attemptCount < PAYOUT_POLICY.maxRetryCount &&
    hasRetryableFailureContext &&
    !sellerSuspended &&
    resolvedDestinationVerificationStatus === "verified" &&
    resolvedDestinationActive;

  return {
    ...row,
    destinationAccountId: fallback.id,
    destinationMaskedAccount: fallback.masked_account ?? row.destinationMaskedAccount ?? null,
    destinationType: fallback.destination_type ?? row.destinationType ?? null,
    destinationVerificationStatus: resolvedDestinationVerificationStatus,
    destinationIsActive: resolvedDestinationActive ? 1 : 0,
    destinationLastError: fallback.last_error ?? row.destinationLastError ?? null,
    verificationBlockers,
    retryEligible,
    retryBlockedReason: retryEligible
      ? null
      : sellerSuspended
        ? "Seller payouts are suspended"
        : resolvedDestinationVerificationStatus !== "verified" || !resolvedDestinationActive
          ? "Destination pending verification"
          : currentStatus !== "failed"
            ? `Retry unavailable while payout is ${currentStatus}`
            : "Retry unavailable due to policy gate",
    destinationRecoveredFromFallback: true,
  };
}

function hydratePayoutDestinationResponse(db: any, body: unknown): unknown {
  if (Array.isArray(body)) {
    return body.map((row) => (row && typeof row === "object" && !Array.isArray(row) ? hydratePayoutDestinationRow(db, row as Record<string, unknown>) : row));
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }

  const payload = body as Record<string, unknown>;
  if (Array.isArray(payload.rows)) {
    return {
      ...payload,
      rows: payload.rows.map((row) => (row && typeof row === "object" && !Array.isArray(row) ? hydratePayoutDestinationRow(db, row as Record<string, unknown>) : row)),
    };
  }

  return body;
}

function installPayoutDestinationHydrator(app: Express, db: any) {
  app.use("/api/admin", (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      try {
        if (req.originalUrl.startsWith("/api/admin/payouts")) {
          body = hydratePayoutDestinationResponse(db, body);
        }
      } catch (error) {
        logAdminActionFallback("Failed to hydrate payout destination fallback", error);
      }

      return originalJson(body as never);
    }) as typeof res.json;

    next();
  });
}

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
  registerEventRoutes(app, { db });
  mountTotpRoutes(app);

  installPayoutDestinationHydrator(app, db);

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

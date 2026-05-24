import type Database from "better-sqlite3";
import express, { type RequestHandler } from "express";
import { hasAdminAccess } from "../../auth/adminAccess.js";
import { adminApiLimiter } from "./admin.rateLimit.js";

export function createAdminSummaryRouter(params: {
  requireAuth: RequestHandler;
  db: Database.Database;
}): express.Router {
  const router = express.Router();
  const { requireAuth, db } = params;

  router.get("/summary", adminApiLimiter, requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    try {
      const contentOpenRow = db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'open'").get() as { count: number } | undefined;
      const messageOpenRow = db.prepare("SELECT COUNT(*) as count FROM message_reports WHERE status = 'open'").get() as { count: number } | undefined;
      const sellerPendingRow = db.prepare("SELECT COUNT(*) as count FROM seller_applications WHERE status = 'pending'").get() as { count: number } | undefined;

      return res.json({
        contentOpen: Number(contentOpenRow?.count ?? 0),
        messageOpen: Number(messageOpenRow?.count ?? 0),
        sellerPending: Number(sellerPendingRow?.count ?? 0),
      });
    } catch (error) {
      console.error("Admin summary fetch error:", error);
      return res.status(500).json({ error: "Failed to load admin summary" });
    }
  });

  router.get("/payout-destination-requests", adminApiLimiter, requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    try {
      const rawLimit = Array.isArray(req.query?.limit)
        ? req.query.limit[0]
        : req.query?.limit;

      const rawOffset = Array.isArray(req.query?.offset)
        ? req.query.offset[0]
        : req.query?.offset;

      const parsedLimit = Number(rawLimit);
      const parsedOffset = Number(rawOffset);

      const limit = Number.isFinite(parsedLimit)
        ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 200)
        : 100;

      const offset = Number.isFinite(parsedOffset)
        ? Math.max(Math.trunc(parsedOffset), 0)
        : 0;

      const totalRow = db.prepare(`
        SELECT COUNT(*) AS total
        FROM seller_payout_accounts spa
        LEFT JOIN sellers s ON s.uid = spa.seller_uid
        WHERE spa.destination_type IS NOT NULL
          AND (
            COALESCE(spa.verification_status, 'pending') <> 'verified'
            OR COALESCE(spa.is_active, 0) = 0
            OR COALESCE(spa.last_error, '') <> ''
            OR COALESCE(s.is_suspended, 0) = 1
          )
      `).get() as { total?: number } | undefined;

      const rows = db.prepare(`
        SELECT
          spa.id AS destinationAccountId,
          spa.id,
          spa.seller_uid AS sellerId,
          s.email AS sellerEmail,
          s.business_name AS sellerBusinessName,
          s.university AS sellerUniversity,
          spa.destination_type AS destinationType,
          spa.masked_account AS destinationMaskedAccount,
          spa.provider_name AS destinationProviderName,
          spa.provider_ref_id AS destinationProviderRefId,
          spa.verification_status AS destinationVerificationStatus,
          spa.is_active AS destinationActive,
          spa.last_error AS destinationLastError,
          spa.verified_at AS verifiedAt,
          spa.verification_attempts AS verificationAttempts,
          spa.created_at AS createdAt,
          spa.updated_at AS updatedAt,
          COALESCE(s.is_suspended, 0) AS sellerSuspended,
          (
            SELECT COUNT(*)
            FROM payouts p
            WHERE p.destination_account_id = spa.id
          ) AS payoutCount
        FROM seller_payout_accounts spa
        LEFT JOIN sellers s ON s.uid = spa.seller_uid
        WHERE spa.destination_type IS NOT NULL
          AND (
            COALESCE(spa.verification_status, 'pending') <> 'verified'
            OR COALESCE(spa.is_active, 0) = 0
            OR COALESCE(spa.last_error, '') <> ''
            OR COALESCE(s.is_suspended, 0) = 1
          )
        ORDER BY spa.updated_at DESC, spa.created_at DESC
        LIMIT ?
        OFFSET ?
      `).all(limit, offset);

      const total = Number(totalRow?.total ?? 0);

      return res.status(200).json({
        rows,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + rows.length < total,
        },
      });
    } catch (error) {
      console.error("Payout destination requests fetch error:", error);

      return res.status(500).json({
        error: "Failed to load payout destination requests",
      });
    }
  });
  return router;
}
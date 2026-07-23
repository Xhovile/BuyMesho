import type { PgCompatDatabase } from "../../db.js";
import express, { type RequestHandler } from "express";
import { hasAdminAccess } from "../../auth/adminAccess.js";
import { adminApiLimiter } from "./admin.rateLimit.js";

export function createAdminSummaryRouter(params: {
  requireAuth: RequestHandler;
  db: PgCompatDatabase;
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

  router.post("/payouts/destinations/:destinationAccountId/verification", adminApiLimiter, requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    try {
      const destinationAccountId = String(req.params.destinationAccountId ?? "").trim();
      if (!destinationAccountId) {
        return res.status(400).json({ error: "destinationAccountId is required" });
      }

      const status = String(req.body?.status ?? "").trim().toLowerCase();
      if (status !== "verified" && status !== "failed") {
        return res.status(400).json({ error: "status must be verified or failed" });
      }

      const reason = status === "failed" ? String(req.body?.reason ?? "").trim() : null;
      if (status === "failed" && !reason) {
        return res.status(400).json({ error: "reason is required when rejecting a destination" });
      }

      const existing = db.prepare(`
        SELECT id, seller_uid
        FROM seller_payout_accounts
        WHERE id = ?
      `).get(destinationAccountId) as { id: string; seller_uid: string } | undefined;

      if (!existing) {
        return res.status(404).json({ error: "Payout destination not found" });
      }

      const now = new Date().toISOString();

      db.prepare(`
        UPDATE seller_payout_accounts
        SET verification_status = ?,
            is_active = ?,
            verified_at = ?,
            last_error = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        status,
        status === "verified" ? 1 : 0,
        status === "verified" ? now : null,
        status === "failed" ? reason : null,
        now,
        destinationAccountId,
      );

      db.prepare(`
        INSERT INTO seller_payout_account_events (
          seller_uid,
          account_id,
          event_type,
          actor_type,
          actor_id,
          note,
          payload,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        existing.seller_uid,
        destinationAccountId,
        "destination_verification_updated",
        "admin",
        req.user?.uid ?? null,
        status === "failed" ? `Rejected: ${reason}` : "Destination verified",
        JSON.stringify({ status, reason }),
        now,
      );

      return res.status(200).json({
        destinationAccountId,
        verificationStatus: status,
        updatedAt: now,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update destination verification";
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
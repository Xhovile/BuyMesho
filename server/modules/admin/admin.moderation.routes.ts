import type Database from "better-sqlite3";
import express, { type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { getFirebaseAdmin } from "../../auth/firebaseAdmin.js";
import { hasAdminAccess } from "../../auth/adminAccess.js";

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

const withAsyncRoute = (handler: AsyncRouteHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next);
  };
};

export function createAdminModerationRouter(params: {
  requireAuth: RequestHandler;
  db: Database.Database;
  logAdminAction: (entry: {
    admin_uid?: string | null;
    admin_email?: string | null;
    action_type: string;
    target_type: string;
    target_id?: string | null;
    details?: unknown;
  }) => void;
}): express.Router {
  const router = express.Router();
  const { requireAuth, db, logAdminAction } = params;

  router.get("/reports", requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    const { status, type } = req.query;

    let query = `
      SELECT
        r.id,
        r.type,
        r.listing_id,
        r.subject,
        r.reason,
        r.details,
        r.reporter_uid,
        r.reporter_email,
        r.status,
        r.created_at,
        l.name AS listing_name,
        l.category AS listing_category,
        l.university AS listing_university,
        l.is_hidden AS listing_is_hidden,
        l.seller_uid AS seller_uid,
        s.business_name AS seller_business_name,
        s.is_suspended AS seller_is_suspended
      FROM reports r
      LEFT JOIN listings l ON r.listing_id = l.id
      LEFT JOIN sellers s ON l.seller_uid = s.uid
      WHERE 1=1
    `;

    const queryParams: unknown[] = [];

    if (status && typeof status === "string") {
      query += " AND r.status = ?";
      queryParams.push(status);
    }

    if (type && typeof type === "string") {
      query += " AND r.type = ?";
      queryParams.push(type);
    }

    query += " ORDER BY r.created_at DESC";

    try {
      const rows = db.prepare(query).all(...queryParams);
      return res.json(rows);
    } catch (error) {
      console.error("Admin reports fetch error:", error);
      return res.status(500).json({ error: "Failed to load reports" });
    }
  });

  router.patch("/reports/:id/status", requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid report id" });
    }

    const allowedStatuses = ["open", "reviewed", "resolved"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const existing = db.prepare("SELECT id FROM reports WHERE id = ?").get(id);
      if (!existing) {
        return res.status(404).json({ error: "Report not found" });
      }

      db.prepare("UPDATE reports SET status = ? WHERE id = ?").run(status, id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Admin report status update error:", error);
      return res.status(500).json({ error: "Failed to update report status" });
    }
  });

  router.get("/seller-applications", requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    const { status } = req.query;

    let query = `
      SELECT
        sa.id,
        sa.applicant_uid,
        sa.applicant_email,
        sa.full_legal_name,
        sa.institution,
        sa.applicant_type,
        sa.institution_id_number,
        sa.whatsapp_number,
        sa.business_name,
        sa.what_to_sell,
        sa.business_description,
        sa.reason_for_applying,
        sa.proof_document_url,
        sa.agreed_to_rules,
        sa.status,
        sa.review_notes,
        sa.reviewed_by_uid,
        sa.reviewed_at,
        sa.created_at,
        sa.updated_at,
        s.is_seller,
        s.is_suspended
      FROM seller_applications sa
      LEFT JOIN sellers s ON sa.applicant_uid = s.uid
      WHERE 1=1
    `;

    const queryParams: unknown[] = [];

    if (status && typeof status === "string") {
      query += " AND sa.status = ?";
      queryParams.push(status);
    }

    query += " ORDER BY sa.created_at DESC";

    try {
      const rows = db.prepare(query).all(...queryParams);
      return res.json(rows);
    } catch (error) {
      console.error("Admin seller applications fetch error:", error);
      return res.status(500).json({ error: "Failed to load seller applications" });
    }
  });

  router.patch(
    "/seller-applications/:id/status",
    requireAuth,
    withAsyncRoute(async (req, res) => {
      const requesterEmail = req.user?.email || null;
      const requesterUid = req.user?.uid || null;

      if (!hasAdminAccess(req.user)) {
        return res.status(403).json({ error: "Forbidden: admin access required" });
      }

      const id = Number(req.params.id);
      const { status, review_notes } = req.body;

      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Invalid application id" });
      }

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          error: "Invalid status. Allowed values: approved, rejected",
        });
      }

      const application = db.prepare(`
        SELECT *
        FROM seller_applications
        WHERE id = ?
      `).get(id) as any;

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      if (application.status !== "pending") {
        return res.status(409).json({
          error: "Status transition not allowed. Only pending applications can be reviewed.",
        });
      }

      if (status === "approved") {
        const applicantEmail =
          typeof application.applicant_email === "string"
            ? application.applicant_email.trim()
            : "";

        if (!applicantEmail) {
          return res.status(422).json({
            error:
              "Cannot approve application without applicant_email. Ask applicant to update profile email.",
          });
        }
      }

      const normalizedReviewNotes =
        typeof review_notes === "string" && review_notes.trim()
          ? review_notes.trim()
          : null;

      db.prepare(`
        UPDATE seller_applications
        SET
          status = ?,
          review_notes = ?,
          reviewed_by_uid = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, normalizedReviewNotes, requesterUid, id);

      const updatedApplication = db.prepare(`
        SELECT
          id,
          status,
          review_notes,
          reviewed_at,
          reviewed_by_uid,
          updated_at
        FROM seller_applications
        WHERE id = ?
        LIMIT 1
      `).get(id);

      if (status === "approved") {
        db.prepare(`
          INSERT INTO sellers (
            uid,
            email,
            business_name,
            university,
            is_verified,
            is_seller
          )
          VALUES (?, ?, ?, ?, ?, 1)
          ON CONFLICT(uid) DO UPDATE SET
            email = COALESCE(excluded.email, sellers.email),
            business_name = excluded.business_name,
            university = excluded.university,
            is_seller = 1
        `).run(
          application.applicant_uid,
          application.applicant_email,
          application.business_name,
          application.institution,
          1
        );

        try {
          const firebaseAdmin = getFirebaseAdmin();
          await firebaseAdmin
            .firestore()
            .collection("users")
            .doc(application.applicant_uid)
            .set(
              {
                is_seller: true,
                business_name: application.business_name ?? null,
                university: application.institution ?? null,
              },
              { merge: true }
            );
        } catch (firestoreSyncError) {
          console.warn(
            "Failed to sync approved seller status to Firestore:",
            firestoreSyncError
          );
        }
      }

      logAdminAction({
        admin_uid: requesterUid,
        admin_email: requesterEmail,
        action_type:
          status === "approved"
            ? "approve_seller_application"
            : "reject_seller_application",
        target_type: "seller_application",
        target_id: String(id),
        details: {
          applicant_uid: application.applicant_uid,
          business_name: application.business_name,
          status,
        },
      });

      return res.json({ success: true, application: updatedApplication });
    })
  );

  router.post("/listings/:id/hide", requireAuth, (req, res) => {
    const requesterEmail = req.user?.email || null;
    const requesterUid = req.user?.uid || null;
    const id = Number(req.params.id);

    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    try {
      const listing = db
        .prepare("SELECT id, seller_uid, is_hidden FROM listings WHERE id = ?")
        .get(id) as { id: number; seller_uid: string; is_hidden: number } | undefined;

      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      db.prepare("UPDATE listings SET is_hidden = 1 WHERE id = ?").run(id);

      logAdminAction({
        admin_uid: requesterUid,
        admin_email: requesterEmail,
        action_type: "hide_listing",
        target_type: "listing",
        target_id: String(id),
        details: { seller_uid: listing.seller_uid },
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("Hide listing error:", error);
      return res.status(500).json({ error: "Failed to hide listing" });
    }
  });

  router.post("/listings/:id/unhide", requireAuth, (req, res) => {
    const requesterEmail = req.user?.email || null;
    const requesterUid = req.user?.uid || null;
    const id = Number(req.params.id);

    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    try {
      const listing = db
        .prepare("SELECT id, seller_uid, is_hidden FROM listings WHERE id = ?")
        .get(id) as { id: number; seller_uid: string; is_hidden: number } | undefined;

      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      db.prepare("UPDATE listings SET is_hidden = 0 WHERE id = ?").run(id);

      logAdminAction({
        admin_uid: requesterUid,
        admin_email: requesterEmail,
        action_type: "unhide_listing",
        target_type: "listing",
        target_id: String(id),
        details: { seller_uid: listing.seller_uid },
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("Unhide listing error:", error);
      return res.status(500).json({ error: "Failed to unhide listing" });
    }
  });

  router.post("/sellers/:uid/suspend", requireAuth, (req, res) => {
    const requesterEmail = req.user?.email || null;
    const requesterUid = req.user?.uid || null;
    const { uid } = req.params;

    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    try {
      const seller = db
        .prepare("SELECT uid, business_name, is_suspended FROM sellers WHERE uid = ?")
        .get(uid) as { uid: string; business_name: string | null; is_suspended: number } | undefined;

      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }

      db.prepare("UPDATE sellers SET is_suspended = 1 WHERE uid = ?").run(uid);

      logAdminAction({
        admin_uid: requesterUid,
        admin_email: requesterEmail,
        action_type: "suspend_seller",
        target_type: "seller",
        target_id: uid,
        details: { business_name: seller.business_name },
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("Suspend seller error:", error);
      return res.status(500).json({ error: "Failed to suspend seller" });
    }
  });

  router.post("/sellers/:uid/unsuspend", requireAuth, (req, res) => {
    const requesterEmail = req.user?.email || null;
    const requesterUid = req.user?.uid || null;
    const { uid } = req.params;

    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    try {
      const seller = db
        .prepare("SELECT uid, business_name, is_suspended FROM sellers WHERE uid = ?")
        .get(uid) as { uid: string; business_name: string | null; is_suspended: number } | undefined;

      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }

      db.prepare("UPDATE sellers SET is_suspended = 0 WHERE uid = ?").run(uid);

      logAdminAction({
        admin_uid: requesterUid,
        admin_email: requesterEmail,
        action_type: "unsuspend_seller",
        target_type: "seller",
        target_id: uid,
        details: { business_name: seller.business_name },
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("Unsuspend seller error:", error);
      return res.status(500).json({ error: "Failed to unsuspend seller" });
    }
  });

  return router;
}

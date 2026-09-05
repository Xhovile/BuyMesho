import express, { type RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { query, withTransaction } from "../postgres.js";
import { ensureDisputeSupportRequestsMigration } from "../db/migrations/20260905_dispute_support_requests.js";
import { notifyAdminSupportRequest } from "../modules/notifications/admin-dispute.notification.js";

function clean(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }

export function createDisputeSupportRouter(requireAuth: RequestHandler): express.Router {
  ensureDisputeSupportRequestsMigration();
  const router = express.Router();

  router.get("/:caseId/support", requireAuth, async (req: any, res) => {
    try {
      const buyerId = clean(req.user?.uid); const caseId = clean(req.params.caseId);
      const result = await query<Record<string, unknown>>(`SELECT sr.*, dc.order_id, dc.outcome AS dispute_outcome, rt.amount AS refund_amount, rt.currency AS refund_currency, rt.payment_method AS refund_method, rt.transaction_id AS refund_transaction_id, rt.executed_at AS refund_executed_at FROM support_requests sr JOIN dispute_cases dc ON dc.id = sr.dispute_case_id LEFT JOIN LATERAL (SELECT * FROM refund_transactions WHERE order_id = dc.order_id ORDER BY created_at DESC LIMIT 1) rt ON TRUE WHERE sr.dispute_case_id = $1 AND sr.buyer_id = $2 ORDER BY sr.created_at DESC LIMIT 1`, [caseId, buyerId]);
      return result.rows[0] ? res.json(result.rows[0]) : res.status(404).json({ error: "No admin support request found" });
    } catch (error) { return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load admin support request" }); }
  });

  router.post("/:caseId/support", requireAuth, async (req: any, res) => {
    try {
      const buyerId = clean(req.user?.uid); const caseId = clean(req.params.caseId); const reason = clean(req.body?.reason);
      if (!buyerId) return res.status(401).json({ error: "Authentication required" });
      if (!caseId) return res.status(400).json({ error: "Dispute case id is required" });
      if (reason.length < 10) return res.status(400).json({ error: "Please provide at least 10 characters explaining why you need admin assistance." });
      if (reason.length > 2000) return res.status(400).json({ error: "Reason cannot exceed 2000 characters." });
      const created = await withTransaction(async (client) => {
        const caseResult = await client.query<Record<string, unknown>>(`SELECT * FROM dispute_cases WHERE id = $1 AND buyer_id = $2 LIMIT 1 FOR UPDATE`, [caseId, buyerId]);
        const dispute = caseResult.rows[0]; if (!dispute) throw new Error("Dispute not found");
        const status = clean(dispute.status).toLowerCase(); const outcome = clean(dispute.outcome).toLowerCase();
        if (!["resolved", "closed"].includes(status) || !["seller_refund_confirmed", "seller_refund_accepted", "seller_replacement_confirmed", "seller_rejected", "refunded", "returned", "return", "return_and_refund", "refund_executed"].includes(outcome)) throw new Error("Admin support becomes available after the dispute has a final resolution.");
        const existing = await client.query<Record<string, unknown>>(`SELECT * FROM support_requests WHERE dispute_case_id = $1 AND status IN ('open','in_progress') LIMIT 1 FOR UPDATE`, [caseId]);
        if (existing.rows[0]) return { duplicate: true, request: existing.rows[0], dispute };
        const id = `support_${randomUUID()}`; const now = new Date().toISOString();
        const insert = await client.query<Record<string, unknown>>(`INSERT INTO support_requests (id, order_id, dispute_case_id, buyer_id, seller_id, reason, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$7) RETURNING *`, [id, dispute.order_id, caseId, buyerId, dispute.seller_id, reason, now]);
        await client.query(`INSERT INTO audit_events (id, entity_type, entity_id, event_type, performed_by, timestamp, previous_state, new_state, metadata) VALUES ($1,'support_request',$2,'support_request_submitted',$3,$4,NULL,'open',$5)`, [`audit_${randomUUID()}`, id, buyerId, now, JSON.stringify({ orderId: dispute.order_id, disputeCaseId: caseId })]);
        return { duplicate: false, request: insert.rows[0], dispute };
      });
      if (!created.duplicate) {
        try { await notifyAdminSupportRequest({ requestId: String(created.request.id), caseId, orderId: String(created.dispute.order_id), buyerId, sellerId: String(created.dispute.seller_id), reason }); } catch (notificationError) { console.warn("Failed to notify admin of support request:", notificationError); }
      }
      return res.status(created.duplicate ? 200 : 201).json({ duplicate: created.duplicate, ...created.request, message: created.duplicate ? "An admin support request is already open for this dispute." : "Admin support request submitted." });
    } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : "Failed to submit admin support request" }); }
  });
  return router;
}

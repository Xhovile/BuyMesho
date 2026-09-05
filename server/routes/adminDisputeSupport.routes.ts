import express, { type RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { query, withTransaction } from "../postgres.js";
import { hasAdminAccess } from "../auth/adminAccess.js";
import { ensureDisputeSupportRequestsMigration } from "../db/migrations/20260905_dispute_support_requests.js";

function clean(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }

export function createAdminDisputeSupportRouter(requireAuth: RequestHandler): express.Router {
  ensureDisputeSupportRequestsMigration();
  const router = express.Router();
  router.get("/", requireAuth, async (req: any, res) => {
    if (!hasAdminAccess(req.user)) return res.status(403).json({ error: "Admin access required" });
    try {
      const status = clean(req.query?.status); const params: unknown[] = [];
      let sql = `SELECT sr.*, dc.outcome AS dispute_outcome, rt.amount AS refund_amount, rt.currency AS refund_currency, rt.payment_method AS refund_method, rt.transaction_id AS refund_transaction_id, rt.executed_at AS refund_executed_at FROM support_requests sr JOIN dispute_cases dc ON dc.id = sr.dispute_case_id LEFT JOIN LATERAL (SELECT * FROM refund_transactions WHERE order_id = dc.order_id ORDER BY created_at DESC LIMIT 1) rt ON TRUE WHERE 1=1`;
      if (status) { sql += ` AND sr.status = $${params.length + 1}`; params.push(status); }
      sql += " ORDER BY sr.created_at DESC";
      const result = await query<Record<string, unknown>>(sql, params); return res.json(result.rows);
    } catch (error) { return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load support requests" }); }
  });
  router.post("/:id/respond", requireAuth, async (req: any, res) => {
    if (!hasAdminAccess(req.user)) return res.status(403).json({ error: "Admin access required" });
    const id = clean(req.params.id); const response = clean(req.body?.response); const status = clean(req.body?.status).toLowerCase() || "resolved";
    if (!id) return res.status(400).json({ error: "Support request id is required" });
    if (!response) return res.status(400).json({ error: "Admin response is required" });
    if (!["in_progress", "resolved", "closed"].includes(status)) return res.status(400).json({ error: "Invalid support request status" });
    try {
      const updated = await withTransaction(async (client) => {
        const existingResult = await client.query<Record<string, unknown>>(`SELECT * FROM support_requests WHERE id = $1 LIMIT 1 FOR UPDATE`, [id]);
        const existing = existingResult.rows[0]; if (!existing) throw new Error("Support request not found");
        const now = new Date().toISOString(); const resolved = ["resolved", "closed"].includes(status);
        const result = await client.query<Record<string, unknown>>(`UPDATE support_requests SET status=$1, admin_response=$2, updated_at=$3, resolved_at=$4, resolved_by=$5 WHERE id=$6 RETURNING *`, [status, response, now, resolved ? now : null, resolved ? req.user.uid : null, id]);
        await client.query(`INSERT INTO audit_events (id, entity_type, entity_id, event_type, performed_by, timestamp, previous_state, new_state, metadata) VALUES ($1,'support_request',$2,'support_request_responded',$3,$4,$5,$6,$7)`, [`audit_${randomUUID()}`, id, req.user.uid, now, existing.status, status, JSON.stringify({ orderId: existing.order_id, disputeCaseId: existing.dispute_case_id })]);
        return result.rows[0];
      });
      return res.json(updated);
    } catch (error) { return res.status(error instanceof Error && error.message === "Support request not found" ? 404 : 400).json({ error: error instanceof Error ? error.message : "Failed to respond to support request" }); }
  });
  return router;
}

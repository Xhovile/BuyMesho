import express, { type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { query, withTransaction } from '../postgres.js';

const ALLOWED_REFUND_METHODS = new Set(['mobile_money', 'bank_transfer', 'cash', 'other']);
function clean(value: unknown, fallback = ''): string { return typeof value === 'string' ? value.trim() : fallback; }
function requireNonEmpty(value: unknown, field: string): string { const result = clean(value); if (!result) throw new Error(`${field} is required`); return result; }
async function loadSellerOrder(orderId: string, sellerId: string) { const result = await query<Record<string, unknown>>(`SELECT o.id, o.buyer_id, o.seller_id, o.total_amount, o.currency, p.status AS payment_status, pay.status AS payout_status FROM orders o LEFT JOIN payments p ON p.reference = o.payment_reference LEFT JOIN LATERAL (SELECT status FROM payouts WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) pay ON TRUE WHERE o.id = $1 AND o.seller_id = $2 LIMIT 1`, [orderId, sellerId]); return result.rows[0] ?? null; }

export function createSellerDisputeResolutionRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.post('/:orderId/dispute/contact-buyer', requireAuth, async (req: any, res) => {
    try {
      const sellerId = clean(req.user?.uid); const orderId = clean(req.params.orderId);
      if (!sellerId) return res.status(401).json({ error: 'Authentication required' }); if (!orderId) return res.status(400).json({ error: 'Order id is required' });
      const order = await loadSellerOrder(orderId, sellerId); if (!order) return res.status(404).json({ error: 'Seller order not found' });
      const dispute = await query<Record<string, unknown>>(`SELECT id, buyer_id, status, order_id FROM dispute_cases WHERE order_id = $1 AND seller_id = $2 ORDER BY created_at DESC LIMIT 1`, [orderId, sellerId]);
      const caseRow = dispute.rows[0]; if (!caseRow) return res.status(404).json({ error: 'No dispute case found for this order' }); if (!['open', 'under_review'].includes(String(caseRow.status))) return res.status(409).json({ error: 'This dispute is no longer active' });
      return res.json({ available: true, conversationTarget: String(caseRow.buyer_id), disputeCaseId: String(caseRow.id), orderId, message: 'Buyer contact is available for this dispute. Use the existing BuyMesho conversation flow to communicate with the buyer.' });
    } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to prepare buyer contact' }); }
  });

  router.post('/:orderId/dispute/confirm-refunded', requireAuth, async (req: any, res) => {
    try {
      const sellerId = clean(req.user?.uid); const orderId = clean(req.params.orderId);
      if (!sellerId) return res.status(401).json({ error: 'Authentication required' }); if (!orderId) return res.status(400).json({ error: 'Order id is required' });
      const order = await loadSellerOrder(orderId, sellerId); if (!order) return res.status(404).json({ error: 'Seller order not found' });
      if (String(order.payout_status ?? '').toLowerCase() !== 'paid') return res.status(409).json({ error: 'Seller refund confirmation is available only after seller payout.' });
      const amount = Number(req.body?.amount); if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'A positive refund amount is required' }); if (amount > Number(order.total_amount ?? 0)) return res.status(400).json({ error: 'Refund amount cannot exceed the order total' });
      const refundMethod = clean(req.body?.refundMethod).toLowerCase(); if (!ALLOWED_REFUND_METHODS.has(refundMethod)) return res.status(400).json({ error: 'Unsupported refund method' });
      const transactionId = requireNonEmpty(req.body?.transactionId, 'Transaction ID'); const refundDate = requireNonEmpty(req.body?.refundDate, 'Refund date'); const note = clean(req.body?.note); const evidence = Array.isArray(req.body?.evidence) ? req.body.evidence : []; const destination = clean(req.body?.destination);

      const result = await withTransaction(async (client) => {
        const caseResult = await client.query<Record<string, unknown>>(`SELECT * FROM dispute_cases WHERE order_id = $1 AND seller_id = $2 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [orderId, sellerId]);
        const caseRow = caseResult.rows[0]; if (!caseRow) throw new Error('No dispute case found for this order'); if (!['open', 'under_review'].includes(String(caseRow.status))) throw new Error('This dispute is no longer active');
        const attemptResult = await client.query<Record<string, unknown>>(`SELECT * FROM dispute_attempts WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [caseRow.id]); const attempt = attemptResult.rows[0];
        const existingTransaction = await client.query<Record<string, unknown>>(`SELECT * FROM refund_transactions WHERE order_id = $1 AND transaction_id = $2 LIMIT 1`, [orderId, transactionId]); if (existingTransaction.rows[0]) return { duplicate: true, transaction: existingTransaction.rows[0], caseId: caseRow.id };
        const refundRequestResult = await client.query<Record<string, unknown>>(`SELECT * FROM refund_requests WHERE order_id = $1 AND seller_id = $2 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [orderId, sellerId]); const refundRequest = refundRequestResult.rows[0];
        const now = new Date().toISOString(); const refundTransactionId = `rft_${randomUUID()}`;
        await client.query(`INSERT INTO refund_transactions (id, refund_request_id, order_id, buyer_id, seller_id, amount, currency, destination, payment_method, provider, transaction_id, status, executed_by, executed_at, supporting_evidence, metadata, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'seller_reported',$10,'refunded',$5,$11,$12,$13::jsonb,$11,$11)`, [refundTransactionId, refundRequest?.id ?? null, orderId, order.buyer_id, sellerId, amount, order.currency ?? 'MWK', destination || null, refundMethod, transactionId, refundDate, JSON.stringify(evidence), JSON.stringify({ refund_transaction_id: transactionId, note })]);
        if (refundRequest) await client.query(`UPDATE refund_requests SET refund_transaction_id = $1, admin_decision = COALESCE(admin_decision, 'seller_refund_recorded'), seller_response = $2, updated_at = $3, latest_status_at = $3 WHERE id = $4`, [refundTransactionId, note || `Seller reported a refund on ${refundDate}.`, now, refundRequest.id]);
        if (attempt) await client.query(`UPDATE dispute_attempts SET decision = COALESCE(decision, 'seller_refund_reported'), resolution_note = $1, updated_at = $2 WHERE id = $3`, [note || `Seller reported a refund using transaction ${transactionId}.`, now, attempt.id]);
        await client.query(`INSERT INTO audit_events (id, entity_type, entity_id, event_type, performed_by, timestamp, previous_state, new_state, metadata) VALUES ($1,'dispute_case',$2,'seller_refund_recorded',$3,$4,$5,$5,$6::jsonb)`, [`aud_${randomUUID()}`, caseRow.id, sellerId, now, String(caseRow.status), JSON.stringify({ orderId, refundTransactionId, transactionId, amount, refundMethod, refundDate })]);
        return { duplicate: false, transaction: { id: refundTransactionId, orderId, amount, currency: order.currency ?? 'MWK', paymentMethod: refundMethod, transactionId, refundDate, status: 'refunded' as const }, caseId: caseRow.id };
      });
      return res.status(result.duplicate ? 200 : 201).json({ ...result, message: result.duplicate ? 'This seller refund was already recorded.' : 'Seller refund recorded. The dispute remains available for formal review and decision.' });
    } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to record seller refund' }); }
  });
  return router;
}

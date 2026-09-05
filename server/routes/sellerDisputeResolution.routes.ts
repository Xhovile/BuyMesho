import express, { type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { query, withTransaction } from '../postgres.js';
import { postgresDb as messageDb } from '../db.js';
import { notifyDisputeWorkflowEvent } from '../modules/notifications/dispute-workflow.notification.js';
import { notifyAdminSellerRefundRecorded } from '../modules/notifications/admin-dispute.notification.js';

const ALLOWED_REFUND_METHODS = new Set(['mobile_money', 'bank_transfer', 'cash', 'other']);
function clean(value: unknown, fallback = ''): string { return typeof value === 'string' ? value.trim() : fallback; }
function requireNonEmpty(value: unknown, field: string): string { const result = clean(value); if (!result) throw new Error(`${field} is required`); return result; }
async function loadSellerOrder(orderId: string, sellerId: string) {
  const result = await query<Record<string, unknown>>(`SELECT o.id, o.buyer_id, o.seller_id, o.total_amount, o.total_currency, p.status AS payment_status, pay.status AS payout_status FROM orders o LEFT JOIN payments p ON p.reference = o.payment_reference LEFT JOIN LATERAL (SELECT status FROM payouts WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) pay ON TRUE WHERE o.id = $1 AND o.seller_id = $2 LIMIT 1`, [orderId, sellerId]);
  return result.rows[0] ?? null;
}
function ensureOrderConversationTable() {
  try {
    messageDb.exec(`CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY AUTOINCREMENT, listing_id INTEGER, event_id INTEGER, order_id TEXT, buyer_uid TEXT NOT NULL, seller_uid TEXT NOT NULL, last_message_preview TEXT, last_message_at DATETIME, buyer_unread_count INTEGER NOT NULL DEFAULT 0, seller_unread_count INTEGER NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    const columns = messageDb.prepare(`SELECT column_name AS name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'conversations'`).all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'order_id')) messageDb.exec(`ALTER TABLE conversations ADD COLUMN order_id TEXT`);
    messageDb.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_order_thread ON conversations (order_id, buyer_uid, seller_uid) WHERE order_id IS NOT NULL`);
  } catch (error) { throw new Error(`Messaging storage is unavailable: ${error instanceof Error ? error.message : String(error)}`); }
}

export function createSellerDisputeResolutionRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();
  router.post('/:orderId/dispute/contact-buyer', requireAuth, async (req: any, res) => {
    try {
      const sellerId = clean(req.user?.uid); const orderId = clean(req.params.orderId); if (!sellerId) return res.status(401).json({ error: 'Authentication required' }); if (!orderId) return res.status(400).json({ error: 'Order id is required' });
      const order = await loadSellerOrder(orderId, sellerId); if (!order) return res.status(404).json({ error: 'Seller order not found' });
      const dispute = await query<Record<string, unknown>>(`SELECT id, status, outcome, buyer_id FROM dispute_cases WHERE order_id = $1 AND seller_id = $2 ORDER BY created_at DESC LIMIT 1`, [orderId, sellerId]); const caseRow = dispute.rows[0]; if (!caseRow) return res.status(404).json({ error: 'No dispute case found for this order' });
      const disputeStatus = clean(caseRow.status).toLowerCase(); if (['resolved', 'closed'].includes(disputeStatus) || ['refunded', 'returned', 'seller_refund_confirmed', 'seller_refund_accepted', 'return', 'return_and_refund'].includes(clean(caseRow.outcome).toLowerCase())) return res.status(409).json({ error: 'Dispute already settled.', code: 'DISPUTE_ALREADY_SETTLED', orderId, disputeCaseId: String(caseRow.id) });
      if (!['open', 'under_review', 'awaiting_response'].includes(disputeStatus)) return res.status(409).json({ error: 'Buyer contact is not available for this dispute state.', code: 'SELLER_DISPUTE_CONTACT_UNAVAILABLE', orderId, disputeCaseId: String(caseRow.id) });
      ensureOrderConversationTable(); let conversation = messageDb.prepare(`SELECT * FROM conversations WHERE order_id = ? AND buyer_uid = ? AND seller_uid = ? LIMIT 1`).get(orderId, String(caseRow.buyer_id), sellerId) as { id: number } | undefined;
      if (!conversation) { const created = messageDb.prepare(`INSERT INTO conversations (listing_id,event_id,order_id,buyer_uid,seller_uid,last_message_preview,last_message_at,buyer_unread_count,seller_unread_count,updated_at) VALUES (NULL,NULL,?,?,?,NULL,NULL,0,0,CURRENT_TIMESTAMP)`).run(orderId, String(caseRow.buyer_id), sellerId); conversation = { id: Number(created.lastInsertRowid) }; }
      return res.status(200).json({ conversationId: Number(conversation.id), conversationTarget: `/messages?conversation=${encodeURIComponent(String(conversation.id))}`, orderId, disputeCaseId: String(caseRow.id) });
    } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to prepare buyer contact' }); }
  });
  router.post('/:orderId/dispute/confirm-refunded', requireAuth, async (req: any, res) => {
    try {
      const sellerId = clean(req.user?.uid); const orderId = clean(req.params.orderId); if (!sellerId) return res.status(401).json({ error: 'Authentication required' }); if (!orderId) return res.status(400).json({ error: 'Order id is required' });
      const order = await loadSellerOrder(orderId, sellerId); if (!order) return res.status(404).json({ error: 'Seller order not found' }); if (String(order.payout_status ?? '').toLowerCase() !== 'paid') return res.status(409).json({ error: 'Seller refund confirmation is available only after seller payout.' });
      const amount = Number(req.body?.amount); if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'A positive refund amount is required' }); if (amount > Number(order.total_amount ?? 0)) return res.status(400).json({ error: 'Refund amount cannot exceed the order total' });
      const refundMethod = clean(req.body?.refundMethod).toLowerCase(); if (!ALLOWED_REFUND_METHODS.has(refundMethod)) return res.status(400).json({ error: 'Unsupported refund method' });
      const transactionId = requireNonEmpty(req.body?.transactionId, 'Transaction ID'); const refundDate = requireNonEmpty(req.body?.refundDate, 'Refund date'); const note = clean(req.body?.note); const evidence = Array.isArray(req.body?.evidence) ? req.body.evidence.filter((item: unknown): item is string => typeof item === 'string').map((item: string) => item.trim()).filter(Boolean).slice(0, 20) : []; const destination = clean(req.body?.destination);
      const result = await withTransaction(async (client) => {
        const caseResult = await client.query<Record<string, unknown>>(`SELECT * FROM dispute_cases WHERE order_id = $1 AND seller_id = $2 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [orderId, sellerId]); const caseRow = caseResult.rows[0]; if (!caseRow) throw new Error('No dispute case found for this order'); const caseStatus = clean(caseRow.status).toLowerCase(); const caseOutcome = clean(caseRow.outcome).toLowerCase();
        if (['resolved', 'closed'].includes(caseStatus) || ['refunded', 'returned', 'seller_refund_confirmed', 'seller_refund_accepted'].includes(caseOutcome)) throw new Error('Dispute already settled.'); if (!['open', 'under_review'].includes(caseStatus)) throw new Error('This dispute is not available for seller refund confirmation');
        const attemptResult = await client.query<Record<string, unknown>>(`SELECT * FROM dispute_attempts WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [caseRow.id]); const attempt = attemptResult.rows[0];
        const existingTransaction = await client.query<Record<string, unknown>>(`SELECT * FROM refund_transactions WHERE order_id = $1 AND transaction_id = $2 LIMIT 1`, [orderId, transactionId]); if (existingTransaction.rows[0]) return { duplicate: true, transaction: existingTransaction.rows[0], caseId: caseRow.id, buyerId: String(caseRow.buyer_id), sellerId, currency: String(order.total_currency ?? 'MWK') };
        const refundRequestResult = await client.query<Record<string, unknown>>(`SELECT * FROM refund_requests WHERE order_id = $1 AND seller_id = $2 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [orderId, sellerId]); const refundRequest = refundRequestResult.rows[0]; const now = new Date().toISOString(); const refundTransactionId = `rft_${randomUUID()}`;
        await client.query(`INSERT INTO refund_transactions (id, refund_request_id, order_id, buyer_id, seller_id, amount, currency, destination, payment_method, provider, transaction_id, status, executed_by, executed_at, supporting_evidence, metadata, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'seller_reported',$10,'refunded',$5,$11,$12,$13,$14,$11,$11)`, [refundTransactionId, refundRequest?.id ?? null, orderId, order.buyer_id, sellerId, amount, order.total_currency ?? 'MWK', destination || null, refundMethod, transactionId, refundDate, JSON.stringify(evidence), JSON.stringify({ refund_transaction_id: transactionId, note })]);
        if (refundRequest) await client.query(`UPDATE refund_requests SET refund_transaction_id = $1, seller_response = $2, status = 'refunded', latest_status_at = $3, updated_at = $3 WHERE id = $4`, [refundTransactionId, note || `Seller confirmed a refund on ${refundDate}.`, now, refundRequest.id]);
        if (attempt) await client.query(`UPDATE dispute_attempts SET status='resolved', decision='seller_refund_confirmed', resolution_note=$1, resolved_by=$2, resolved_at=$3, updated_at=$3 WHERE id=$4`, [note || `Seller confirmed a refund using transaction ${transactionId}.`, sellerId, now, attempt.id]);
        await client.query(`UPDATE dispute_cases SET status='resolved', outcome='seller_refund_confirmed', resolved_at=$1, updated_at=$1 WHERE id=$2`, [now, caseRow.id]);
        await client.query(`UPDATE disputes SET status='resolved', state='resolved', resolution=$1, resolved_by=$2, resolved_at=$3, updated_at=$3 WHERE order_id=$4 AND status IN ('open','under_review')`, [note || `Seller confirmed a refund on ${refundDate}.`, sellerId, now, orderId]);
        await client.query(`INSERT INTO audit_events (id, entity_type, entity_id, event_type, performed_by, timestamp, previous_state, new_state, metadata) VALUES ($1,'dispute_case',$2,'seller_refund_confirmed',$3,$4,$5,'resolved',$6)`, [`aud_${randomUUID()}`, caseRow.id, sellerId, now, caseStatus, JSON.stringify({ orderId, refundTransactionId, transactionId, amount, refundMethod, refundDate, outcome: 'seller_refund_confirmed' })]);
        return { duplicate: false, transaction: { id: refundTransactionId, orderId, amount, currency: order.total_currency ?? 'MWK', paymentMethod: refundMethod, transactionId, refundDate, destination: destination || null, status: 'refunded' as const }, caseId: caseRow.id, buyerId: String(caseRow.buyer_id), sellerId, currency: String(order.total_currency ?? 'MWK') };
      });
      if (!result.duplicate) {
        try { await notifyDisputeWorkflowEvent({ caseId: String(result.caseId), orderId, buyerId: String(result.buyerId), sellerId: String(result.sellerId), event: 'seller_refund_recorded', note: note || null, amount, currency: String(result.currency), transactionId, refundMethod, refundDate, destination, recipients: ['buyer', 'seller'] }); } catch (notificationError) { console.warn('Failed to send seller-refund notification:', notificationError); }
        try { await notifyAdminSellerRefundRecorded({ caseId: String(result.caseId), orderId, buyerId: String(result.buyerId), sellerId, amount, currency: String(result.currency), refundMethod, transactionId, refundDate, destination, note }); } catch (notificationError) { console.warn('Failed to send admin seller-refund notification:', notificationError); }
      }
      return res.status(result.duplicate ? 200 : 201).json({ duplicate: result.duplicate, transaction: result.transaction, caseId: result.caseId, status: 'resolved', outcome: 'seller_refund_confirmed', message: result.duplicate ? 'This seller refund was already recorded.' : 'Seller refund recorded and the dispute is now settled.' });
    } catch (error) { return res.status(error instanceof Error && error.message === 'Dispute already settled.' ? 409 : 400).json({ error: error instanceof Error ? error.message : 'Failed to record seller refund', ...(error instanceof Error && error.message === 'Dispute already settled.' ? { code: 'DISPUTE_ALREADY_SETTLED' } : {}) }); }
  });
  return router;
}

import express, { type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { query, withTransaction } from '../postgres.js';
import { escrowRepository } from '../modules/escrow/escrow.repository.js';
import { assertDisputeAttemptTransition, assertDisputeCaseTransition, assertRefundTransition } from '../modules/disputes/state-machine.js';
import { ensureRefundDisputeArchitectureMigration } from '../db/migrations/20260904_refund_dispute_architecture.js';

function clean(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }

async function loadCase(caseId: string) {
  const result = await query<Record<string, unknown>>(
    `SELECT dc.*, o.status AS order_status, o.total_amount, o.total_currency, o.payment_reference,
            e.id AS escrow_id, e.state AS escrow_state, e.balance_amount AS escrow_balance_amount,
            e.balance_currency AS escrow_balance_currency,
            da.id AS latest_attempt_id, da.request_type AS latest_request_type,
            da.requested_resolution AS latest_requested_resolution, da.reason AS latest_reason,
            da.amount_requested AS latest_amount_requested, da.evidence AS latest_evidence,
            da.status AS latest_attempt_status, da.decision AS latest_decision,
            da.resolution_note AS latest_resolution_note, da.created_at AS latest_attempt_created_at,
            rr.id AS refund_request_id, rr.status AS refund_request_status,
            rr.request_type AS refund_request_type, rr.requested_resolution AS refund_requested_resolution,
            rr.amount_requested AS refund_requested_amount, rr.currency AS refund_currency,
            rr.payment_method AS refund_payment_method, rr.refund_destination AS refund_destination,
            rr.reason AS refund_reason, rr.evidence AS refund_evidence,
            rr.seller_response AS refund_seller_response, rr.admin_decision AS refund_admin_decision,
            rr.refund_transaction_id, rr.window_ends_at AS refund_window_ends_at,
            rt.id AS refund_transaction_row_id, rt.amount AS refunded_amount,
            rt.currency AS refunded_currency, rt.payment_method AS refunded_payment_method,
            rt.provider AS refunded_provider, rt.transaction_id AS refunded_transaction_id,
            rt.status AS refunded_status, rt.executed_by AS refunded_by, rt.executed_at AS refunded_at,
            rt.supporting_evidence AS refunded_evidence
     FROM dispute_cases dc
     INNER JOIN orders o ON o.id = dc.order_id
     LEFT JOIN escrows e ON e.order_id = o.id
     LEFT JOIN LATERAL (SELECT * FROM dispute_attempts WHERE case_id = dc.id ORDER BY created_at DESC LIMIT 1) da ON TRUE
     LEFT JOIN LATERAL (SELECT * FROM refund_requests WHERE order_id = dc.order_id ORDER BY created_at DESC LIMIT 1) rr ON TRUE
     LEFT JOIN LATERAL (SELECT * FROM refund_transactions WHERE order_id = dc.order_id ORDER BY created_at DESC LIMIT 1) rt ON TRUE
     WHERE dc.id = $1 LIMIT 1`,
    [caseId],
  );
  return result.rows[0] ?? null;
}

function parseJson(value: unknown, fallback: unknown = []) {
  if (typeof value !== 'string') return value ?? fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export function createAdminDisputesRouter(requireAuth: RequestHandler): express.Router {
  ensureRefundDisputeArchitectureMigration();
  const router = express.Router();

  router.get('/', requireAuth, async (req: any, res) => {
    try {
      if (req.user?.is_admin !== true) return res.status(403).json({ error: 'Admin access required' });
      const requestedStatus = clean(req.query?.status).toLowerCase();
      const params: unknown[] = [];
      let statusFilter = '';
      if (['open', 'under_review', 'resolved', 'rejected'].includes(requestedStatus)) { params.push(requestedStatus); statusFilter = `WHERE dc.status = $${params.length}`; }
      const result = await query<Record<string, unknown>>(
        `SELECT dc.id, dc.order_id, dc.buyer_id, dc.seller_id, dc.status, dc.outcome,
                dc.opened_at, dc.window_ends_at, dc.updated_at,
                o.status AS order_status, o.total_amount, o.total_currency,
                e.state AS escrow_state, e.balance_amount AS escrow_balance_amount,
                da.id AS latest_attempt_id, da.request_type AS latest_request_type,
                da.requested_resolution AS latest_requested_resolution, da.reason AS latest_reason,
                da.amount_requested AS latest_amount_requested, da.status AS latest_attempt_status,
                da.created_at AS latest_attempt_created_at,
                rr.id AS refund_request_id, rr.status AS refund_request_status,
                rr.requested_resolution AS refund_requested_resolution, rr.amount_requested AS refund_requested_amount,
                rr.window_ends_at AS refund_window_ends_at,
                rt.status AS refunded_status, rt.amount AS refunded_amount,
                rt.provider AS refunded_provider, rt.transaction_id AS refunded_transaction_id
         FROM dispute_cases dc
         INNER JOIN orders o ON o.id = dc.order_id
         LEFT JOIN escrows e ON e.order_id = o.id
         LEFT JOIN LATERAL (SELECT * FROM dispute_attempts WHERE case_id = dc.id ORDER BY created_at DESC LIMIT 1) da ON TRUE
         LEFT JOIN LATERAL (SELECT * FROM refund_requests WHERE order_id = dc.order_id ORDER BY created_at DESC LIMIT 1) rr ON TRUE
         LEFT JOIN LATERAL (SELECT * FROM refund_transactions WHERE order_id = dc.order_id ORDER BY created_at DESC LIMIT 1) rt ON TRUE
         ${statusFilter}
         ORDER BY CASE WHEN dc.status IN ('open','under_review') THEN 0 ELSE 1 END, dc.updated_at DESC`,
        params,
      );
      return res.json({ cases: result.rows, counts: {
        open: result.rows.filter((row) => row.status === 'open').length,
        under_review: result.rows.filter((row) => row.status === 'under_review').length,
        resolved: result.rows.filter((row) => row.status === 'resolved').length,
        rejected: result.rows.filter((row) => row.status === 'rejected').length,
      } });
    } catch (error) { return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch admin disputes' }); }
  });

  router.get('/:caseId', requireAuth, async (req: any, res) => {
    try {
      if (req.user?.is_admin !== true) return res.status(403).json({ error: 'Admin access required' });
      const row = await loadCase(clean(req.params.caseId));
      if (!row) return res.status(404).json({ error: 'Dispute case not found' });
      const attempts = await query<Record<string, unknown>>(`SELECT * FROM dispute_attempts WHERE case_id = $1 ORDER BY created_at ASC`, [req.params.caseId]);
      const refunds = await query<Record<string, unknown>>(`SELECT * FROM refund_transactions WHERE order_id = $1 ORDER BY created_at ASC`, [row.order_id]);
      const audits = await query<Record<string, unknown>>(`SELECT * FROM audit_events WHERE entity_type = 'dispute_case' AND entity_id = $1 ORDER BY timestamp ASC`, [req.params.caseId]);
      return res.json({ case: { ...row, latest_evidence: parseJson(row.latest_evidence), refund_evidence: parseJson(row.refund_evidence), refunded_evidence: parseJson(row.refunded_evidence) }, attempts: attempts.rows, refunds: refunds.rows, audit: audits.rows });
    } catch (error) { return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch dispute case' }); }
  });

  router.post('/:caseId/review', requireAuth, async (req: any, res) => {
    try {
      if (req.user?.is_admin !== true) return res.status(403).json({ error: 'Admin access required' });
      const caseId = clean(req.params.caseId); const current = await loadCase(caseId);
      if (!current) return res.status(404).json({ error: 'Dispute case not found' });
      assertDisputeCaseTransition(String(current.status) as any, 'under_review', 'admin');
      if (current.latest_attempt_id) assertDisputeAttemptTransition(String(current.latest_attempt_status) as any, 'under_review', 'admin');
      const now = new Date().toISOString();
      await withTransaction(async (client) => {
        await client.query(`UPDATE dispute_cases SET status='under_review', updated_at=$1 WHERE id=$2`, [now, caseId]);
        if (current.latest_attempt_id) await client.query(`UPDATE dispute_attempts SET status='under_review', updated_at=$1 WHERE id=$2`, [now, current.latest_attempt_id]);
        if (current.refund_request_id && current.refund_request_status === 'requested') {
          assertRefundTransition('requested', 'under_review', 'admin');
          await client.query(`UPDATE refund_requests SET status='under_review', latest_status_at=$1, updated_at=$1 WHERE id=$2`, [now, current.refund_request_id]);
        }
        await client.query(`INSERT INTO audit_events (id,entity_type,entity_id,event_type,performed_by,timestamp,previous_state,new_state,metadata) VALUES ($1,'dispute_case',$2,'admin_review_started',$3,$4,$5,'under_review',$6)`, [`aud_${randomUUID()}`, caseId, req.user.uid, now, String(current.status), JSON.stringify({ orderId: current.order_id })]);
      });
      return res.json(await loadCase(caseId));
    } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to start dispute review' }); }
  });

  router.post('/:caseId/decision', requireAuth, async (req: any, res) => {
    try {
      if (req.user?.is_admin !== true) return res.status(403).json({ error: 'Admin access required' });
      const caseId = clean(req.params.caseId); const decision = clean(req.body?.decision).toLowerCase(); const note = clean(req.body?.note);
      if (!['approve_refund', 'reject', 'accept_seller_refund'].includes(decision)) return res.status(400).json({ error: 'Unsupported dispute decision' });
      if (!note) return res.status(400).json({ error: 'Decision note is required' });
      const current = await loadCase(caseId);
      if (!current) return res.status(404).json({ error: 'Dispute case not found' });
      if (current.status !== 'under_review') return res.status(409).json({ error: 'Move the dispute into review before making a final decision.' });

      if (decision === 'approve_refund') {
        if (!current.refund_request_id) return res.status(409).json({ error: 'This case has no canonical refund request.' });
        const refundStatus = String(current.refund_request_status);
        if (!['under_review', 'approved'].includes(refundStatus)) return res.status(409).json({ error: `Refund request is ${refundStatus}; it is not ready for approval.` });
        if (refundStatus === 'approved') return res.status(409).json({ error: 'Refund is already approved and awaiting financial execution.' });
        assertRefundTransition('under_review', 'approved', 'admin');
        const escrow = await escrowRepository.findByOrderIdAsync(String(current.order_id));
        if (!escrow) return res.status(409).json({ error: 'Escrow is unavailable; approval cannot validate the financial path.' });
        if (!['funded', 'held', 'disputed'].includes(String(escrow.state))) return res.status(409).json({ error: `Escrow is ${escrow.state}; the normal held-funds refund path is unavailable.` });
        const now = new Date().toISOString();
        await withTransaction(async (client) => {
          await client.query(`UPDATE refund_requests SET status='approved', admin_decision=$1, latest_status_at=$2, updated_at=$2 WHERE id=$3`, [note, now, current.refund_request_id]);
          if (current.latest_attempt_id) await client.query(`UPDATE dispute_attempts SET decision='refund_approved', resolution_note=$1, updated_at=$2 WHERE id=$3`, [note, now, current.latest_attempt_id]);
          await client.query(`INSERT INTO audit_events (id,entity_type,entity_id,event_type,performed_by,timestamp,previous_state,new_state,metadata) VALUES ($1,'dispute_case',$2,'admin_refund_approved',$3,$4,'under_review','under_review',$5)`, [`aud_${randomUUID()}`, caseId, req.user.uid, now, JSON.stringify({ orderId: current.order_id, note, financialExecutionRequired: true })]);
        });
        return res.json({ case: await loadCase(caseId), message: 'Refund approved. Financial execution remains a separate workflow.' });
      }

      if (decision === 'accept_seller_refund') {
        if (String(current.refunded_status) !== 'refunded' || String(current.refunded_provider) !== 'seller_reported') return res.status(409).json({ error: 'A seller-reported refund must be recorded before it can be formally accepted.' });
        const now = new Date().toISOString();
        await withTransaction(async (client) => {
          if (current.latest_attempt_id) await client.query(`UPDATE dispute_attempts SET status='resolved', decision='seller_refund_accepted', resolution_note=$1, resolved_by=$2, resolved_at=$3, updated_at=$3 WHERE id=$4`, [note, req.user.uid, now, current.latest_attempt_id]);
          if (current.refund_request_id) await client.query(`UPDATE refund_requests SET status='refunded', admin_decision=$1, latest_status_at=$2, updated_at=$2 WHERE id=$3`, [note, now, current.refund_request_id]);
          await client.query(`UPDATE dispute_cases SET status='resolved', outcome='seller_refund_accepted', resolved_at=$1, updated_at=$1 WHERE id=$2`, [now, caseId]);
          await client.query(`INSERT INTO audit_events (id,entity_type,entity_id,event_type,performed_by,timestamp,previous_state,new_state,metadata) VALUES ($1,'dispute_case',$2,'seller_refund_accepted',$3,$4,'under_review','resolved',$5)`, [`aud_${randomUUID()}`, caseId, req.user.uid, now, JSON.stringify({ orderId: current.order_id, refundTransactionId: current.refund_transaction_row_id })]);
        });
        return res.json({ case: await loadCase(caseId) });
      }

      const escrow = await escrowRepository.findByOrderIdAsync(String(current.order_id));
      if (!escrow) return res.status(409).json({ error: 'Escrow is unavailable; the rejection cannot be validated safely.' });
      if (String(escrow.state) !== 'released') return res.status(409).json({ error: 'Reject the dispute only when funds have been released to the seller.' });
      const now = new Date().toISOString();
      await withTransaction(async (client) => {
        if (current.latest_attempt_id) await client.query(`UPDATE dispute_attempts SET status='rejected', decision='rejected', resolution_note=$1, resolved_by=$2, resolved_at=$3, updated_at=$3 WHERE id=$4`, [note, req.user.uid, now, current.latest_attempt_id]);
        if (current.refund_request_id) await client.query(`UPDATE refund_requests SET status='rejected', admin_decision=$1, latest_status_at=$2, updated_at=$2 WHERE id=$3`, [note, now, current.refund_request_id]);
        await client.query(`UPDATE dispute_cases SET status='rejected', outcome='rejected', resolved_at=$1, updated_at=$1 WHERE id=$2`, [now, caseId]);
        await client.query(`INSERT INTO audit_events (id,entity_type,entity_id,event_type,performed_by,timestamp,previous_state,new_state,metadata) VALUES ($1,'dispute_case',$2,'admin_dispute_rejected',$3,$4,'under_review','rejected',$5)`, [`aud_${randomUUID()}`, caseId, req.user.uid, now, JSON.stringify({ orderId: current.order_id, note })]);
      });
      return res.json({ case: await loadCase(caseId) });
    } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to apply dispute decision' }); }
  });

  router.post('/refunds/:refundRequestId/execute', requireAuth, async (req: any, res) => {
    try {
      if (req.user?.is_admin !== true) return res.status(403).json({ error: 'Admin access required' });
      const refundRequestId = clean(req.params.refundRequestId);
      const note = clean(req.body?.note);
      if (!note) return res.status(400).json({ error: 'Execution note is required' });

      const result = await withTransaction(async (client) => {
        const refundResult = await client.query<Record<string, unknown>>(
          `SELECT rr.*, dc.status AS case_status, dc.id AS case_id, o.status AS order_status,
                  o.buyer_id AS order_buyer_id, o.seller_id AS order_seller_id,
                  o.total_currency AS order_currency, e.state AS escrow_state,
                  e.balance_amount AS escrow_balance_amount, e.balance_currency AS escrow_balance_currency
           FROM refund_requests rr
           INNER JOIN dispute_cases dc ON dc.id = rr.dispute_case_id
           INNER JOIN orders o ON o.id = rr.order_id
           LEFT JOIN escrows e ON e.order_id = rr.order_id
           WHERE rr.id = $1
           LIMIT 1
           FOR UPDATE`,
          [refundRequestId],
        );
        const refund = refundResult.rows[0];
        if (!refund) throw new Error('Refund request not found');
        if (String(refund.status) === 'refunded') return { duplicate: true, refund };
        if (String(refund.status) !== 'approved') throw new Error(`Refund request is ${refund.status}; only approved refunds can be executed.`);
        if (!['open', 'under_review'].includes(String(refund.case_status))) throw new Error(`Dispute case is ${refund.case_status}; execution is no longer available.`);
        if (!['funded', 'held', 'disputed'].includes(String(refund.escrow_state))) throw new Error(`Escrow is ${refund.escrow_state}; held-funds execution is unavailable.`);

        const requestedAmount = Number(refund.amount_requested ?? 0);
        const escrowBalance = Number(refund.escrow_balance_amount ?? 0);
        if (!(requestedAmount > 0)) throw new Error('Refund amount must be positive.');
        if (Math.abs(requestedAmount - escrowBalance) > 0.000001) throw new Error('The current execution path supports full held-balance refunds only; partial refund execution requires a dedicated financial path.');

        const existingTransaction = await client.query<Record<string, unknown>>(
          `SELECT * FROM refund_transactions WHERE refund_request_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
          [refundRequestId],
        );
        if (existingTransaction.rows[0]) {
          const transaction = existingTransaction.rows[0];
          if (String(transaction.status) === 'refunded') return { duplicate: true, refund, transaction };
        }

        assertRefundTransition('approved', 'processing', 'financial_workflow');
        await client.query(`UPDATE refund_requests SET status='processing', latest_status_at=$1, updated_at=$1 WHERE id=$2`, [new Date().toISOString(), refundRequestId]);

        const escrowRefund = await escrowRepository.refundHeldBalanceAsync({
          orderId: String(refund.order_id),
          refundedBy: String(req.user.uid),
          reference: `refund-execution:${refundRequestId}`,
          note,
        }, client);
        if (!escrowRefund) throw new Error('Escrow refund could not be executed.');

        const now = new Date().toISOString();
        const transactionId = `internal-refund:${refundRequestId}`;
        const refundTransactionId = `rft_${randomUUID()}`;
        await client.query(
          `INSERT INTO refund_transactions (
             id, refund_request_id, order_id, buyer_id, seller_id, amount, currency, destination,
             payment_method, provider, transaction_id, status, executed_by, executed_at,
             supporting_evidence, metadata, created_at, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'buymesho_escrow',$10,'refunded',$11,$12,$13,$14,$12,$12)`,
          [refundTransactionId, refundRequestId, refund.order_id, refund.order_buyer_id, refund.order_seller_id, requestedAmount, refund.escrow_balance_currency ?? refund.order_currency ?? 'MWK', refund.refund_destination ?? null, refund.payment_method ?? null, transactionId, req.user.uid, now, refund.evidence ?? '[]', JSON.stringify({ note, escrowRefundEntryId: escrowRefund.refundEntry.id })],
        );
        assertRefundTransition('processing', 'refunded', 'financial_workflow');
        await client.query(`UPDATE refund_requests SET status='refunded', refund_transaction_id=$1, latest_status_at=$2, updated_at=$2 WHERE id=$3`, [refundTransactionId, now, refundRequestId]);
        if (refund.latest_attempt_id) {
          await client.query(`UPDATE dispute_attempts SET status='resolved', decision='refund_executed', resolution_note=$1, resolved_by=$2, resolved_at=$3, updated_at=$3 WHERE id=$4`, [note, req.user.uid, now, refund.latest_attempt_id]);
        }
        await client.query(`UPDATE dispute_cases SET status='resolved', outcome='refund_executed', resolved_at=$1, updated_at=$1 WHERE id=$2`, [now, refund.case_id]);
        await client.query(`UPDATE orders SET status='refunded', updated_at=$1 WHERE id=$2`, [now, refund.order_id]);
        await client.query(`INSERT INTO audit_events (id,entity_type,entity_id,event_type,performed_by,timestamp,previous_state,new_state,metadata) VALUES ($1,'dispute_case',$2,'refund_financially_executed',$3,$4,'under_review','resolved',$5)`, [`aud_${randomUUID()}`, refund.case_id, req.user.uid, now, JSON.stringify({ orderId: refund.order_id, refundRequestId, refundTransactionId, amount: requestedAmount, note, executionMode: 'internal_escrow' })]);
        return { duplicate: false, refund, refundTransactionId, transactionId, amount: requestedAmount };
      });

      return res.status(result.duplicate ? 200 : 201).json({ ...result, message: result.duplicate ? 'Refund was already executed.' : 'Refund executed and recorded successfully.' });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to execute refund' });
    }
  });

  return router;
}

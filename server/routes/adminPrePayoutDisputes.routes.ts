import express, { type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { query, withTransaction } from '../postgres.js';
import { serverOrderService } from '../modules/orders/order.service.js';
import { notifyDisputeWorkflowEvent } from '../modules/notifications/dispute-workflow.notification.js';

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function loadPrePayoutCase(caseId: string) {
  const result = await query<Record<string, unknown>>(
    `SELECT dc.*, o.status AS order_status, o.total_amount, o.total_currency, o.payment_reference,
            da.id AS latest_attempt_id, da.status AS latest_attempt_status,
            rr.id AS refund_request_id, rr.status AS refund_request_status,
            rr.amount_requested AS refund_requested_amount, rr.currency AS refund_currency,
            p.id AS payout_id, p.status AS payout_status
       FROM dispute_cases dc
       INNER JOIN orders o ON o.id = dc.order_id
       LEFT JOIN LATERAL (
         SELECT * FROM dispute_attempts
          WHERE case_id = dc.id
          ORDER BY created_at DESC LIMIT 1
       ) da ON TRUE
       LEFT JOIN LATERAL (
         SELECT * FROM refund_requests
          WHERE dispute_case_id = dc.id
          ORDER BY created_at DESC LIMIT 1
       ) rr ON TRUE
       LEFT JOIN LATERAL (
         SELECT id, status FROM payouts
          WHERE order_id = o.id
          ORDER BY created_at DESC LIMIT 1
       ) p ON TRUE
      WHERE dc.id = $1
      LIMIT 1`,
    [caseId],
  );
  return result.rows[0] ?? null;
}

export function createAdminPrePayoutDisputesRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.post('/:caseId/approve-refund', requireAuth, async (req: any, res) => {
    try {
      if (req.user?.is_admin !== true) return res.status(403).json({ error: 'Admin access required' });
      const caseId = clean(req.params.caseId);
      const note = clean(req.body?.note);
      if (!note) return res.status(400).json({ error: 'Decision note is required' });

      const current = await loadPrePayoutCase(caseId);
      if (!current) return res.status(404).json({ error: 'Dispute case not found' });
      if (clean(current.resolution_owner) !== 'admin') return res.status(409).json({ error: 'This dispute is not owned by the admin review workflow.' });
      if (!['open', 'under_review'].includes(clean(current.status))) return res.status(409).json({ error: 'This dispute is no longer active.' });
      if (clean(current.payout_status) === 'paid') return res.status(409).json({ error: 'Seller payout has already completed; this case must remain on its assigned workflow.' });
      if (!current.refund_request_id) return res.status(409).json({ error: 'This case has no canonical refund request.' });
      if (clean(current.refund_request_status) !== 'under_review') return res.status(409).json({ error: `Refund request is ${current.refund_request_status}; it is not ready for approval.` });

      const now = new Date().toISOString();
      await withTransaction(async (client) => {
        const caseLock = await client.query<Record<string, unknown>>(
          `SELECT status, resolution_owner FROM dispute_cases WHERE id = $1 FOR UPDATE`,
          [caseId],
        );
        const refundLock = await client.query<Record<string, unknown>>(
          `SELECT status FROM refund_requests WHERE id = $1 FOR UPDATE`,
          [current.refund_request_id],
        );
        const row = caseLock.rows[0];
        if (!row || clean(row.resolution_owner) !== 'admin' || !['open', 'under_review'].includes(clean(row.status))) {
          throw new Error('Pre-payout dispute is no longer available for admin refund approval.');
        }
        if (clean(refundLock.rows[0]?.status) !== 'under_review') throw new Error(`Refund request is ${refundLock.rows[0]?.status}; it is not ready for approval.`);

        await client.query(
          `UPDATE refund_requests SET status='approved', admin_decision=$1, latest_status_at=$2, updated_at=$2 WHERE id=$3`,
          [note, now, current.refund_request_id],
        );
        if (current.latest_attempt_id) {
          await client.query(
            `UPDATE dispute_attempts SET decision='refund_approved', resolution_note=$1, updated_at=$2 WHERE id=$3`,
            [note, now, current.latest_attempt_id],
          );
        }
        await client.query(
          `INSERT INTO audit_events (id, entity_type, entity_id, event_type, performed_by, timestamp, previous_state, new_state, metadata)
           VALUES ($1,'dispute_case',$2,'admin_pre_payout_refund_approved',$3,$4,'under_review','under_review',$5)`,
          [`aud_${randomUUID()}`, caseId, req.user.uid, now, JSON.stringify({ orderId: current.order_id, note, payoutStatus: current.payout_status, source: 'pre_payout_dispute' })],
        );
      });

      try {
        await notifyDisputeWorkflowEvent({
          caseId,
          orderId: String(current.order_id),
          buyerId: String(current.buyer_id),
          sellerId: String(current.seller_id),
          event: 'approved',
          note,
          amount: Number(current.refund_requested_amount ?? 0),
          currency: String(current.refund_currency ?? current.total_currency ?? 'MWK'),
        });
      } catch (notificationError) {
        console.warn('Failed to send pre-payout refund approval notification:', notificationError);
      }

      return res.json({ case: await loadPrePayoutCase(caseId), message: 'Refund approved for pre-payout dispute. Financial execution remains a separate workflow.' });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to approve pre-payout refund' });
    }
  });

  router.post('/:caseId/execute-refund', requireAuth, async (req: any, res) => {
    try {
      if (req.user?.is_admin !== true) return res.status(403).json({ error: 'Admin access required' });
      const caseId = clean(req.params.caseId);
      const note = clean(req.body?.note);
      if (!note) return res.status(400).json({ error: 'Execution note is required.' });

      const current = await loadPrePayoutCase(caseId);
      if (!current) return res.status(404).json({ error: 'Dispute case not found' });
      if (clean(current.resolution_owner) !== 'admin') return res.status(409).json({ error: 'This dispute is not owned by the admin review workflow.' });
      if (clean(current.status) !== 'under_review' || clean(current.refund_request_status) !== 'approved') return res.status(409).json({ error: 'The pre-payout refund must be approved before execution.' });
      if (clean(current.payout_status) === 'paid') return res.status(409).json({ error: 'Seller payout has completed. The pre-payout refund path is no longer safe to execute.' });
      if (!current.refund_request_id) return res.status(409).json({ error: 'This case has no canonical refund request.' });

      const now = new Date().toISOString();
      const result = await withTransaction(async (client) => {
        const caseLock = await client.query<Record<string, unknown>>(
          `SELECT id, order_id, buyer_id, seller_id, status, resolution_owner FROM dispute_cases WHERE id = $1 FOR UPDATE`,
          [caseId],
        );
        const refundLock = await client.query<Record<string, unknown>>(
          `SELECT id, status, amount_requested, currency FROM refund_requests WHERE dispute_case_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
          [caseId],
        );
        const payoutLock = await client.query<Record<string, unknown>>(
          `SELECT id, status FROM payouts WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
          [current.order_id],
        );
        const row = caseLock.rows[0];
        const refundRow = refundLock.rows[0];
        const payoutRow = payoutLock.rows[0];
        if (!row) throw new Error('Dispute case not found');
        if (clean(row.resolution_owner) !== 'admin') throw new Error('This dispute is not owned by the admin review workflow.');
        if (clean(row.status) !== 'under_review' || clean(refundRow?.status) !== 'approved') throw new Error('The pre-payout refund must be approved before execution.');
        if (clean(payoutRow?.status) === 'paid') throw new Error('Seller payout has completed. The pre-payout refund path is no longer safe to execute.');

        if (payoutRow?.id && !['cancelled', 'failed', 'paid'].includes(clean(payoutRow.status))) {
          await client.query(
            `UPDATE payouts SET status='cancelled', provider_status='cancelled', failure_reason='payout_cancelled_for_dispute', manual_review_reason=$1, updated_at=$2 WHERE id=$3 AND status <> 'paid'`,
            ['Pre-payout dispute refund approved; outstanding seller payout cancelled before refund execution.', now, payoutRow.id],
          );
          await client.query(
            `INSERT INTO payout_events (payout_id, seller_id, event_type, actor_type, actor_id, note, payload, created_at) VALUES ($1,$2,'payout_cancelled_for_dispute_refund','admin',$3,$4,$5,$6)`,
            [payoutRow.id, String(row.seller_id), req.user.uid, note, JSON.stringify({ caseId, orderId: row.order_id }), now],
          );
        }

        const transactionId = `prepay_${caseId}_${Date.now()}`;
        const transactionDbId = randomUUID();
        await client.query(
          `INSERT INTO refund_transactions
             (id, refund_request_id, order_id, buyer_id, seller_id, amount, currency, destination, payment_method, provider, transaction_id, status, executed_by, executed_at, supporting_evidence, metadata, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,NULL,'platform_pre_payout',$8,'refunded',$5,$9,'[]',$10,$9,$9)`,
          [transactionDbId, refundRow.id, row.order_id, row.buyer_id, row.seller_id, Number(refundRow.amount_requested ?? 0), String(refundRow.currency ?? current.refund_currency ?? current.total_currency ?? 'MWK'), transactionId, now, JSON.stringify({ caseId, note, source: 'pre_payout_dispute' })],
        );
        await client.query(`UPDATE refund_requests SET status='refunded', refund_transaction_id=$1, latest_status_at=$2, updated_at=$2 WHERE id=$3`, [transactionId, now, refundRow.id]);
        await client.query(`UPDATE dispute_attempts SET status='resolved', decision='refunded', resolution_note=$1, resolved_by=$2, resolved_at=$3, updated_at=$3 WHERE case_id=$4 AND status IN ('open','under_review')`, [note, req.user.uid, now, caseId]);
        await client.query(`UPDATE dispute_cases SET status='resolved', outcome='refunded', resolved_at=$1, updated_at=$1 WHERE id=$2`, [now, caseId]);
        await client.query(`UPDATE disputes SET status='resolved', state='resolved', resolution=$1, resolved_by=$2, resolved_at=$3, updated_at=$3 WHERE order_id=$4 AND status IN ('open','under_review','awaiting_response')`, [note, req.user.uid, now, row.order_id]);
        await client.query(
          `INSERT INTO audit_events (id, entity_type, entity_id, event_type, performed_by, timestamp, previous_state, new_state, metadata)
           VALUES ($1,'dispute_case',$2,'admin_pre_payout_refund_executed',$3,$4,'under_review','resolved',$5)`,
          [`aud_${randomUUID()}`, caseId, req.user.uid, now, JSON.stringify({ orderId: row.order_id, transactionId, amount: Number(refundRow.amount_requested ?? 0), source: 'pre_payout_dispute', payoutCancelled: Boolean(payoutRow?.id) })],
        );
        return { transactionId, amount: Number(refundRow.amount_requested ?? 0), currency: String(refundRow.currency ?? current.refund_currency ?? current.total_currency ?? 'MWK') };
      });

      const updatedOrder = serverOrderService.setStatus(String(current.order_id), 'refunded');
      try {
        await notifyDisputeWorkflowEvent({ caseId, orderId: String(current.order_id), buyerId: String(current.buyer_id), sellerId: String(current.seller_id), event: 'refund_completed', note, amount: result.amount, currency: result.currency, transactionId: result.transactionId });
      } catch (notificationError) {
        console.warn('Failed to send pre-payout refund completion notification:', notificationError);
      }
      return res.json({ case: await loadPrePayoutCase(caseId), order: updatedOrder, transaction: result });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to execute pre-payout refund' });
    }
  });

  return router;
}

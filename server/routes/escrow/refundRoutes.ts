import express, { type RequestHandler } from 'express';
import { escrowRepository } from '../../modules/escrow/escrow.repository.js';
import { orderRepository } from '../../modules/orders/order.repository.js';
import { serverOrderService } from '../../modules/orders/order.service.js';
import { notifyOrderRefunded } from '../../modules/notifications/order-refunded.notification.js';
import { getPaymentDb } from '../../postgresCompat.js';
import { withTransaction } from '../../postgres.js';
import { escrowActionLimiter, jsonError } from './shared.js';

export function createRefundRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.post('/:orderId/refund', escrowActionLimiter, requireAuth, async (req, res) => {
    try {
      const adminUid = req.user?.uid;
      if (req.user?.is_admin !== true || !adminUid) {
        return res.status(403).json({ error: 'Only an admin can refund escrow' });
      }

      const orderId = String(req.params.orderId ?? '').trim();
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      if (!reason) return res.status(400).json({ error: 'Refund reason is required' });

      const order = orderRepository.findById(orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      const escrow = escrowRepository.findByOrderId(orderId);
      if (!escrow) return res.status(404).json({ error: 'Escrow not found' });
      if (escrow.state !== 'disputed') {
        return res.status(409).json({ error: 'Admin escrow refunds are available only for disputed orders.', code: 'REFUND_REQUIRES_DISPUTE' });
      }

      const cancelPayouts = getPaymentDb().transaction(() => {
        const db = getPaymentDb();
        const linked = db.prepare(
          `SELECT id, status
           FROM payouts
           WHERE escrow_id = ?
             AND COALESCE(release_entry_id, '') = ''
             AND status NOT IN ('paid', 'cancelled', 'failed', 'refunded')`,
        ).all(escrow.id) as Array<{ id: string; status: string }>;

        for (const payout of linked) {
          db.prepare(
            `UPDATE payouts
             SET status = 'cancelled',
                 failure_reason = 'payout_cancelled',
                 updated_at = ?
             WHERE id = ?`,
          ).run(new Date().toISOString(), payout.id);
        }

        return linked.map((payout) => ({ ...payout, status: 'cancelled' }));
      });
      const cancelledPayouts = cancelPayouts();

      const refund = escrowRepository.refundHeldBalance({
        orderId,
        refundedBy: adminUid,
        note: reason,
        reference: `escrow-refund:${orderId}`,
      });
      if (!refund) return res.status(404).json({ error: 'Escrow not found' });

      const updatedOrder = serverOrderService.setStatus(orderId, 'refunded');
      let resolvedDispute: Record<string, unknown> | null = null;

      try {
        const canonicalResult = await withTransaction(async (client) => {
          const caseResult = await client.query<Record<string, unknown>>(
            `SELECT id, buyer_id, seller_id, status, outcome
             FROM dispute_cases
             WHERE order_id = $1
               AND status IN ('open', 'under_review', 'awaiting_response')
             ORDER BY created_at DESC
             LIMIT 1
             FOR UPDATE`,
            [orderId],
          );
          const caseRow = caseResult.rows[0];
          if (!caseRow) return null;

          const resolvedAt = new Date().toISOString();
          const attemptResult = await client.query<Record<string, unknown>>(
            `SELECT id
             FROM dispute_attempts
             WHERE case_id = $1
             ORDER BY created_at DESC
             LIMIT 1
             FOR UPDATE`,
            [caseRow.id],
          );
          const attempt = attemptResult.rows[0];
          if (attempt) {
            await client.query(
              `UPDATE dispute_attempts
               SET status = 'resolved',
                   decision = 'refunded',
                   resolution_note = $1,
                   resolved_by = $2,
                   resolved_at = $3,
                   updated_at = $3
               WHERE id = $4`,
              [reason, adminUid, resolvedAt, attempt.id],
            );
          }

          await client.query(
            `UPDATE refund_requests
             SET status = 'refunded',
                 latest_status_at = $1,
                 updated_at = $1
             WHERE order_id = $2
               AND status IN ('requested', 'under_review', 'approved', 'processing')`,
            [resolvedAt, orderId],
          );

          await client.query(
            `UPDATE dispute_cases
             SET status = 'resolved',
                 outcome = 'refunded',
                 resolved_at = $1,
                 updated_at = $1
             WHERE id = $2`,
            [resolvedAt, caseRow.id],
          );

          await client.query(
            `UPDATE disputes
             SET status = 'resolved',
                 state = 'resolved',
                 resolution = $1,
                 resolved_by = $2,
                 resolved_at = $3,
                 updated_at = $3
             WHERE order_id = $4
               AND status IN ('open', 'under_review')`,
            [reason, adminUid, resolvedAt, orderId],
          );

          await client.query(
            `INSERT INTO audit_events
              (id, entity_type, entity_id, event_type, performed_by, timestamp, previous_state, new_state, metadata)
             VALUES ($1, 'dispute_case', $2, 'admin_refund_executed', $3, $4, $5, 'resolved', $6)`,
            [
              `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              String(caseRow.id),
              adminUid,
              resolvedAt,
              String(caseRow.status ?? 'open'),
              JSON.stringify({ orderId, outcome: 'refunded', reason, source: 'admin_payments' }),
            ],
          );

          return client.query<Record<string, unknown>>(`SELECT * FROM dispute_cases WHERE id = $1 LIMIT 1`, [caseRow.id]);
        });
        if (canonicalResult?.rows[0]) resolvedDispute = canonicalResult.rows[0];
      } catch (canonicalError) {
        console.warn('Admin refund completed but canonical dispute settlement sync failed:', canonicalError);
      }

      try {
        const legacyDb = getPaymentDb();
        const legacy = legacyDb.prepare(
          `SELECT id FROM disputes WHERE order_id = ? AND status IN ('open', 'under_review') ORDER BY created_at DESC LIMIT 1`,
        ).get(orderId) as { id?: string } | undefined;
        if (legacy?.id) {
          const resolvedAt = new Date().toISOString();
          legacyDb.prepare(
            `UPDATE disputes
             SET status = 'resolved',
                 state = 'resolved',
                 resolution = ?,
                 resolved_by = ?,
                 resolved_at = ?,
                 updated_at = ?
             WHERE id = ?`,
          ).run(reason, adminUid, resolvedAt, resolvedAt, legacy.id);
        }
      } catch (legacyError) {
        console.warn('Admin refund completed but legacy dispute settlement sync failed:', legacyError);
      }

      try {
        await notifyOrderRefunded({
          order: updatedOrder ?? order,
          reason,
        });
      } catch (emailError) {
        console.warn('Failed to send refunded-order notification:', emailError);
      }

      return res.status(200).json({
        escrow: refund.escrow,
        refundEntry: refund.refundEntry,
        cancelledPayouts,
        dispute: resolvedDispute,
        order: updatedOrder ?? order,
      });
    } catch (error) {
      return res.status(400).json(jsonError(error, 'Failed to refund escrow'));
    }
  });

  return router;
}

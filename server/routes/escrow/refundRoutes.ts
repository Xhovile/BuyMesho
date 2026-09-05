import express, { type RequestHandler } from 'express';
import { escrowRepository } from '../../modules/escrow/escrow.repository.js';
import { orderRepository } from '../../modules/orders/order.repository.js';
import { serverOrderService } from '../../modules/orders/order.service.js';
import { notifyOrderRefunded } from '../../modules/notifications/order-refunded.notification.js';
import { getPaymentDb } from '../../postgresCompat.js';
import { escrowActionLimiter, jsonError } from './shared.js';

export function createRefundRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.post('/:orderId/refund', escrowActionLimiter, requireAuth, async (req, res) => {
    try {
      if (req.user?.is_admin !== true) {
        return res.status(403).json({ error: 'Only an admin can refund escrow' });
      }

      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      if (!reason) return res.status(400).json({ error: 'Refund reason is required' });

      const order = orderRepository.findById(req.params.orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      const escrow = escrowRepository.findByOrderId(req.params.orderId);
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
        orderId: req.params.orderId,
        refundedBy: req.user.uid,
        note: reason,
        reference: `escrow-refund:${req.params.orderId}`,
      });
      if (!refund) return res.status(404).json({ error: 'Escrow not found' });

      const updatedOrder = serverOrderService.setStatus(req.params.orderId, 'refunded');

      let resolvedDispute: Record<string, unknown> | null = null;
      if (order.status === 'disputed') {
        const db = getPaymentDb();
        const dispute = db.prepare(
          `SELECT id
           FROM disputes
           WHERE order_id = ?
             AND status = 'open'
           ORDER BY created_at DESC
           LIMIT 1`,
        ).get(req.params.orderId) as { id?: string } | undefined;

        if (dispute?.id) {
          const resolvedAt = new Date().toISOString();
          db.prepare(
            `UPDATE disputes
             SET status = 'resolved',
                 resolved_by = ?,
                 resolution_note = ?,
                 updated_at = ?,
                 resolved_at = ?
             WHERE id = ?`,
          ).run(req.user.uid, reason, resolvedAt, resolvedAt, dispute.id);
          resolvedDispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(dispute.id) as Record<string, unknown>;
        }
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

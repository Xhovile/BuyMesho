import express, { type RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { getPaymentDb } from '../../postgresCompat.js';
import { escrowRepository } from '../../modules/escrow/escrow.repository.js';
import { orderRepository } from '../../modules/orders/order.repository.js';
import { serverOrderService } from '../../modules/orders/order.service.js';
import { assertAllowedDisputeTransition, type DisputeStatus } from './disputeState.js';
import {
  assertOrderAccess,
  disputeLimiter,
  jsonError,
} from './shared.js';

export function createDisputeRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.post('/', disputeLimiter, requireAuth, (req, res) => {
    try {
      const { orderId, reason } = req.body as {
        orderId?: string;
        reason?: string;
      };

      if (!orderId || !reason) {
        return res.status(400).json({
          error: 'orderId and reason are required',
        });
      }

      const access = assertOrderAccess(req, orderId, orderRepository);

      if ('error' in access) {
        return res.status(access.error.status).json(access.error.body);
      }

      const openedBy = req.user!.uid;
      const now = new Date().toISOString();
      const db = getPaymentDb();

      const result = db.transaction(() => {
        const existing = db
          .prepare(
            `SELECT *
             FROM disputes
             WHERE order_id = ?
               AND status = 'open'
             ORDER BY created_at ASC
             LIMIT 1`,
          )
          .get(orderId) as Record<string, unknown> | undefined;

        if (existing) {
          return {
            created: false,
            dispute: existing,
          };
        }

        const id = randomUUID();
        const escrow = escrowRepository.findByOrderId(orderId);

        db.prepare(
          `INSERT INTO disputes (
            id,
            order_id,
            escrow_id,
            opened_by,
            reason,
            status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`,
        ).run(
          id,
          orderId,
          escrow?.id ?? null,
          openedBy,
          reason,
          now,
          now,
        );

        if (escrow) {
          escrowRepository.updateState(orderId, 'disputed');
          const updatedOrder = serverOrderService.setStatus(orderId, 'disputed');
          if (!updatedOrder) {
            throw new Error('Order not found while opening dispute');
          }
        }

        const created = db
          .prepare('SELECT * FROM disputes WHERE id = ? LIMIT 1')
          .get(id) as Record<string, unknown> | undefined;

        if (!created) {
          throw new Error('Failed to create dispute');
        }

        return {
          created: true,
          dispute: created,
        };
      })();

      return res.status(result.created ? 201 : 200).json({
        id: result.dispute.id,
        orderId: result.dispute.order_id,
        openedBy: result.dispute.opened_by,
        reason: result.dispute.reason,
        status: result.dispute.status,
        createdAt: result.dispute.created_at,
        alreadyOpen: !result.created,
      });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to open dispute'));
    }
  });

  router.get('/:orderId', disputeLimiter, requireAuth, (req, res) => {
    try {
      const access = assertOrderAccess(req, req.params.orderId, orderRepository);

      if ('error' in access) {
        return res.status(access.error.status).json(access.error.body);
      }

      const db = getPaymentDb();

      const dispute = db
        .prepare(
          'SELECT * FROM disputes WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
        )
        .get(req.params.orderId);

      if (!dispute) {
        return res.status(404).json({
          error: 'No dispute found for this order',
        });
      }

      return res.status(200).json(dispute);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch dispute'));
    }
  });

  router.patch('/:id', disputeLimiter, requireAuth, (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({
          error: 'Admin access required',
        });
      }

      const { status, resolutionNote } = req.body as {
        status?: string;
        resolutionNote?: string;
      };

      if (!status || !['resolved', 'rejected'].includes(status)) {
        return res.status(400).json({
          error: 'status must be "resolved" or "rejected"',
        });
      }

      const now = new Date().toISOString();
      const db = getPaymentDb();
      const existing = db.prepare('SELECT status FROM disputes WHERE id = ?').get(req.params.id) as { status?: string } | undefined;

      if (!existing) {
        return res.status(404).json({
          error: 'Dispute not found',
        });
      }

      assertAllowedDisputeTransition(existing.status as DisputeStatus, status as DisputeStatus);

      db.prepare(
        `UPDATE disputes
         SET status = ?,
             resolved_by = ?,
             resolution_note = ?,
             updated_at = ?
         WHERE id = ?`,
      ).run(
        status,
        req.user.uid,
        resolutionNote ?? null,
        now,
        req.params.id,
      );

      const updated = db
        .prepare('SELECT * FROM disputes WHERE id = ?')
        .get(req.params.id);

      return res.status(200).json(updated);
    } catch (error) {
      return res.status(400).json(jsonError(error, 'Failed to resolve dispute'));
    }
  });

  return router;
}
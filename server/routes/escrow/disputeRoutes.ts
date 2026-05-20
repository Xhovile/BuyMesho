import express, { type RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { getPaymentDb } from '../../sqlite.js';
import { escrowRepository } from '../../modules/escrow/escrow.repository.js';
import { orderRepository } from '../../modules/orders/order.repository.js';
import { serverOrderService } from '../../modules/orders/order.service.js';
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
      const id = randomUUID();
      const db = getPaymentDb();

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
        serverOrderService.setStatus(orderId, 'disputed');
      }

      return res.status(201).json({
        id,
        orderId,
        openedBy,
        reason,
        status: 'open',
        createdAt: now,
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

      if (!updated) {
        return res.status(404).json({
          error: 'Dispute not found',
        });
      }

      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to resolve dispute'));
    }
  });

  return router;
}

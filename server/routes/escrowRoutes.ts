import express, { type Request, type RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import { getPaymentDb } from '../sqlite.js';
import { escrowRepository } from '../modules/escrow/escrow.repository.js';
import { orderRepository } from '../modules/orders/order.repository.js';
import { serverOrderService } from '../modules/orders/order.service.js';

const disputeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a moment.' },
});

const payoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a moment.' },
});

function jsonError(error: unknown, fallback: string): { error: string } {
  return { error: error instanceof Error ? error.message : fallback };
}

const escrowActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a moment.' },
});

function getRequestUser(req: Request): { uid: string; is_admin?: boolean } | null {
  if (!req.user?.uid) return null;
  return { uid: req.user.uid, is_admin: req.user.is_admin === true };
}

function canAccessOrder(req: Request, order: { buyerId: string; sellerId: string }): boolean {
  const user = getRequestUser(req);
  if (!user) return false;
  if (user.is_admin) return true;
  return user.uid === order.buyerId || user.uid === order.sellerId;
}

function assertOrderAccess(req: Request, orderId: string) {
  const order = orderRepository.findById(orderId);

  if (!order) {
    return { error: { status: 404, body: { error: 'Order not found' } } as const };
  }

  if (!canAccessOrder(req, order)) {
    return {
      error: {
        status: 403,
        body: { error: 'You are not allowed to access this order' },
      } as const,
    };
  }

  return { order };
}

export function createEscrowRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get('/:orderId', requireAuth, (req, res) => {
    try {
      const access = assertOrderAccess(req, req.params.orderId);

      if ('error' in access) {
        return res.status(access.error.status).json(access.error.body);
      }

      const escrow = escrowRepository.findByOrderId(req.params.orderId);

      if (!escrow) {
        return res.status(404).json({ error: 'Escrow not found for this order' });
      }

      return res.status(200).json(escrow);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch escrow'));
    }
  });

  router.post('/:orderId/release', escrowActionLimiter, requireAuth, (req, res) => {
    try {
      const access = assertOrderAccess(req, req.params.orderId);

      if ('error' in access) {
        return res.status(access.error.status).json(access.error.body);
      }

      const { orderId } = req.params;
      const escrow = escrowRepository.findByOrderId(orderId);

      if (!escrow) {
        return res.status(404).json({ error: 'Escrow not found' });
      }

      if (escrow.state === 'released' || escrow.state === 'refunded' || escrow.state === 'closed') {
        return res.status(400).json({ error: `Escrow is already ${escrow.state}` });
      }

      const updated = escrowRepository.updateState(orderId, 'released');
      const orderUpdated = serverOrderService.setStatus(orderId, 'fulfilled');

      if (!orderUpdated) {
        console.warn(`[escrow] release: order ${orderId} not found when updating status to fulfilled`);
      }

      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to release escrow'));
    }
  });

  router.post('/:orderId/refund', escrowActionLimiter, requireAuth, (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { orderId } = req.params;
      const escrow = escrowRepository.findByOrderId(orderId);

      if (!escrow) {
        return res.status(404).json({ error: 'Escrow not found' });
      }

      if (escrow.state === 'released' || escrow.state === 'refunded' || escrow.state === 'closed') {
        return res.status(400).json({ error: `Escrow is already ${escrow.state}` });
      }

      const updated = escrowRepository.updateState(orderId, 'refunded');
      const orderUpdated = serverOrderService.setStatus(orderId, 'refunded');

      if (!orderUpdated) {
        console.warn(`[escrow] refund: order ${orderId} not found when updating status to refunded`);
      }

      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to refund escrow'));
    }
  });

  return router;
}

export function createDisputeRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.post('/', disputeLimiter, requireAuth, (req, res) => {
    try {
      const { orderId, reason } = req.body as { orderId?: string; reason?: string };

      if (!orderId || !reason) {
        return res.status(400).json({ error: 'orderId and reason are required' });
      }

      const access = assertOrderAccess(req, orderId);

      if ('error' in access) {
        return res.status(access.error.status).json(access.error.body);
      }

      const openedBy = req.user!.uid;
      const now = new Date().toISOString();
      const id = randomUUID();
      const db = getPaymentDb();

      const escrow = escrowRepository.findByOrderId(orderId);

      db.prepare(
        `INSERT INTO disputes (id, order_id, escrow_id, opened_by, reason, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`,
      ).run(id, orderId, escrow?.id ?? null, openedBy, reason, now, now);

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
      const access = assertOrderAccess(req, req.params.orderId);

      if ('error' in access) {
        return res.status(access.error.status).json(access.error.body);
      }

      const db = getPaymentDb();
      const dispute = db
        .prepare('SELECT * FROM disputes WHERE order_id = ? ORDER BY created_at DESC LIMIT 1')
        .get(req.params.orderId);

      if (!dispute) {
        return res.status(404).json({ error: 'No dispute found for this order' });
      }

      return res.status(200).json(dispute);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch dispute'));
    }
  });

  router.patch('/:id', disputeLimiter, requireAuth, (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { status, resolutionNote } = req.body as {
        status?: string;
        resolutionNote?: string;
      };

      if (!status || !['resolved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'status must be "resolved" or "rejected"' });
      }

      const now = new Date().toISOString();
      const db = getPaymentDb();

      db.prepare(
        `UPDATE disputes
         SET status = ?, resolved_by = ?, resolution_note = ?, updated_at = ?
         WHERE id = ?`,
      ).run(status, req.user.uid, resolutionNote ?? null, now, req.params.id);

      const updated = db.prepare('SELECT * FROM disputes WHERE id = ?').get(req.params.id);

      if (!updated) {
        return res.status(404).json({ error: 'Dispute not found' });
      }

      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to resolve dispute'));
    }
  });

  return router;
}

export function createPayoutRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.post('/', payoutLimiter, requireAuth, (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { sellerId, orderId, amount, currency = 'MWK' } = req.body as {
        sellerId?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
      };

      if (!sellerId || !amount) {
        return res.status(400).json({ error: 'sellerId and amount are required' });
      }

      const now = new Date().toISOString();
      const id = randomUUID();
      const db = getPaymentDb();
      const escrow = orderId ? escrowRepository.findByOrderId(orderId) : undefined;

      db.prepare(
        `INSERT INTO payouts (id, seller_id, order_id, escrow_id, amount, currency, status, processed_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'processing', ?, ?, ?)`,
      ).run(id, sellerId, orderId ?? null, escrow?.id ?? null, amount, currency, req.user.uid, now, now);

      return res.status(201).json({
        id,
        sellerId,
        orderId,
        amount,
        currency,
        status: 'processing',
        createdAt: now,
      });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to process payout'));
    }
  });

  return router;
}

import express, { type RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import { getPaymentDb } from '../sqlite.js';
import { escrowRepository } from '../modules/escrow/escrow.repository.js';
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

export function createEscrowRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  // GET /api/escrow/:orderId — fetch escrow status
  router.get('/:orderId', requireAuth, (req, res) => {
    try {
      const escrow = escrowRepository.findByOrderId(req.params.orderId);
      if (!escrow) {
        return res.status(404).json({ error: 'Escrow not found for this order' });
      }
      return res.status(200).json(escrow);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch escrow'));
    }
  });

  // POST /api/escrow/:orderId/release — buyer or seller triggers release
  router.post('/:orderId/release', escrowActionLimiter, requireAuth, (req, res) => {
    try {
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

  // POST /api/escrow/:orderId/refund — refund buyer
  router.post('/:orderId/refund', escrowActionLimiter, requireAuth, (req, res) => {
    try {
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

  // POST /api/disputes — open a dispute
  router.post('/', disputeLimiter, requireAuth, (req, res) => {
    try {
      const { orderId, reason } = req.body as { orderId?: string; reason?: string };
      if (!orderId || !reason) {
        return res.status(400).json({ error: 'orderId and reason are required' });
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

      console.log('[notification] dispute_opened', JSON.stringify({ id, orderId, openedBy }));

      return res.status(201).json({ id, orderId, openedBy, reason, status: 'open', createdAt: now });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to open dispute'));
    }
  });

  // GET /api/disputes/:orderId — fetch dispute for an order
  router.get('/:orderId', disputeLimiter, requireAuth, (req, res) => {
    try {
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

  // PATCH /api/disputes/:id — resolve a dispute (admin only)
  router.patch('/:id', disputeLimiter, requireAuth, (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const { status, resolutionNote } = req.body as { status?: string; resolutionNote?: string };
      if (!status || !['resolved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'status must be "resolved" or "rejected"' });
      }
      const now = new Date().toISOString();
      const db = getPaymentDb();
      db.prepare(
        `UPDATE disputes SET status = ?, resolved_by = ?, resolution_note = ?, updated_at = ? WHERE id = ?`,
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

  // POST /api/payouts — admin triggers payout to seller after escrow release
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

      console.log('[payout] initiated', JSON.stringify({ id, sellerId, orderId, amount, currency }));

      return res.status(201).json({ id, sellerId, orderId, amount, currency, status: 'processing', createdAt: now });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to process payout'));
    }
  });

  return router;
}

import express, { type RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { getPaymentDb } from '../../sqlite.js';
import { escrowRepository } from '../../modules/escrow/escrow.repository.js';
import {
  jsonError,
  payoutLimiter,
} from './shared.js';

export function createPayoutRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.post('/', payoutLimiter, requireAuth, (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({
          error: 'Admin access required',
        });
      }

      const {
        sellerId,
        orderId,
        amount,
        currency = 'MWK',
      } = req.body as {
        sellerId?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
      };

      if (!sellerId || !amount) {
        return res.status(400).json({
          error: 'sellerId and amount are required',
        });
      }

      const now = new Date().toISOString();
      const id = randomUUID();
      const db = getPaymentDb();
      const escrow = orderId
        ? escrowRepository.findByOrderId(orderId)
        : undefined;

      db.prepare(
        `INSERT INTO payouts (
          id,
          seller_id,
          order_id,
          escrow_id,
          amount,
          currency,
          status,
          processed_by,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'processing', ?, ?, ?)`,
      ).run(
        id,
        sellerId,
        orderId ?? null,
        escrow?.id ?? null,
        amount,
        currency,
        req.user.uid,
        now,
        now,
      );

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

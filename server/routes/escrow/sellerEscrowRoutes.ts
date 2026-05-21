import express, { type RequestHandler } from "express";
import { getPaymentDb } from "../../sqlite.js";

export function createSellerEscrowRouter(requireAuth: RequestHandler) {
  const router = express.Router();

  router.get("/me", requireAuth, (req, res) => {
    try {
      const sellerId = req.user?.uid;

      if (!sellerId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const db = getPaymentDb();

      const escrows = db.prepare(`
        SELECT
          e.id,
          e.order_id as orderId,
          e.state,
          e.status,
          e.balance_amount as balanceAmount,
          e.total_amount as totalAmount,
          e.currency,
          e.created_at as createdAt,
          e.updated_at as updatedAt
        FROM escrows e
        INNER JOIN orders o ON o.id = e.order_id
        WHERE o.seller_id = ?
          AND LOWER(COALESCE(e.state, '')) NOT IN ('released', 'refunded', 'closed')
        ORDER BY e.created_at DESC
      `).all(sellerId);

      return res.status(200).json(escrows);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to load seller escrows",
      });
    }
  });

  return router;
}

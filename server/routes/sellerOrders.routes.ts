import express, { type RequestHandler } from "express";
import { getPaymentDb } from "../postgresCompat.js";
import { orderRepository } from "../modules/orders/order.repository.js";
import { paymentRepository } from "../modules/payments/payment.repository.js";
import { escrowRepository } from "../modules/escrow/escrow.repository.js";

function buildSellerOrderBundle(orderId: string, sellerUid: string) {
  const order = orderRepository.findById(orderId);
  if (!order || String(order.sellerId) !== sellerUid) return null;

  const payment = order.paymentReference
    ? paymentRepository.findByReference(order.paymentReference) ?? null
    : null;
  const escrow = escrowRepository.findByOrderId(order.id) ?? null;
  const db: any = getPaymentDb();
  const dispute = db
    .prepare("SELECT * FROM disputes WHERE order_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(order.id) ?? null;

  return { order, payment, escrow, dispute };
}

export function createSellerOrdersRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get("", requireAuth, async (req: any, res) => {
    try {
      const sellerUid = String(req.user?.uid ?? "").trim();
      if (!sellerUid) return res.status(401).json({ error: "Authentication required" });

      const db: any = getPaymentDb();
      const rows = db
        .prepare("SELECT id FROM orders WHERE seller_id = ? ORDER BY created_at DESC")
        .all(sellerUid) as Array<{ id: string }>;

      return res.json(
        rows
          .map((row) => buildSellerOrderBundle(String(row.id), sellerUid))
          .filter(Boolean),
      );
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch seller orders",
      });
    }
  });

  router.get("/:id", requireAuth, async (req: any, res) => {
    try {
      const sellerUid = String(req.user?.uid ?? "").trim();
      const orderId = decodeURIComponent(String(req.params.id ?? "")).trim();
      if (!sellerUid) return res.status(401).json({ error: "Authentication required" });
      if (!orderId) return res.status(400).json({ error: "Order id is required" });

      const bundle = buildSellerOrderBundle(orderId, sellerUid);
      if (!bundle) return res.status(404).json({ error: "Seller order not found" });

      return res.json(bundle);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch seller order",
      });
    }
  });

  return router;
}

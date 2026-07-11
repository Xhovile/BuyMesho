import express, { type RequestHandler } from 'express';
import { getPaymentDb } from '../sqlite.js';
import { orderRepository } from '../modules/orders/order.repository.js';
import { paymentRepository } from '../modules/payments/payment.repository.js';
import { escrowRepository } from '../modules/escrow/escrow.repository.js';

function jsonError(error: unknown, fallback: string): { error: string } {
  return { error: error instanceof Error ? error.message : fallback };
}

type OrderLookupResult = {
  order: NonNullable<ReturnType<typeof orderRepository.findById>>;
  payment: ReturnType<typeof paymentRepository.findByReference> | null;
  escrow: ReturnType<typeof escrowRepository.findByOrderId> | null;
  dispute: Record<string, unknown> | null;
};

function findOrderByParam(param: string) {
  const byId = orderRepository.findById(param);
  if (byId) return byId;

  const byPaymentRef = orderRepository.findByPaymentReference(param);
  if (byPaymentRef) return byPaymentRef;

  return undefined;
}

function buildOrderBundle(order: NonNullable<ReturnType<typeof orderRepository.findById>>): OrderLookupResult {
  const paymentReference = order.paymentReference ?? null;
  const payment = paymentReference ? paymentRepository.findByReference(paymentReference) : null;
  const escrow = escrowRepository.findByOrderId(order.id);
  const db = getPaymentDb();
  const dispute = db.prepare('SELECT * FROM disputes WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').get(order.id) as Record<string, unknown> | undefined;

  return {
    order,
    payment: payment ?? null,
    escrow: escrow ?? null,
    dispute: dispute ?? null,
  };
}

function listMyOrders(buyerId: string): OrderLookupResult[] {
  const db = getPaymentDb();
  const rows = db
    .prepare('SELECT id FROM orders WHERE buyer_id = ? ORDER BY created_at DESC, updated_at DESC')
    .all(buyerId) as Array<{ id: string }>;

  return rows
    .map((row) => {
      const order = orderRepository.findById(row.id);
      return order ? buildOrderBundle(order) : null;
    })
    .filter((entry): entry is OrderLookupResult => entry !== null);
}

export function createOrderRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get('/me', requireAuth, (req, res) => {
    try {
      const buyerId = req.user!.uid;
      return res.status(200).json(listMyOrders(buyerId));
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch orders'));
    }
  });

  router.get('/by-reference/:reference', requireAuth, (req, res) => {
    try {
      const order = orderRepository.findByPaymentReference(req.params.reference);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      if (order.buyerId !== req.user!.uid && !req.user?.is_admin) {
        return res.status(403).json({ error: 'You can only view your own orders' });
      }

      return res.status(200).json(buildOrderBundle(order));
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch order'));
    }
  });

  router.get('/:idOrReference', requireAuth, (req, res) => {
    try {
      const order = findOrderByParam(req.params.idOrReference);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.buyerId !== req.user!.uid && !req.user?.is_admin) {
        return res.status(403).json({ error: 'You can only view your own orders' });
      }

      return res.status(200).json(buildOrderBundle(order));
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch order'));
    }
  });

  return router;
}

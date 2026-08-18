import express, { type RequestHandler } from 'express';
import { query } from '../postgres.js';
import { orderRepository, type StoredOrder } from '../modules/orders/order.repository.js';
import { paymentRepository, type StoredPayment } from '../modules/payments/payment.repository.js';
import { escrowRepository, type StoredEscrow } from '../modules/escrow/escrow.repository.js';

function jsonError(error: unknown, fallback: string): { error: string } {
  return { error: error instanceof Error ? error.message : fallback };
}

type OrderLookupResult = {
  order: StoredOrder;
  payment: StoredPayment | null;
  escrow: StoredEscrow | null;
  dispute: Record<string, unknown> | null;
};

async function findOrderByParam(param: string) {
  const byId = await orderRepository.findByIdAsync(param);
  if (byId) return byId;
  return orderRepository.findByPaymentReferenceAsync(param);
}

async function buildOrderBundle(order: StoredOrder): Promise<OrderLookupResult> {
  const paymentReference = order.paymentReference ?? null;
  const [payment, escrow, disputeResult] = await Promise.all([
    paymentReference ? paymentRepository.findByReferenceAsync(paymentReference) : Promise.resolve(undefined),
    escrowRepository.findByOrderIdAsync(order.id),
    query<Record<string, unknown>>(
      'SELECT * FROM disputes WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
      [order.id],
    ),
  ]);

  return {
    order,
    payment: payment ?? null,
    escrow: escrow ?? null,
    dispute: disputeResult.rows[0] ?? null,
  };
}

async function listMyOrders(buyerId: string): Promise<OrderLookupResult[]> {
  const result = await query<{ id: string }>(
    'SELECT id FROM orders WHERE buyer_id = $1 ORDER BY created_at DESC, updated_at DESC',
    [buyerId],
  );

  const orders = await Promise.all(
    result.rows.map((row) => orderRepository.findByIdAsync(row.id)),
  );

  return (await Promise.all(
    orders
      .filter((order): order is StoredOrder => Boolean(order))
      .map((order) => buildOrderBundle(order)),
  ));
}

export function createOrderRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get('/me', requireAuth, async (req, res) => {
    try {
      const buyerId = req.user!.uid;
      return res.status(200).json(await listMyOrders(buyerId));
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch orders'));
    }
  });

  router.get('/by-reference/:reference', requireAuth, async (req, res) => {
    try {
      const order = await orderRepository.findByPaymentReferenceAsync(req.params.reference);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.buyerId !== req.user!.uid && !req.user?.is_admin) {
        return res.status(403).json({ error: 'You can only view your own orders' });
      }

      return res.status(200).json(await buildOrderBundle(order));
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch order'));
    }
  });

  router.get('/:idOrReference', requireAuth, async (req, res) => {
    try {
      const order = await findOrderByParam(req.params.idOrReference);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.buyerId !== req.user!.uid && !req.user?.is_admin) {
        return res.status(403).json({ error: 'You can only view your own orders' });
      }

      return res.status(200).json(await buildOrderBundle(order));
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch order'));
    }
  });

  return router;
}

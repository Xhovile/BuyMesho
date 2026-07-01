import express, { type RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import { paymentController } from './payment.controller.js';
import { paymentWebhookHandler } from './payment.webhooks.js';
import { payoutWebhookHandler } from '../payouts/payout.webhooks.js';
import { PAYMENT_ENDPOINTS } from './payment.endpoints.js';
import { paychanguProvider } from './paychangu.provider.js';
import { serverPaymentService, createServerPaymentConfigFromEnv } from './payment.service.js';
import { serverOrderService } from '../orders/order.service.js';
import { orderRepository } from '../orders/order.repository.js';
import { paymentRepository } from './payment.repository.js';
import { escrowRepository } from '../escrow/escrow.repository.js';
import { getPaymentDb, checkIdempotencyKey, storeIdempotencyKey } from '../../sqlite.js';
import type { CreatePaymentRequest } from '../../../src/modules/payments/types.js';
import type { CheckoutSettlementRoute } from '../../../src/shared/types/payment.js';
import type { OrderState } from '../../../src/modules/orders/orderState.js';
import { calculateCustomerCheckoutFees } from '../payouts/payout.policy.js';

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many checkout requests. Please try again in a moment.' },
});

const initializeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment initialize requests. Please try again in a moment.' },
});

const orderLookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many order lookup requests. Please try again in a moment.' },
});

interface ListingRow {
  id: number;
  seller_uid: string;
  name: string;
  price: number;
  status: string;
  quantity: number;
  sold_quantity: number;
}

function jsonError(error: unknown, fallback: string): { error: string } {
  return { error: error instanceof Error ? error.message : fallback };
}

type AuthUser = {
  uid: string;
  is_admin?: boolean;
};

type OrderBundle = {
  order: ReturnType<typeof orderRepository.findById>;
  payment: ReturnType<typeof paymentRepository.findByReference> | null;
  escrow: ReturnType<typeof escrowRepository.findByOrderId> | null;
  dispute: Record<string, unknown> | null;
};

function findOrderByParam(param: string) {
  const byId = orderRepository.findById(param);
  if (byId) return byId;
  return orderRepository.findByPaymentReference(param);
}

function buildOrderBundle(orderId: string): OrderBundle | null {
  const order = orderRepository.findById(orderId);
  if (!order) return null;

  const db = getPaymentDb();
  const paymentReference = order.paymentReference ?? null;
  const payment = paymentReference ? paymentRepository.findByReference(paymentReference) : null;
  const escrow = escrowRepository.findByOrderId(order.id) ?? null;
  const dispute = db
    .prepare('SELECT * FROM disputes WHERE order_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(order.id) as Record<string, unknown> | undefined;

  return {
    order,
    payment,
    escrow,
    dispute: dispute ?? null,
  };
}

function getOrderBundleForCurrentUser(idOrReference: string, user: AuthUser): OrderBundle | null | 'forbidden' {
  const order = findOrderByParam(idOrReference);
  if (!order) return null;
  if (order.buyerId !== user.uid && !user.is_admin) return 'forbidden';
  return buildOrderBundle(order.id);
}

function buildPublicTransactionStatus(idOrReference: string): Record<string, unknown> | null {
  const order = findOrderByParam(idOrReference);
  if (!order) return null;
  const bundle = buildOrderBundle(order.id);
  if (!bundle) return null;

  return {
    reference: order.paymentReference ?? idOrReference,
    orderId: order.id,
    orderStatus: order.status,
    paymentStatus: bundle.payment?.status ?? null,
    paymentVerified: Boolean(bundle.payment?.verified),
    escrowStatus: bundle.escrow?.state ?? null,
    escrowId: bundle.escrow?.id ?? null,
  };
}

export function createPaymentRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.post('/checkout', checkoutLimiter, requireAuth, async (req, res) => {
    try {
      const idempotencyKey = (req.headers['idempotency-key'] ?? req.headers['Idempotency-Key']) as string | undefined;

      if (idempotencyKey) {
        const cached = checkIdempotencyKey(idempotencyKey);
        if (cached) {
          return res.status(200).json(cached);
        }
      }

      const {
        listingId,
        quantity = 1,
        items,
        method = 'mobile_money',
        settlementRoute = 'escrow',
        returnUrl,
        cancelUrl,
        buyerName,
        buyerPhone,
      } = req.body as {
        listingId?: number | string;
        quantity?: number;
        items?: Array<{ listingId?: number | string; quantity?: number }>;
        method?: string;
        settlementRoute?: CheckoutSettlementRoute;
        returnUrl?: string;
        cancelUrl?: string;
        buyerName?: string;
        buyerPhone?: string;
      };

      const requestedItems = Array.isArray(items) && items.length > 0
        ? items.map((item) => ({ listingId: item.listingId, quantity: item.quantity ?? 1 }))
        : listingId
          ? [{ listingId, quantity }]
          : [];

      if (requestedItems.length === 0) {
        return res.status(400).json({ error: 'listingId or items are required' });
      }

      const db = getPaymentDb();
      const currency = 'MWK';
      const now = new Date().toISOString();
      const buyerUid = req.user!.uid;
      const buyerEmail = req.user!.email ?? '';
      const orderId = `ord_${randomUUID()}`;

      const orderItems: OrderState['items'] = [];
      const listingIds: string[] = [];
      const sellerIds = new Set<string>();
      let total = 0;

      for (const item of requestedItems) {
        const numericListingId = Number(item.listingId);
        if (!Number.isInteger(numericListingId) || numericListingId <= 0) {
          return res.status(400).json({ error: 'Each checkout item requires a valid listingId' });
        }

        const listing = db
          .prepare('SELECT * FROM listings WHERE id = ? AND is_hidden = 0 AND deleted_at IS NULL')
          .get(numericListingId) as ListingRow | undefined;
        if (!listing) {
          return res.status(404).json({ error: `Listing ${numericListingId} not found` });
        }

        if (listing.status === 'sold') {
          return res.status(400).json({ error: `${listing.name} is no longer available` });
        }

        const parsedQty = Number(item.quantity ?? 1);
        if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
          return res.status(400).json({ error: `Invalid quantity for ${listing.name}` });
        }

        const safeQty = Math.max(1, Math.floor(parsedQty));
        const availableQty = Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0));

        if (availableQty === 0) {
          return res.status(400).json({ error: `${listing.name} is out of stock` });
        }

        if (safeQty > availableQty) {
          return res.status(400).json({ error: `Only ${availableQty} unit(s) available for ${listing.name}` });
        }

        const unitPrice = Number(listing.price);
        total += unitPrice * safeQty;
        sellerIds.add(listing.seller_uid);
        listingIds.push(String(numericListingId));
        const itemReference = `${orderId}-ITEM-${String(orderItems.length + 1).padStart(2, '0')}`;

        orderItems.push({
          listingId: String(numericListingId),
          title: listing.name,
          quantity: safeQty,
          unitPrice: { amount: unitPrice, currency },
          reference: itemReference,
        });
      }

      const primarySellerId = sellerIds.values().next().value ?? 'multiple-sellers';
      const feeBreakdown = calculateCustomerCheckoutFees({ itemTotalAmount: total, currency });

      const order: OrderState = {
        id: orderId,
        buyerId: buyerUid,
        sellerId: primarySellerId,
        source: 'listing',
        status: 'pending_payment',
        currency,
        subtotal: { amount: total, currency },
        total: { amount: feeBreakdown.finalTotalAmount, currency },
        paymentProvider: 'paychangu',
        settlementRoute,
        items: orderItems,
        placedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      serverOrderService.create(order);

      const config = createServerPaymentConfigFromEnv();

      const paymentRequest: CreatePaymentRequest = {
        orderId,
        provider: 'paychangu',
        method: method as CreatePaymentRequest['method'],
        settlementRoute,
        amount: { amount: feeBreakdown.finalTotalAmount, currency },
        customer: {
          id: buyerUid,
          name: buyerName || buyerEmail || buyerUid,
          email: buyerEmail || undefined,
          phoneNumber: buyerPhone,
        },
        returnUrl: returnUrl || `${req.protocol}://${req.get('host')}/payment/return?listingId=${encodeURIComponent(listingIds[0] ?? '')}`,
        cancelUrl: cancelUrl || `${req.protocol}://${req.get('host')}/payment/return?cancelled=1&listingId=${encodeURIComponent(listingIds[0] ?? '')}`,
        metadata: {
          listingId: listingIds[0],
          listingIds,
          orderItemReferences: orderItems.map((item) => item.reference),
          sellerId: primarySellerId,
          sellerIds: Array.from(sellerIds),
          feeBreakdown,
          settlementRoute,
        },
      };

      const payment = await paychanguProvider.createPayment(paymentRequest, config);

      paymentRepository.save({ ...payment, verified: false });

      orderRepository.update(orderId, (o) => ({
        ...o,
        paymentReference: payment.reference,
        settlementRoute,
        updatedAt: new Date().toISOString(),
      }));

      const result: Record<string, unknown> = {
        orderId,
        paymentId: payment.id,
        reference: payment.reference,
        checkoutUrl: payment.checkoutUrl,
        status: payment.status,
        feeBreakdown,
        items: orderItems.map((item) => ({
          listingId: item.listingId,
          title: item.title,
          quantity: item.quantity,
          reference: item.reference,
        })),
        settlementRoute,
      };

      if (idempotencyKey) {
        storeIdempotencyKey(idempotencyKey, result);
      }

      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json(jsonError(error, 'Checkout failed'));
    }
  });

  router.post('/initialize', initializeLimiter, requireAuth, async (req, res) => {
    try {
      const result = await serverPaymentService.createPayment(req.body as CreatePaymentRequest);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json(jsonError(error, 'Failed to initialize payment'));
    }
  });

  router.post('/paychangu/initialize', requireAuth, async (req, res) => {
    try {
      const result = await paymentController.createPaychanguPayment(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json(jsonError(error, 'Failed to create payment'));
    }
  });

  router.get('/orders/me', orderLookupLimiter, requireAuth, (req, res) => {
    try {
      const db = getPaymentDb();
      const orderIds = db
        .prepare('SELECT id FROM orders WHERE buyer_id = ? ORDER BY created_at DESC')
        .all(req.user!.uid) as Array<{ id: string }>;

      const bundles = orderIds
        .map((row) => buildOrderBundle(row.id))
        .filter((bundle): bundle is OrderBundle => bundle !== null);

      return res.status(200).json(bundles);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch buyer orders'));
    }
  });

  router.get('/orders/by-reference/:reference', orderLookupLimiter, requireAuth, (req, res) => {
    try {
      const bundle = getOrderBundleForCurrentUser(req.params.reference, req.user!);
      if (!bundle) return res.status(404).json({ error: 'Order not found' });
      if (bundle === 'forbidden') return res.status(403).json({ error: 'You can only view your own orders' });
      return res.status(200).json(bundle);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch order'));
    }
  });

  router.get('/orders/:idOrReference', orderLookupLimiter, requireAuth, (req, res) => {
    try {
      const bundle = getOrderBundleForCurrentUser(req.params.idOrReference, req.user!);
      if (!bundle) return res.status(404).json({ error: 'Order not found' });
      if (bundle === 'forbidden') return res.status(403).json({ error: 'You can only view your own orders' });
      return res.status(200).json(bundle);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch order'));
    }
  });

  router.get('/orders/:orderId/status', orderLookupLimiter, (req, res) => {
    try {
      const status = buildPublicTransactionStatus(req.params.orderId);
      if (!status) return res.status(404).json({ error: 'Order not found' });
      return res.status(200).json(status);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch payment status'));
    }
  });

  router.get('/:reference/status', orderLookupLimiter, (req, res) => {
    try {
      const status = buildPublicTransactionStatus(decodeURIComponent(req.params.reference));
      if (!status) return res.status(404).json({ error: 'Order not found' });
      return res.status(200).json(status);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch payment status'));
    }
  });

  // Backward-compatible alias for the payment return page.
  router.get('/public-status/:reference', orderLookupLimiter, (req, res) => {
    try {
      const status = buildPublicTransactionStatus(decodeURIComponent(req.params.reference));
      if (!status) return res.status(404).json({ error: 'Order not found' });
      return res.status(200).json(status);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch payment status'));
    }
  });

  // Public verification route for payment_return redirects.
  // PayChangu redirects the browser back without the app Bearer token.
  router.get('/paychangu/verify/:txRef', async (req, res) => {
    try {
      const txRef = decodeURIComponent(req.params.txRef);
      const result = await paymentController.verifyPaychangu(txRef);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json(jsonError(error, 'Failed to verify payment'));
    }
  });

  router.post('/paychangu-payout/webhook', express.raw({ type: '*/*' }), async (req, res) => {
    try {
      const rawBody =
        Buffer.isBuffer(req.body) ? req.body.toString('utf8') :
        typeof req.body === 'string' ? req.body :
        req.body && typeof req.body === 'object' ? JSON.stringify(req.body) :
        '';

      if (!rawBody) {
        return res.status(400).json({ error: 'Missing webhook body' });
      }

      const signature =
        req.header('x-paychangu-signature') ?? req.header('Signature');

      const result = await payoutWebhookHandler.handlePaychanguWebhook(signature, rawBody);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json(jsonError(error, 'Failed to process payout webhook'));
    }
  });

  router.post('/paychangu/webhook', express.raw({ type: '*/*' }), async (req, res) => {
    try {
      const rawBody =
        Buffer.isBuffer(req.body) ? req.body.toString('utf8') :
        typeof req.body === 'string' ? req.body :
        req.body && typeof req.body === 'object' ? JSON.stringify(req.body) :
        '';

      if (!rawBody) {
        return res.status(400).json({ error: 'Missing webhook body' });
      }

      const signature =
        req.header('x-paychangu-signature') ?? req.header('Signature');

      const result = await paymentWebhookHandler.handlePaychanguWebhook(signature, rawBody);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json(jsonError(error, 'Failed to process payment webhook'));
    }
  });

  return router;
}

export function mountPayChanguRoutes(app: express.Express, requireAuth: RequestHandler): void {
  app.use('/api/payments/paychangu/webhook', express.raw({ type: 'application/json' }));
  app.use('/api/payments/paychangu-payout/webhook', express.raw({ type: 'application/json' }));
  app.use('/api/payments', createPaymentRouter(requireAuth));
}

export const paychanguRoutes = {
  initialize: PAYMENT_ENDPOINTS.paychangu.initialize,
  verify: PAYMENT_ENDPOINTS.paychangu.verify,
  webhook: PAYMENT_ENDPOINTS.paychangu.webhook,
  payoutWebhook: PAYMENT_ENDPOINTS.paychangu.payoutWebhook,
} as const;

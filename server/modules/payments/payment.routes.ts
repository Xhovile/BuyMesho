import express, { type RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import { paymentController } from './payment.controller.js';
import { paymentWebhookHandler } from './payment.webhooks.js';
import { PAYMENT_ENDPOINTS } from './payment.endpoints.js';
import { paychanguProvider } from './paychangu.provider.js';
import { serverPaymentService, createServerPaymentConfigFromEnv } from './payment.service.js';
import { serverOrderService } from '../orders/order.service.js';
import { orderRepository } from '../orders/order.repository.js';
import { paymentRepository } from './payment.repository.js';
import { getPaymentDb, checkIdempotencyKey, storeIdempotencyKey } from '../../sqlite.js';
import type { CreatePaymentRequest } from '../../../src/modules/payments/types.js';
import type { OrderState } from '../../../src/modules/orders/orderState.js';

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
        method = 'mobile_money',
        returnUrl,
        cancelUrl,
        buyerName,
        buyerPhone,
      } = req.body as {
        listingId?: number;
        quantity?: number;
        method?: string;
        returnUrl?: string;
        cancelUrl?: string;
        buyerName?: string;
        buyerPhone?: string;
      };

      if (!listingId) {
        return res.status(400).json({ error: 'listingId is required' });
      }

      const db = getPaymentDb();
      const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId) as ListingRow | undefined;
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      if (listing.status === 'sold') {
        return res.status(400).json({ error: 'This listing is no longer available' });
      }

      const safeQty = Math.max(1, Number(quantity));
      const availableQty = Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0));

      if (availableQty === 0) {
        return res.status(400).json({ error: 'This listing is out of stock' });
      }

      if (safeQty > availableQty) {
        return res.status(400).json({ error: `Only ${availableQty} unit(s) available` });
      }

      const unitPrice = Number(listing.price);
      const total = unitPrice * safeQty;
      const currency = 'MWK';
      const now = new Date().toISOString();
      const buyerUid = req.user!.uid;
      const buyerEmail = req.user!.email ?? '';
      const orderId = `ord_${randomUUID()}`;

      const order: OrderState = {
        id: orderId,
        buyerId: buyerUid,
        sellerId: listing.seller_uid,
        source: 'listing',
        status: 'pending_payment',
        currency,
        subtotal: { amount: total, currency },
        total: { amount: total, currency },
        paymentProvider: 'paychangu',
        items: [
          {
            listingId: String(listingId),
            title: listing.name,
            quantity: safeQty,
            unitPrice: { amount: unitPrice, currency },
          },
        ],
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
        amount: { amount: total, currency },
        customer: {
          id: buyerUid,
          name: buyerName || buyerEmail || buyerUid,
          email: buyerEmail || undefined,
          phoneNumber: buyerPhone,
        },
        returnUrl: returnUrl || `${req.protocol}://${req.get('host')}/payment/return`,
        cancelUrl: cancelUrl || `${req.protocol}://${req.get('host')}/payment/return?cancelled=1`,
        metadata: {
          listingId: String(listingId),
          sellerId: listing.seller_uid,
        },
      };

      const payment = await paychanguProvider.createPayment(paymentRequest, config);

      paymentRepository.save({ ...payment, verified: false });

      orderRepository.update(orderId, (o) => ({
        ...o,
        paymentReference: payment.reference,
        updatedAt: new Date().toISOString(),
      }));

      const result: Record<string, unknown> = {
        orderId,
        paymentId: payment.id,
        reference: payment.reference,
        checkoutUrl: payment.checkoutUrl,
        status: payment.status,
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

  router.post('/paychangu/webhook', express.raw({ type: '*/*' }), async (req, res) => {
    try {
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body ?? {});

      const payload = rawBody ? JSON.parse(rawBody) : {};
      const signature = req.header('x-paychangu-signature') ?? req.header('Signature');
      const result = await paymentWebhookHandler.handlePaychanguWebhook(signature, rawBody || payload);

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json(jsonError(error, 'Failed to process webhook'));
    }
  });

  return router;
}

export function mountPayChanguRoutes(app: express.Express, requireAuth: RequestHandler): void {
  app.use('/api/payments', createPaymentRouter(requireAuth));
}

export const paychanguRoutes = {
  initialize: PAYMENT_ENDPOINTS.paychangu.initialize,
  verify: PAYMENT_ENDPOINTS.paychangu.verify,
  webhook: PAYMENT_ENDPOINTS.paychangu.webhook,
} as const;

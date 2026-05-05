import express, { type RequestHandler } from 'express';
import { paymentController } from './payment.controller.js';
import { paymentWebhookHandler } from './payment.webhooks.js';
import { PAYMENT_ENDPOINTS } from './payment.endpoints.js';

function jsonError(error: unknown, fallback: string): { error: string } {
  return { error: error instanceof Error ? error.message : fallback };
}

export function createPaymentRouter(requireAuth?: RequestHandler): express.Router {
  const router = express.Router();
  const auth = requireAuth ?? ((_req, _res, next) => next());

  router.post('/paychangu/initialize', auth, async (req, res) => {
    try {
      const result = await paymentController.createPaychanguPayment(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json(jsonError(error, 'Failed to create payment'));
    }
  });

  router.get('/paychangu/verify/:txRef', auth, async (req, res) => {
    try {
      const result = await paymentController.verifyPaychangu(req.params.txRef);
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
      const signature = req.header('x-paychangu-signature') ?? req.header('signature') ?? undefined;
      const result = await paymentWebhookHandler.handlePaychanguWebhook(signature, rawBody);
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

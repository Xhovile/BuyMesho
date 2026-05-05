import express, { type RequestHandler } from 'express';
import { paymentController } from './payment.controller.js';
import { paymentWebhookHandler } from './payment.webhooks.js';
import { PAYMENT_ENDPOINTS } from './payment.endpoints.js';

export function createPaymentRouter(): express.Router {
  const router = express.Router();

  router.post(PAYMENT_ENDPOINTS.paychangu.initialize, async (req, res) => {
    try {
      const result = await paymentController.createPaychanguPayment(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json(jsonError(error, 'Failed to create payment'));
    }
  });

  router.get(PAYMENT_ENDPOINTS.paychangu.verify, async (req, res) => {
    try {
      const result = await paymentController.verifyPaychangu(req.params.txRef);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to verify payment' });
    }
  });

  router.post(PAYMENT_ENDPOINTS.paychangu.webhook, express.raw({ type: '*/*' }), async (req, res) => {
    try {
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body ?? {});
      const payload = rawBody ? JSON.parse(rawBody) : {};
      const signature = req.header('Signature') ?? req.header('x-paychangu-signature') ?? undefined;
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

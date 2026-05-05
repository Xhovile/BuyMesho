import express, { type RequestHandler } from 'express';
import { paymentController } from './payment.controller';
import { paymentWebhookHandler } from './payment.webhooks';
import { PAYMENT_ENDPOINTS } from './payment.endpoints';
import { paymentRepository } from './payment.repository';

export function createPaymentRouter(): express.Router {
  const router = express.Router();

  router.post(PAYMENT_ENDPOINTS.paychangu.initialize, async (req, res) => {
    try {
      const result = await paymentController.createPaychanguPayment(req.body);
      paymentRepository.save({ ...result, verified: false });
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create payment' });
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
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to process webhook' });
    }
  });

  return router;
}

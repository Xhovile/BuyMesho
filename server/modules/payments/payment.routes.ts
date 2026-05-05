import { Router, type NextFunction, type Request, type Response } from 'express';
import { paymentController } from './payment.controller';

class PaymentRouteError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'PAYMENT_ROUTE_ERROR', details?: unknown) {
    super(message);
    this.name = 'PaymentRouteError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

type AsyncPaymentHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const withPaymentAsync = (handler: AsyncPaymentHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next);
  };
};

export function createPaymentRouter(): Router {
  const router = Router();

  router.post('/paychangu', withPaymentAsync(async (req, res) => {
    const result = await paymentController.createPaychanguPayment(req.body);
    res.status(201).json({ data: result });
  }));

  router.get('/paychangu/verify/:txRef', withPaymentAsync(async (req, res) => {
    const txRef = req.params.txRef?.trim();
    if (!txRef) {
      throw new PaymentRouteError('Missing or invalid txRef', 400, 'PAYMENT_VERIFY_INVALID_TXREF');
    }

    const result = await paymentController.verifyPaychangu(txRef);
    res.status(200).json({ data: result });
  }));

  router.post('/paychangu/webhook', withPaymentAsync(async (req, res) => {
    const signature = req.header('x-paychangu-signature') ?? req.header('X-PayChangu-Signature') ?? undefined;
    const payload = req.body;

    const verification = await paymentController.verifyWebhook('paychangu', signature, payload);
    if (!verification.valid) {
      throw new PaymentRouteError('Invalid PayChangu webhook signature', 401, 'PAYMENT_WEBHOOK_SIGNATURE_INVALID');
    }

    const parsed = await paymentController.parseWebhook('paychangu', payload);
    res.status(200).json({ data: parsed, acknowledged: true });
  }));

  router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const paymentError = err instanceof PaymentRouteError
      ? err
      : new PaymentRouteError(
          err instanceof Error ? err.message : 'Unhandled payment route failure',
          500,
          'PAYMENT_ROUTE_UNHANDLED',
        );

    if (!(err instanceof PaymentRouteError)) {
      console.error('Payment route failure:', err);
    }

    res.status(paymentError.statusCode).json({
      error: {
        code: paymentError.code,
        message: paymentError.message,
        details: paymentError.details,
      },
    });
  });

  return router;
}

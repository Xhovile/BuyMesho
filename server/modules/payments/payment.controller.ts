import type { CreatePaymentRequest, PaymentResult, RefundRequest, RefundResult, WebhookVerificationResult } from '../../../src/modules/payments/types';
import { serverPaymentService } from './payment.service';

export class PaymentController {
  createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    return serverPaymentService.createPayment(request);
  }

  refund(request: RefundRequest): Promise<RefundResult> {
    return serverPaymentService.refund(request);
  }

  verifyWebhook(providerKey: Parameters<typeof serverPaymentService.verifyWebhook>[0], signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> {
    return serverPaymentService.verifyWebhook(providerKey, signature, payload);
  }

  parseWebhook(providerKey: Parameters<typeof serverPaymentService.parseWebhook>[0], payload: unknown): Promise<WebhookVerificationResult> {
    return serverPaymentService.parseWebhook(providerKey, payload);
  }
}

export const paymentController = new PaymentController();

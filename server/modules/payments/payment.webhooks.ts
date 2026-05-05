import type { WebhookVerificationResult } from '../../../src/modules/payments/types';
import { serverPaymentService } from './payment.service';

export class PaymentWebhookHandler {
  verify(providerKey: Parameters<typeof serverPaymentService.verifyWebhook>[0], signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> {
    return serverPaymentService.verifyWebhook(providerKey, signature, payload);
  }

  parse(providerKey: Parameters<typeof serverPaymentService.parseWebhook>[0], payload: unknown): Promise<WebhookVerificationResult> {
    return serverPaymentService.parseWebhook(providerKey, payload);
  }
}

export const paymentWebhookHandler = new PaymentWebhookHandler();

import type { WebhookVerificationResult } from '../../../src/modules/payments/types';
import { serverPaymentService } from './payment.service';
import { serverOrderService } from '../orders/order.service';

export class PaymentWebhookHandler {
  async handlePaychanguWebhook(signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> {
    const result = await serverPaymentService.verifyWebhook('paychangu', signature, payload);

    if (!result.valid) {
      throw new Error('Invalid PayChangu webhook signature');
    }

    const reference = result.reference;
    if (reference) {
      serverOrderService.confirmByPaymentReference(reference);
    }

    return result;
  }

  verify(providerKey: Parameters<typeof serverPaymentService.verifyWebhook>[0], signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> {
    return serverPaymentService.verifyWebhook(providerKey, signature, payload);
  }

  parse(providerKey: Parameters<typeof serverPaymentService.parseWebhook>[0], payload: unknown): Promise<WebhookVerificationResult> {
    return serverPaymentService.parseWebhook(providerKey, payload);
  }
}

export const paymentWebhookHandler = new PaymentWebhookHandler();

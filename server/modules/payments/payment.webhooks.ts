import type { WebhookVerificationResult } from '../../../src/modules/payments/types';
import { serverPaymentService } from './payment.service';
import { serverOrderService } from '../orders/order.service';

export class PaymentWebhookHandler {
  async handlePaychanguWebhook(signature: string | undefined, payload: any): Promise<WebhookVerificationResult> {
    const result = await serverPaymentService.verifyWebhook('paychangu', signature, payload);

    if (!result.valid) {
      throw new Error('Invalid PayChangu webhook signature');
    }

    const reference = result.reference;

    // Minimal flow: mark order as paid (replace with DB later)
    if (reference) {
      const fakeOrder = {
        id: reference,
        status: 'pending_payment',
      } as any;

      serverOrderService.markPaid(fakeOrder);
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

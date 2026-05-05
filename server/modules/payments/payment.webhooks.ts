import type { WebhookVerificationResult } from '../../../src/modules/payments/types';
import { serverPaymentService } from './payment.service';
import { applyVerifiedPayChanguPayment } from './paychangu.flow';
import { paymentRepository } from './payment.repository';
import { isAcceptedPaychanguEventType, isPaychanguSuccessStatus, paychanguWebhookSpec } from './paychangu.provider';

const processedWebhookKeys = new Set<string>();

function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as unknown;
      return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {};
}

export class PaymentWebhookHandler {
  async handlePaychanguWebhook(signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> {
    const result = await serverPaymentService.verifyWebhook('paychangu', signature, payload);

    if (!result.valid) {
      throw new Error('Invalid PayChangu webhook signature');
    }

    await applyVerifiedPayChanguPayment({
      ...result,
      verified: result.valid,
    });

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

import { PaymentGatewayRegistry } from '../paymentGateway';
import { flutterwaveProvider } from '../providers/flutterwave';
import { paychanguProvider } from '../providers/paychangu';
import { paystackProvider } from '../providers/paystack';
import type { CreatePaymentRequest, PaymentResult, RefundRequest, RefundResult, WebhookVerificationResult } from '../types';
import type { PaymentProviderKey } from '../../../shared/types/payment';
import { ApiError } from '../../../shared/api/errors';

export class PaymentService {
  constructor(private readonly registry = PaymentService.createDefaultRegistry()) {}

  static createDefaultRegistry(): PaymentGatewayRegistry {
    const registry = new PaymentGatewayRegistry();
    registry.register(paystackProvider);
    registry.register(flutterwaveProvider);
    registry.register(paychanguProvider);
    return registry;
  }

  getSupportedProviders(): PaymentProviderKey[] {
    return this.registry.list();
  }

  getCapabilities(providerKey: PaymentProviderKey) {
    return this.registry.get(providerKey).capabilities;
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    return this.registry.get(request.provider).createPayment(request);
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    const provider = this.registry.get(request.provider);

    if (!provider.capabilities.supportsRefunds) {
      throw new ApiError(`Refunds are not supported for provider: ${request.provider}`, {
        code: 'REFUNDS_UNSUPPORTED',
        status: 501,
      });
    }

    return provider.refund(request);
  }

  async verifyWebhook(providerKey: PaymentProviderKey, signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> {
    return this.registry.get(providerKey).verifyWebhook(signature, payload);
  }

  async parseWebhook(providerKey: PaymentProviderKey, payload: unknown): Promise<WebhookVerificationResult> {
    return this.registry.get(providerKey).parseWebhook(payload);
  }
}

export const paymentService = new PaymentService();

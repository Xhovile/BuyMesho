import { apiRequest } from '../../../shared/api/client';
import { ENDPOINTS } from '../../../shared/api/endpoints';
import { PaymentGatewayRegistry } from '../paymentGateway';
import { flutterwaveProvider } from '../providers/flutterwave';
import { paychanguProvider } from '../providers/paychangu';
import { paystackProvider } from '../providers/paystack';
import type { CreatePaymentRequest, PaymentResult, PaymentVerificationResult, RefundRequest, RefundResult, WebhookVerificationResult } from '../types';
import type { PaymentProviderKey } from '../../../shared/types/payment';

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

  async verifyPaychanguPayment(txRef: string): Promise<PaymentVerificationResult> {
    return apiRequest<PaymentVerificationResult>(ENDPOINTS.payments.paychangu.verify(txRef));
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    const provider = this.registry.get('paystack');
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

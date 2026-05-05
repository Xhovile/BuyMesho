import type { CreatePaymentRequest, PaymentResult, RefundRequest, RefundResult, WebhookVerificationResult } from '../../../src/modules/payments/types';
import { PaymentGatewayRegistry } from '../../../src/modules/payments/paymentGateway';
import { flutterwaveProvider } from '../../../src/modules/payments/providers/flutterwave';
import { paychanguProvider } from '../../../src/modules/payments/providers/paychangu';
import { paystackProvider } from '../../../src/modules/payments/providers/paystack';

export class ServerPaymentService {
  constructor(private readonly registry = ServerPaymentService.createDefaultRegistry()) {}

  static createDefaultRegistry(): PaymentGatewayRegistry {
    const registry = new PaymentGatewayRegistry();
    registry.register(paystackProvider);
    registry.register(flutterwaveProvider);
    registry.register(paychanguProvider);
    return registry;
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    return this.registry.get(request.provider).createPayment(request);
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    return this.registry.get('paystack').refund(request);
  }

  async verifyWebhook(providerKey: Parameters<PaymentGatewayRegistry['get']>[0], signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> {
    return this.registry.get(providerKey).verifyWebhook(signature, payload);
  }

  async parseWebhook(providerKey: Parameters<PaymentGatewayRegistry['get']>[0], payload: unknown): Promise<WebhookVerificationResult> {
    return this.registry.get(providerKey).parseWebhook(payload);
  }
}

export const serverPaymentService = new ServerPaymentService();

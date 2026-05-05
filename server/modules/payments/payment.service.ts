import type { CreatePaymentRequest, PaymentResult, PaymentVerificationResult, RefundRequest, RefundResult, WebhookVerificationResult } from '../../../src/modules/payments/types';
import { PaymentGatewayRegistry } from '../../../src/modules/payments/paymentGateway';
import { flutterwaveProvider } from '../../../src/modules/payments/providers/flutterwave';
import { paystackProvider } from '../../../src/modules/payments/providers/paystack';
import { paychanguProvider } from './paychangu.provider';

export interface ServerPaymentConfig {
  paychanguSecretKey?: string;
  paychanguWebhookSecret?: string;
  paychanguBaseUrl?: string;
}

export class ServerPaymentService {
  constructor(
    private readonly config: ServerPaymentConfig = {},
    private readonly registry = ServerPaymentService.createDefaultRegistry(),
  ) {}

  static createDefaultRegistry(): PaymentGatewayRegistry {
    const registry = new PaymentGatewayRegistry();
    registry.register(paystackProvider);
    registry.register(flutterwaveProvider);
    registry.register(paychanguProvider);
    return registry;
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    if (request.provider === 'paychangu') {
      return paychanguProvider.createPayment(request, this.config);
    }

    return this.registry.get(request.provider).createPayment(request);
  }

  async verifyPaychanguPayment(txRef: string): Promise<PaymentVerificationResult> {
    return paychanguProvider.verifyPayment(txRef, this.config);
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    return this.registry.get('paystack').refund(request);
  }

  async verifyWebhook(providerKey: Parameters<PaymentGatewayRegistry['get']>[0], signature: string | undefined, payload: string | Record<string, unknown>): Promise<WebhookVerificationResult> {
    if (providerKey === 'paychangu') {
      return paychanguProvider.verifyWebhook(signature, payload, this.config);
    }

    return this.registry.get(providerKey).verifyWebhook(signature, payload);
  }

  async parseWebhook(providerKey: Parameters<PaymentGatewayRegistry['get']>[0], payload: unknown): Promise<WebhookVerificationResult> {
    if (providerKey === 'paychangu') {
      return paychanguProvider.parseWebhook(payload);
    }

    return this.registry.get(providerKey).parseWebhook(payload);
  }
}

export const serverPaymentService = new ServerPaymentService();

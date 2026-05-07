import type { CreatePaymentRequest, PaymentResult, PaymentVerificationResult, RefundRequest, RefundResult, WebhookVerificationResult } from '../../../src/modules/payments/types.js';
import { ApiError } from '../../../src/shared/api/errors.js';
import { PaymentGatewayRegistry } from '../../../src/modules/payments/paymentGateway.js';
import { flutterwaveProvider } from '../../../src/modules/payments/providers/flutterwave.js';
import { paystackProvider } from '../../../src/modules/payments/providers/paystack.js';
import { paychanguProvider } from './paychangu.provider.js';
import { paymentRepository } from './payment.repository.js';
import dotenv from 'dotenv';
dotenv.config();

export interface ServerPaymentConfig {
  paychanguEnabled?: boolean;
  paychanguSecretKey?: string;
  paychanguWebhookSecret?: string;
  paychanguBaseUrl?: string;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function isTruthyFlag(value: string | undefined): boolean {
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function validatePayChanguConfig(config: ServerPaymentConfig): void {
  if (!config.paychanguEnabled || process.env.NODE_ENV !== 'production') {
    return;
  }

  const missing: string[] = [];
  if (!config.paychanguSecretKey) missing.push('PAYCHANGU_SECRET_KEY');
  if (!config.paychanguWebhookSecret) missing.push('PAYCHANGU_WEBHOOK_SECRET');

  if (missing.length > 0) {
    throw new Error(
      `Missing required PayChangu environment variables in production: ${missing.join(', ')}`,
    );
  }
}

export function createServerPaymentConfigFromEnv(): ServerPaymentConfig {
  const paychanguSecretKey = readEnv('PAYCHANGU_SECRET_KEY');
  const paychanguWebhookSecret = readEnv('PAYCHANGU_WEBHOOK_SECRET');
  const paychanguBaseUrl = readEnv('PAYCHANGU_BASE_URL');
  const paychanguEnabled = isTruthyFlag(readEnv('PAYCHANGU_ENABLED'))
    || Boolean(paychanguSecretKey)
    || Boolean(paychanguWebhookSecret)
    || Boolean(paychanguBaseUrl);

  return {
    paychanguEnabled,
    paychanguSecretKey,
    paychanguWebhookSecret,
    paychanguBaseUrl,
  };
}

export class ServerPaymentService {
  constructor(
    private readonly config: ServerPaymentConfig = {},
    private readonly registry = ServerPaymentService.createDefaultRegistry(),
  ) {
    validatePayChanguConfig(config);
  }


  private resolveConfig(): ServerPaymentConfig {
    return {
      paychanguSecretKey: this.config.paychanguSecretKey ?? process.env.PAYCHANGU_SECRET_KEY,
      paychanguWebhookSecret: this.config.paychanguWebhookSecret ?? process.env.PAYCHANGU_WEBHOOK_SECRET,
      paychanguBaseUrl: this.config.paychanguBaseUrl ?? process.env.PAYCHANGU_BASE_URL,
    };
  }

  static createDefaultRegistry(): PaymentGatewayRegistry {
    const registry = new PaymentGatewayRegistry();
    registry.register(paystackProvider);
    registry.register(flutterwaveProvider);
    registry.register(paychanguProvider);
    return registry;
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    const result = request.provider === 'paychangu'
      ? await paychanguProvider.createPayment(request, this.resolveConfig())
      : await this.registry.get(request.provider).createPayment(request);

    await paymentRepository.save({ ...result, verified: false });
    return result;
  }

  async verifyPaychanguPayment(txRef: string): Promise<PaymentVerificationResult> {
    const verification = await paychanguProvider.verifyPayment(txRef, this.resolveConfig());

    await paymentRepository.updateByReference(verification.reference ?? txRef, (current) => ({
      ...current,
      verified: verification.verified,
      verification,
    }));

    return verification;
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    const provider = this.registry.get(request.provider);

    if (!provider.capabilities.supportsRefunds) {
      throw new ApiError(`Refunds are not supported for provider: ${request.provider}`, {
        message: `Refunds are not supported for provider: ${request.provider}`,
        code: 'REFUNDS_UNSUPPORTED',
        status: 501,
      });
    }

    return provider.refund(request);
  }

  async verifyWebhook(providerKey: Parameters<PaymentGatewayRegistry['get']>[0], signature: string | undefined, payload: string | Record<string, unknown>): Promise<WebhookVerificationResult> {
    if (providerKey === 'paychangu') {
      return paychanguProvider.verifyWebhook(signature, payload, this.resolveConfig());
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

export const serverPaymentService = new ServerPaymentService({
  paychanguSecretKey: process.env.PAYCHANGU_SECRET_KEY,
  paychanguWebhookSecret: process.env.PAYCHANGU_WEBHOOK_SECRET,
  paychanguBaseUrl: process.env.PAYCHANGU_BASE_URL,
});

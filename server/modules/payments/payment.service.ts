import type { CreatePaymentRequest, PaymentResult, PaymentVerificationResult, RefundRequest, RefundResult, WebhookVerificationResult } from '../../../src/modules/payments/types.js';
import { ApiError } from '../../../src/shared/api/errors.js';
import { PaymentGatewayRegistry } from '../../../src/modules/payments/paymentGateway.js';
import { flutterwaveProvider } from '../../../src/modules/payments/providers/flutterwave.js';
import { paystackProvider } from '../../../src/modules/payments/providers/paystack.js';
import { paychanguProvider } from './paychangu.provider.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/order.repository.js';
import dotenv from 'dotenv';
dotenv.config();

export interface ServerPaymentConfig {
  paychanguEnabled?: boolean;
  paychanguSecretKey?: string;
  paychanguWebhookSecret?: string;
  paychanguBaseUrl?: string;
}

const REFUND_UNAVAILABLE_MESSAGE = 'Refunds are not available yet for this payment provider';

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

function normalizeCurrency(value: string | undefined): string {
  return String(value ?? '').trim().toUpperCase();
}

function moneyMatches(
  expected: { amount: number; currency: string },
  actual?: { amount: number; currency: string },
): boolean {
  if (!actual) return false;
  return expected.amount === actual.amount && normalizeCurrency(expected.currency) === normalizeCurrency(actual.currency);
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
    const payment = paymentRepository.findByReference(verification.reference ?? txRef);

    let strictVerified = verification.verified;
    let failureReason = verification.failureReason;

    if (!payment) {
      strictVerified = false;
      failureReason = failureReason ?? 'Stored payment record not found for this reference';
    } else {
      const order = orderRepository.findById(payment.orderId);
      if (!order) {
        strictVerified = false;
        failureReason = failureReason ?? 'Associated order not found';
      } else {
        const amountMatches = moneyMatches(order.total, verification.amount);
        if (!amountMatches) {
          strictVerified = false;
          failureReason = failureReason ?? `Payment amount or currency does not match order total for ${order.id}`;
        }
      }
    }

    const strictVerification: PaymentVerificationResult = {
      ...verification,
      verified: strictVerified,
      failureReason,
    };

    if (payment) {
      await paymentRepository.updateByReference(payment.reference, (current) => ({
        ...current,
        verified: strictVerification.verified,
        verification: strictVerification,
      }));
    }

    return strictVerification;
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    const provider = this.registry.get(request.provider);

    if (!provider.capabilities.supportsRefunds) {
      throw new ApiError(REFUND_UNAVAILABLE_MESSAGE, {
        message: REFUND_UNAVAILABLE_MESSAGE,
        code: 'REFUNDS_UNAVAILABLE',
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

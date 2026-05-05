import { useMemo } from 'react';
import { paymentService, PaymentService } from '../services/paymentService';
import type { CreatePaymentRequest, PaymentResult, RefundRequest, RefundResult, WebhookVerificationResult } from '../types';
import type { PaymentProviderKey } from '../../../shared/types/payment';

export interface UsePaymentGatewayResult {
  supportedProviders: PaymentProviderKey[];
  createPayment: (request: CreatePaymentRequest) => Promise<PaymentResult>;
  refund: (request: RefundRequest) => Promise<RefundResult>;
  verifyWebhook: (providerKey: PaymentProviderKey, signature: string | undefined, payload: unknown) => Promise<WebhookVerificationResult>;
  parseWebhook: (providerKey: PaymentProviderKey, payload: unknown) => Promise<WebhookVerificationResult>;
  getCapabilities: (providerKey: PaymentProviderKey) => ReturnType<PaymentService['getCapabilities']>;
}

export function usePaymentGateway(): UsePaymentGatewayResult {
  return useMemo(() => ({
    supportedProviders: paymentService.getSupportedProviders(),
    createPayment: (request) => paymentService.createPayment(request),
    refund: (request) => paymentService.refund(request),
    verifyWebhook: (providerKey, signature, payload) => paymentService.verifyWebhook(providerKey, signature, payload),
    parseWebhook: (providerKey, payload) => paymentService.parseWebhook(providerKey, payload),
    getCapabilities: (providerKey) => paymentService.getCapabilities(providerKey),
  }), []);
}

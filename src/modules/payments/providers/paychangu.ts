import { apiRequest } from '../../../shared/api/client.js';
import { ENDPOINTS } from '../../../shared/api/endpoints.js';
import type { CreatePaymentRequest, PaymentProviderCapabilities, PaymentResult, PaymentVerificationResult, RefundRequest, RefundResult, WebhookVerificationResult } from '../types.js';
import type { PaymentGatewayProvider } from '../paymentGateway.js';

const capabilities: PaymentProviderCapabilities = {
  supportsWebhookVerification: true,
  supportsRefunds: false,
  supportsPartialCapture: false,
  supportedMethods: ['card', 'bank_transfer', 'mobile_money'],
  currencies: ['MWK', 'USD', 'ZAR'],
};

export const paychanguProvider: PaymentGatewayProvider = {
  key: 'paychangu',
  capabilities,

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    return apiRequest<PaymentResult>(ENDPOINTS.payments.paychangu.create, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async verifyWebhook(signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> {
    return apiRequest<WebhookVerificationResult>(ENDPOINTS.payments.paychangu.webhook, {
      method: 'POST',
      headers: {
        ...(signature ? { Signature: signature } : {}),
      },
      body: JSON.stringify(payload),
    });
  },

  async refund(_request: RefundRequest): Promise<RefundResult> {
    throw new Error('PayChangu refund flow not implemented yet');
  },

  async parseWebhook(payload: unknown): Promise<WebhookVerificationResult> {
    return apiRequest<WebhookVerificationResult>(ENDPOINTS.payments.paychangu.webhook, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

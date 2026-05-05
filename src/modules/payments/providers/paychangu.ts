import type { CreatePaymentRequest, PaymentGatewayProvider, PaymentProviderCapabilities, PaymentResult, RefundRequest, RefundResult, WebhookVerificationResult } from '../types';

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

  async createPayment(_request: CreatePaymentRequest): Promise<PaymentResult> {
    throw new Error('PayChangu adapter not implemented yet');
  },

  async verifyWebhook(_signature: string | undefined, _payload: unknown): Promise<WebhookVerificationResult> {
    throw new Error('PayChangu webhook verification not implemented yet');
  },

  async refund(_request: RefundRequest): Promise<RefundResult> {
    throw new Error('PayChangu refund flow not implemented yet');
  },

  async parseWebhook(payload: unknown): Promise<WebhookVerificationResult> {
    return {
      valid: false,
      provider: 'paychangu',
      payload,
    };
  },
};

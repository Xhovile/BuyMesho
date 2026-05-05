import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { CreatePaymentRequest, PaymentResult, PaymentVerificationResult, RefundRequest, RefundResult, WebhookVerificationResult } from '../../../src/modules/payments/types';

export interface PayChanguConfig {
  paychanguSecretKey?: string;
  paychanguWebhookSecret?: string;
  paychanguBaseUrl?: string;
}

interface PayChanguPaymentInitResponse {
  status?: string;
  message?: string;
  data?: {
    checkout_url?: string;
    checkoutUrl?: string;
    tx_ref?: string;
    txRef?: string;
    reference?: string;
    id?: string;
    status?: string;
  };
}

function getBaseUrl(config: PayChanguConfig): string {
  return config.paychanguBaseUrl?.replace(/\/$/, '') ?? 'https://api.paychangu.com';
}

function normalizeTxRef(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function toISODate(): string {
  return new Date().toISOString();
}

function signatureMatches(secret: string | undefined, payload: string, signature: string | undefined): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
  } catch {
    return false;
  }
}

export const paychanguProvider = {
  key: 'paychangu' as const,
  capabilities: {
    supportsWebhookVerification: true,
    supportsRefunds: false,
    supportsPartialCapture: false,
    supportedMethods: ['card', 'bank_transfer', 'mobile_money'],
    currencies: ['MWK', 'USD', 'ZAR'],
  },

  async createPayment(request: CreatePaymentRequest, config: PayChanguConfig = {}): Promise<PaymentResult> {
    const baseUrl = getBaseUrl(config);
    const reference = `PAYCHANGU-${request.orderId}-${Date.now()}`;
    const txRef = normalizeTxRef(undefined, reference);

    const payload = {
      amount: request.amount.amount,
      currency: request.amount.currency,
      tx_ref: txRef,
      callback_url: request.returnUrl,
      return_url: request.returnUrl,
      cancel_url: request.cancelUrl,
      email: request.customer.email,
      first_name: request.customer.name,
      last_name: request.customer.name,
      mobile_number: request.customer.phoneNumber,
      customization: {
        title: 'BuyMesho Checkout',
        description: `Payment for order ${request.orderId}`,
      },
      metadata: request.metadata ?? {},
    };

    const response = await fetch(`${baseUrl}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.paychanguSecretKey ? { Authorization: `Bearer ${config.paychanguSecretKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as PayChanguPaymentInitResponse;
    if (!response.ok) {
      throw new Error(data.message ?? 'PayChangu payment initialization failed');
    }

    const checkoutUrl = data.data?.checkout_url ?? data.data?.checkoutUrl ?? null;
    const providerReference = data.data?.id ?? data.data?.reference ?? null;

    return {
      id: randomUUID(),
      orderId: request.orderId,
      provider: 'paychangu',
      method: request.method,
      status: 'pending',
      reference: data.data?.tx_ref ?? data.data?.txRef ?? txRef,
      providerReference,
      checkoutUrl,
      paidAt: null,
      rawResponse: data as Record<string, unknown>,
      createdAt: toISODate(),
      updatedAt: toISODate(),
    };
  },

  async verifyPayment(txRef: string, config: PayChanguConfig = {}): Promise<PaymentVerificationResult> {
    const baseUrl = getBaseUrl(config);
    const response = await fetch(`${baseUrl}/verify-payment/${encodeURIComponent(txRef)}`, {
      method: 'GET',
      headers: {
        ...(config.paychanguSecretKey ? { Authorization: `Bearer ${config.paychanguSecretKey}` } : {}),
      },
    });

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error((data.message as string | undefined) ?? 'PayChangu verification failed');
    }

    const payload = (data.data ?? data) as Record<string, unknown>;
    const amount = typeof payload.amount === 'number'
      ? { amount: payload.amount, currency: String(payload.currency ?? 'MWK') }
      : undefined;

    const paymentStatus = String(payload.status ?? '').toLowerCase();
    const isSuccessful = ['successful', 'success', 'completed'].includes(paymentStatus);

    return {
      verified: isSuccessful,
      provider: 'paychangu',
      txRef,
      reference: String(payload.tx_ref ?? payload.txRef ?? txRef),
      status: paymentStatus || 'unknown',
      currency: String(payload.currency ?? 'MWK'),
      amount,
      checkoutUrl: null,
      rawResponse: data,
    };
  },

  async verifyWebhook(signature: string | undefined, payload: string | Record<string, unknown>, config: PayChanguConfig = {}): Promise<WebhookVerificationResult> {
    const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return {
      valid: signatureMatches(config.paychanguWebhookSecret, rawPayload, signature),
      provider: 'paychangu',
      eventType: typeof payload === 'object' && payload !== null ? String((payload as Record<string, unknown>).event_type ?? (payload as Record<string, unknown>).event ?? '') : undefined,
      reference: typeof payload === 'object' && payload !== null ? String((payload as Record<string, unknown>).tx_ref ?? (payload as Record<string, unknown>).reference ?? '') : undefined,
      signature,
      payload,
    };
  },

  async refund(_request: RefundRequest): Promise<RefundResult> {
    throw new Error('PayChangu refund flow is not enabled yet');
  },

  async parseWebhook(payload: unknown): Promise<WebhookVerificationResult> {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return {
      valid: false,
      provider: 'paychangu',
      eventType: typeof payload === 'object' && payload !== null ? String((payload as Record<string, unknown>).event_type ?? (payload as Record<string, unknown>).event ?? '') : undefined,
      reference: typeof payload === 'object' && payload !== null ? String((payload as Record<string, unknown>).tx_ref ?? (payload as Record<string, unknown>).reference ?? '') : undefined,
      payload: body,
    };
  },
};

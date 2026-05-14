import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type {
  CreatePaymentRequest,
  PaymentResult,
  PaymentVerificationResult,
  RefundRequest,
  RefundResult,
  WebhookVerificationResult,
} from '../../../src/modules/payments/types.js';
import type { PaymentMethod } from '../../../src/shared/types/payment.js';

const ACCEPTED_PAYCHANGU_SIGNATURE_HEADERS = ['x-paychangu-signature', 'signature'] as const;

export const PAYCHANGU_SUCCESS_STATUSES = new Set([
  'success',
  'successful',
  'succeeded',
  'completed',
  'paid',
  'captured',
  'processed',
  'approved',
]);

export const PAYCHANGU_ACCEPTED_EVENT_TYPES = new Set([
  'payment.success',
  'payment.successful',
  'payment.completed',
  'charge.success',
  'charge.completed',
  'api.charge.payment',
  'transaction.success',
]);

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

type VerificationState = 'paid' | 'pending' | 'failed' | 'reversed' | 'unknown';

const PAYCHANGU_STATUS_MAP: Record<string, VerificationState> = {
  success: 'paid',
  successful: 'paid',
  succeeded: 'paid',
  paid: 'paid',
  captured: 'paid',
  completed: 'paid',
  processed: 'paid',
  approved: 'paid',
  pending: 'pending',
  processing: 'pending',
  initiated: 'pending',
  queued: 'pending',
  failed: 'failed',
  cancelled: 'failed',
  canceled: 'failed',
  declined: 'failed',
  expired: 'failed',
  reversed: 'reversed',
  refunded: 'reversed',
  chargeback: 'reversed',
};

function normalizeProviderStatus(rawStatus: unknown): {
  normalized: VerificationState;
  providerStatus: string;
} {
  const providerStatus = String(rawStatus ?? '').trim().toLowerCase();
  return {
    normalized: PAYCHANGU_STATUS_MAP[providerStatus] ?? 'unknown',
    providerStatus,
  };
}

export function normalizePaychanguStatus(rawStatus: unknown): VerificationState {
  return normalizeProviderStatus(rawStatus).normalized;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortDeep(item));
  }

  if (!isPlainRecord(value)) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = sortDeep(value[key]);
      return acc;
    }, {});
}

function stringifyStable(value: unknown): string {
  try {
    return JSON.stringify(sortDeep(value));
  } catch {
    return '';
  }
}

function parseWebhookPayload(
  payload: unknown,
): { rawPayload: string; parsedPayload: Record<string, unknown> | null } {
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as unknown;
      return {
        rawPayload: payload,
        parsedPayload: isPlainRecord(parsed) ? parsed : null,
      };
    } catch {
      return {
        rawPayload: payload,
        parsedPayload: null,
      };
    }
  }

  if (Buffer.isBuffer(payload)) {
    const rawPayload = payload.toString('utf8');
    try {
      const parsed = JSON.parse(rawPayload) as unknown;
      return {
        rawPayload,
        parsedPayload: isPlainRecord(parsed) ? parsed : null,
      };
    } catch {
      return {
        rawPayload,
        parsedPayload: null,
      };
    }
  }

  if (isPlainRecord(payload)) {
    return {
      rawPayload: stringifyStable(payload),
      parsedPayload: payload,
    };
  }

  return {
    rawPayload: stringifyStable(payload),
    parsedPayload: null,
  };
}

function signatureMatches(
  secret: string | undefined,
  payloads: string[],
  signature: string | undefined,
): boolean {
  if (!secret || !signature) return false;

  const normalizedSignature = signature.trim();
  const candidateSignatures = [
    normalizedSignature,
    normalizedSignature.replace(/^sha256=/i, ''),
  ];

  for (const payload of payloads) {
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    const expectedHex = Buffer.from(expected, 'hex');

    for (const candidate of candidateSignatures) {
      if (!candidate) continue;
      if (/^[a-fA-F0-9]+$/.test(candidate) && candidate.length % 2 === 0) {
        try {
          const candidateHex = Buffer.from(candidate.toLowerCase(), 'hex');
          if (
            candidateHex.length === expectedHex.length &&
            timingSafeEqual(expectedHex, candidateHex)
          ) {
            return true;
          }
        } catch {
          // continue with next candidate
        }
      }
    }
  }

  return false;
}

function buildWebhookPayloadCandidates(payload: unknown, parsedPayload: Record<string, unknown> | null): string[] {
  const candidates = new Set<string>();

  if (typeof payload === 'string') {
    candidates.add(payload);
  } else if (Buffer.isBuffer(payload)) {
    candidates.add(payload.toString('utf8'));
  }

  if (parsedPayload) {
    candidates.add(JSON.stringify(parsedPayload));
    candidates.add(stringifyStable(parsedPayload));
  }

  if (isPlainRecord(payload)) {
    candidates.add(JSON.stringify(payload));
    candidates.add(stringifyStable(payload));
  }

  return [...candidates].filter((candidate) => candidate.length > 0);
}

export const paychanguProvider = {
  key: 'paychangu' as const,

  capabilities: {
    supportsWebhookVerification: true,
    supportsRefunds: false,
    supportsPartialCapture: false,
    supportedMethods: ['card', 'bank_transfer', 'mobile_money'] as PaymentMethod[],
    currencies: ['MWK', 'USD', 'ZAR'],
  },

  async createPayment(
    request: CreatePaymentRequest,
    config: PayChanguConfig = {},
  ): Promise<PaymentResult> {
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
        ...(config.paychanguSecretKey
          ? { Authorization: `Bearer ${config.paychanguSecretKey}` }
          : {}),
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
      amount: request.amount,
      reference: data.data?.tx_ref ?? data.data?.txRef ?? txRef,
      providerReference,
      checkoutUrl,
      paidAt: null,
      rawResponse: data as Record<string, unknown>,
      createdAt: toISODate(),
      updatedAt: toISODate(),
    };
  },

  async verifyPayment(
    txRef: string,
    config: PayChanguConfig = {},
  ): Promise<PaymentVerificationResult> {
    const baseUrl = getBaseUrl(config);

    const response = await fetch(
      `${baseUrl}/verify-payment/${encodeURIComponent(txRef)}`,
      {
        method: 'GET',
        headers: {
          ...(config.paychanguSecretKey
            ? { Authorization: `Bearer ${config.paychanguSecretKey}` }
            : {}),
        },
      },
    );

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      throw new Error(
        (data.message as string | undefined) ?? 'PayChangu verification failed',
      );
    }

    const payload = (data.data ?? data) as Record<string, unknown>;

    const amountValue =
      typeof payload.amount === 'number'
        ? payload.amount
        : typeof payload.amount === 'string'
          ? Number(payload.amount)
          : NaN;

    const amount = Number.isFinite(amountValue)
      ? { amount: amountValue, currency: String(payload.currency ?? 'MWK') }
      : undefined;

    const providerStatus = String(payload.status ?? '').trim().toLowerCase();
    const verified = isPaychanguSuccessStatus(providerStatus) && !!amount && amount.amount > 0;

    return {
      verified,
      provider: 'paychangu',
      txRef,
      reference: String(payload.tx_ref ?? payload.txRef ?? txRef),
      status: providerStatus || 'unknown',
      currency: String(payload.currency ?? 'MWK'),
      amount,
      checkoutUrl: null,
      rawResponse: data,
    };
  },

  async verifyWebhook(
    signature: string | undefined,
    payload: string | Record<string, unknown>,
    config: PayChanguConfig = {},
  ): Promise<WebhookVerificationResult> {
    const { rawPayload, parsedPayload } = parseWebhookPayload(payload);
    const payloadCandidates = buildWebhookPayloadCandidates(payload, parsedPayload);

    return {
      valid:
        parsedPayload !== null &&
        signatureMatches(config.paychanguWebhookSecret, [rawPayload, ...payloadCandidates], signature),
      provider: 'paychangu',
      eventType: parsedPayload
        ? String(parsedPayload.event_type ?? parsedPayload.event ?? '')
        : undefined,
      reference: parsedPayload
        ? String(parsedPayload.tx_ref ?? parsedPayload.reference ?? '')
        : undefined,
      signature,
      payload: parsedPayload ?? payload,
    };
  },

  async refund(_request: RefundRequest): Promise<RefundResult> {
    throw new Error('PayChangu refund flow is not enabled yet');
  },

  async parseWebhook(
    payload: unknown,
  ): Promise<WebhookVerificationResult> {
    const { rawPayload, parsedPayload } = parseWebhookPayload(payload);

    return {
      valid: parsedPayload !== null,
      provider: 'paychangu',
      eventType: parsedPayload
        ? String(parsedPayload.event_type ?? parsedPayload.event ?? '')
        : undefined,
      reference: parsedPayload
        ? String(parsedPayload.tx_ref ?? parsedPayload.reference ?? '')
        : undefined,
      payload: parsedPayload ?? rawPayload,
    };
  },
};

export const paychanguWebhookSpec = {
  acceptedSignatureHeaders: ACCEPTED_PAYCHANGU_SIGNATURE_HEADERS,
  acceptedEventTypes: [...PAYCHANGU_ACCEPTED_EVENT_TYPES],
  successfulStatuses: [...PAYCHANGU_SUCCESS_STATUSES],
};

export function isAcceptedPaychanguEventType(eventType: string | undefined): boolean {
  if (!eventType) return false;
  return PAYCHANGU_ACCEPTED_EVENT_TYPES.has(eventType.trim().toLowerCase());
}

export function isPaychanguSuccessStatus(status: string | undefined): boolean {
  if (!status) return false;
  return PAYCHANGU_SUCCESS_STATUSES.has(status.trim().toLowerCase());
}

import { randomUUID } from 'crypto';
import { buildPayChanguPayoutChargeId } from '../payments/paychangu.flow.js';

export type PayChanguPayoutExecutionStatus =
  | 'queued'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'pending';

export interface ExecutePayChanguPayoutInput {
  payoutId: string;
  sellerId: string;
  amount: number;
  currency: string;
  providerName: string;
  destinationReference: string;
  attemptNo: number;
}

export interface PayChanguPayoutExecutionResult {
  payoutId: string;
  provider: 'paychangu';
  providerChargeId: string;
  providerReference: string;
  status: PayChanguPayoutExecutionStatus;
  amount: number;
  currency: string;
  attemptNo: number;
  rawResponse: Record<string, unknown>;
  processedAt: string;
}

export interface PayChanguPayoutBalanceResult {
  provider: 'paychangu';
  currency: string;
  availableBalance: number;
  checkedAt: string;
}

export interface PayChanguPayoutConfig {
  paychanguSecretKey?: string;
  paychanguBaseUrl?: string;
  paychanguPayoutCreatePath?: string;
  paychanguPayoutBalancePath?: string;
  paychanguTimeoutMs?: number;
}

interface ResolvedPayChanguPayoutConfig {
  paychanguSecretKey: string;
  paychanguBaseUrl: string;
  paychanguPayoutCreatePath: string;
  paychanguPayoutBalancePath: string;
  paychanguTimeoutMs: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildProviderReference(payoutId: string): string {
  return `PAYCHANGU-PAYOUT-${payoutId}-${randomUUID().slice(0, 8)}`;
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function trimPath(value: string): string {
  const cleaned = value.trim();
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

function resolveConfig(config: PayChanguPayoutConfig = {}): ResolvedPayChanguPayoutConfig {
  const baseUrl = trimSlash(
    config.paychanguBaseUrl ?? process.env.PAYCHANGU_PAYOUT_BASE_URL ?? process.env.PAYCHANGU_BASE_URL ?? '',
  );

  if (!baseUrl) {
    throw new Error('PayChangu payout base URL is not configured');
  }

  const createPath = trimPath(
    config.paychanguPayoutCreatePath ?? process.env.PAYCHANGU_PAYOUT_CREATE_PATH ?? '/payouts',
  );
  const balancePath = trimPath(
    config.paychanguPayoutBalancePath ?? process.env.PAYCHANGU_PAYOUT_BALANCE_PATH ?? '/payouts/balance',
  );

  const timeoutMs = Number(
    config.paychanguTimeoutMs ?? process.env.PAYCHANGU_PAYOUT_TIMEOUT_MS ?? 20000,
  );

  return {
    paychanguSecretKey:
      config.paychanguSecretKey ?? process.env.PAYCHANGU_SECRET_KEY ?? '',
    paychanguBaseUrl: baseUrl,
    paychanguPayoutCreatePath: createPath,
    paychanguPayoutBalancePath: balancePath,
    paychanguTimeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000,
  };
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | undefined>): string {
  const url = new URL(`${trimSlash(baseUrl)}${trimPath(path)}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function toPlainObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    return { message: value };
  }
  return { value };
}

async function readResponseBody(response: Response): Promise<{ payload: unknown; rawText: string }> {
  const rawText = await response.text();
  if (!rawText) {
    return { payload: null, rawText: '' };
  }

  try {
    return { payload: JSON.parse(rawText) as unknown, rawText };
  } catch {
    return { payload: rawText, rawText };
  }
}

function extractNestedValue(payload: unknown, keys: string[]): unknown {
  let current: unknown = payload;

  for (const key of keys) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    const record = current as Record<string, unknown>;
    current = record[key];
  }

  return current;
}

function extractNumber(payload: unknown, keys: string[]): number | null {
  const value = extractNestedValue(payload, keys);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractString(payload: unknown, keys: string[]): string | null {
  const value = extractNestedValue(payload, keys);
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function normalizeProviderStatus(rawStatus: unknown): PayChanguPayoutExecutionStatus {
  const status = String(rawStatus ?? '').trim().toLowerCase();
  if (['paid', 'success', 'successful', 'succeeded', 'completed', 'approved', 'captured'].includes(status)) {
    return 'paid';
  }
  if (['queued', 'pending', 'initiated'].includes(status)) {
    return 'pending';
  }
  if (['processing', 'processing_payment', 'in_progress'].includes(status)) {
    return 'processing';
  }
  if (['failed', 'declined', 'rejected', 'cancelled', 'canceled', 'expired', 'error'].includes(status)) {
    return 'failed';
  }
  return 'pending';
}

export async function executePayChanguPayout(
  input: ExecutePayChanguPayoutInput,
  config: PayChanguPayoutConfig = {},
): Promise<PayChanguPayoutExecutionResult> {
  const resolved = resolveConfig(config);
  const providerChargeId = buildPayChanguPayoutChargeId(input.payoutId, input.attemptNo);
  const providerReference = buildProviderReference(input.payoutId);
  const requestBody = {
    amount: input.amount,
    currency: input.currency,
    tx_ref: providerChargeId,
    reference: providerReference,
    payout_reference: input.payoutId,
    seller_id: input.sellerId,
    provider_name: input.providerName,
    destination_reference: input.destinationReference,
  };

  try {
    const response = await fetch(buildUrl(resolved.paychanguBaseUrl, resolved.paychanguPayoutCreatePath), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(resolved.paychanguSecretKey ? { Authorization: `Bearer ${resolved.paychanguSecretKey}` } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    const { payload, rawText } = await readResponseBody(response);
    const responseRecord = toPlainObject(payload);
    const responseStatus = extractString(payload, ['data', 'status']) ?? extractString(payload, ['status']) ?? null;
    const normalizedStatus = response.ok
      ? normalizeProviderStatus(responseStatus)
      : 'failed';

    return {
      payoutId: input.payoutId,
      provider: 'paychangu',
      providerChargeId,
      providerReference,
      status: normalizedStatus,
      amount: input.amount,
      currency: input.currency,
      attemptNo: input.attemptNo,
      processedAt: nowIso(),
      rawResponse: {
        httpStatus: response.status,
        ok: response.ok,
        request: requestBody,
        response: responseRecord,
        rawText,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PayChangu payout request failed';
    return {
      payoutId: input.payoutId,
      provider: 'paychangu',
      providerChargeId,
      providerReference,
      status: 'failed',
      amount: input.amount,
      currency: input.currency,
      attemptNo: input.attemptNo,
      processedAt: nowIso(),
      rawResponse: {
        error: message,
        request: requestBody,
      },
    };
  }
}

export async function getPayChanguPayoutBalance(
  currency = 'MWK',
  config: PayChanguPayoutConfig = {},
): Promise<PayChanguPayoutBalanceResult> {
  const resolved = resolveConfig(config);
  const response = await fetch(
    buildUrl(resolved.paychanguBaseUrl, resolved.paychanguPayoutBalancePath, { currency }),
    {
      method: 'GET',
      headers: {
        ...(resolved.paychanguSecretKey ? { Authorization: `Bearer ${resolved.paychanguSecretKey}` } : {}),
      },
    },
  );

  const { payload, rawText } = await readResponseBody(response);
  if (!response.ok) {
    const message = extractString(payload, ['message']) ?? extractString(payload, ['error']) ?? rawText ?? 'PayChangu balance lookup failed';
    throw new Error(message);
  }

  const availableBalance =
    extractNumber(payload, ['data', 'available_balance']) ??
    extractNumber(payload, ['data', 'balance']) ??
    extractNumber(payload, ['available_balance']) ??
    extractNumber(payload, ['balance']) ??
    0;

  const balanceCurrency =
    extractString(payload, ['data', 'currency']) ??
    extractString(payload, ['currency']) ??
    currency;

  return {
    provider: 'paychangu',
    currency: balanceCurrency,
    availableBalance,
    checkedAt: nowIso(),
  };
}
import { randomUUID } from 'crypto';
import { buildPayChanguPayoutChargeId } from '../payments/paychangu.flow.js';
import { paychanguProvider } from '../payments/paychangu.provider.js';

export type PayChanguPayoutExecutionStatus =
  | 'queued'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'pending';

export type PayChanguPayoutDestinationType = 'mobile_money' | 'bank';

export interface ExecutePayChanguPayoutInput {
  payoutId: string;
  sellerId: string;
  amount: number;
  currency: string;
  providerName: string;
  destinationReference: string;
  attemptNo: number;
  destinationType?: PayChanguPayoutDestinationType;
  bankUuid?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  mobile?: string;
  mobileMoneyOperatorRefId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
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
  rawResponse: Record<string, unknown>;
}

export interface PayChanguPayoutStatusResult {
  provider: 'paychangu';
  chargeId: string;
  reference: string | null;
  status: PayChanguPayoutExecutionStatus;
  amount: number | null;
  currency: string | null;
  rawResponse: Record<string, unknown>;
  checkedAt: string;
}

export interface PayChanguMobileMoneyOperatorRecord {
  refId: string;
  name: string;
  raw: Record<string, unknown>;
}

export interface PayChanguBankRecord {
  uuid: string;
  name: string;
  raw: Record<string, unknown>;
}

export interface PayChanguPayoutConfig {
  paychanguSecretKey?: string;
  paychanguWebhookSecret?: string;
  paychanguBaseUrl?: string;
  paychanguPayoutCreatePath?: string;
  paychanguPayoutStatusPath?: string;
  paychanguPayoutBalancePath?: string;
  paychanguMobileMoneyPath?: string;
  paychanguBanksPath?: string;
  paychanguMobileMoneyPayoutPath?: string;
  paychanguBankPayoutPath?: string;
  paychanguTimeoutMs?: number;
}

interface ResolvedPayChanguPayoutConfig {
  paychanguSecretKey: string;
  paychanguBaseUrl: string;
  paychanguPayoutCreatePath: string;
  paychanguPayoutStatusPath: string;
  paychanguPayoutBalancePath: string;
  paychanguMobileMoneyPath: string;
  paychanguBanksPath: string;
  paychanguMobileMoneyPayoutPath: string;
  paychanguBankPayoutPath: string;
  paychanguTimeoutMs: number;
}

function nowIso(): string {
  return new Date().toISOString();
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
    config.paychanguBaseUrl ?? process.env.PAYCHANGU_PAYOUT_BASE_URL ?? process.env.PAYCHANGU_BASE_URL ?? 'https://api.paychangu.com',
  );

  const timeoutMs = Number(
    config.paychanguTimeoutMs ?? process.env.PAYCHANGU_PAYOUT_TIMEOUT_MS ?? 20000,
  );

  return {
    paychanguSecretKey:
      config.paychanguSecretKey ?? process.env.PAYCHANGU_SECRET_KEY ?? '',
    paychanguBaseUrl: baseUrl,
    paychanguPayoutCreatePath: trimPath(
      config.paychanguPayoutCreatePath ?? process.env.PAYCHANGU_PAYOUT_CREATE_PATH ?? '/direct-charge/payouts/initialize',
    ),
    paychanguPayoutStatusPath: trimPath(
      config.paychanguPayoutStatusPath ?? process.env.PAYCHANGU_PAYOUT_STATUS_PATH ?? '/direct-charge/payouts/{charge_id}/details',
    ),
    paychanguPayoutBalancePath: trimPath(
      config.paychanguPayoutBalancePath ?? process.env.PAYCHANGU_PAYOUT_BALANCE_PATH ?? '/wallet-balance',
    ),
    paychanguMobileMoneyPath: trimPath(
      config.paychanguMobileMoneyPath ?? process.env.PAYCHANGU_MOBILE_MONEY_PATH ?? '/mobile-money',
    ),
    paychanguBanksPath: trimPath(
      config.paychanguBanksPath ?? process.env.PAYCHANGU_BANKS_PATH ?? '/direct-charge/payouts/supported-banks',
    ),
    paychanguMobileMoneyPayoutPath: trimPath(
      config.paychanguMobileMoneyPayoutPath ?? process.env.PAYCHANGU_MOBILE_MONEY_PAYOUT_PATH ?? '/mobile-money/payouts/initialize',
    ),
    paychanguBankPayoutPath: trimPath(
      config.paychanguBankPayoutPath ?? process.env.PAYCHANGU_BANK_PAYOUT_PATH ?? '/direct-charge/payouts/initialize',
    ),
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

function parsePayChanguList(payload: unknown, candidatePaths: string[][], fallbackKey: string): Record<string, unknown>[] {
  for (const path of candidatePaths) {
    const value = extractNestedValue(payload, path);
    if (Array.isArray(value)) {
      return value.filter((item) => typeof item === 'object' && item !== null && !Array.isArray(item)) as Record<string, unknown>[];
    }
  }

  const direct = extractNestedValue(payload, [fallbackKey]);
  if (Array.isArray(direct)) {
    return direct.filter((item) => typeof item === 'object' && item !== null && !Array.isArray(item)) as Record<string, unknown>[];
  }

  return [];
}

function normalizeMobileMoneyOperators(payload: unknown): PayChanguMobileMoneyOperatorRecord[] {
  const records = parsePayChanguList(payload, [['data'], ['data', 'operators'], ['data', 'results']], 'operators');
  return records.map((record) => {
    const refId = String(
      record.ref_id ?? record.refId ?? record.operator_ref_id ?? record.operatorRefId ?? record.id ?? '',
    ).trim();
    const name = String(record.name ?? record.operator_name ?? record.title ?? refId).trim();
    return {
      refId,
      name,
      raw: record,
    };
  }).filter((record) => record.refId.length > 0);
}

function normalizeBanks(payload: unknown): PayChanguBankRecord[] {
  const records = parsePayChanguList(payload, [['data'], ['data', 'banks'], ['data', 'results']], 'banks');
  return records.map((record) => {
    const uuid = String(record.uuid ?? record.bank_uuid ?? record.id ?? '').trim();
    const name = String(record.name ?? record.bank_name ?? record.title ?? uuid).trim();
    return {
      uuid,
      name,
      raw: record,
    };
  }).filter((record) => record.uuid.length > 0);
}

export function normalizePaychanguPayoutStatus(status: string | undefined): PayChanguPayoutExecutionStatus {
  return normalizeProviderStatus(status);
}

function buildPayoutReference(payoutId: string): string {
  return `PAYCHANGU-PAYOUT-${payoutId}-${randomUUID().slice(0, 8)}`;
}

async function postJson(
  url: string,
  body: Record<string, unknown>,
  secretKey: string,
): Promise<{ payload: unknown; rawText: string; ok: boolean; status: number }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secretKey ? { Authorization: `Bearer ${secretKey}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const { payload, rawText } = await readResponseBody(response);
  return { payload, rawText, ok: response.ok, status: response.status };
}

async function getJson(
  url: string,
  secretKey: string,
): Promise<{ payload: unknown; rawText: string; ok: boolean; status: number }> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(secretKey ? { Authorization: `Bearer ${secretKey}` } : {}),
    },
  });

  const { payload, rawText } = await readResponseBody(response);
  return { payload, rawText, ok: response.ok, status: response.status };
}

function buildLegacyPayoutBody(input: ExecutePayChanguPayoutInput, providerChargeId: string, providerReference: string): Record<string, unknown> {
  return {
    amount: input.amount,
    currency: input.currency,
    tx_ref: providerChargeId,
    reference: providerReference,
    payout_reference: input.payoutId,
    seller_id: input.sellerId,
    provider_name: input.providerName,
    destination_reference: input.destinationReference,
  };
}

function buildMobileMoneyBody(input: ExecutePayChanguPayoutInput, providerChargeId: string): Record<string, unknown> {
  return {
    mobile: input.mobile ?? input.destinationReference,
    mobile_money_operator_ref_id: input.mobileMoneyOperatorRefId ?? input.providerName,
    amount: String(input.amount),
    charge_id: providerChargeId,
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    transaction_status: 'successful',
  };
}

function buildBankBody(input: ExecutePayChanguPayoutInput, providerChargeId: string): Record<string, unknown> {
  return {
    payout_method: 'bank_transfer',
    bank_uuid: input.bankUuid ?? input.providerName,
    amount: String(input.amount),
    charge_id: providerChargeId,
    bank_account_name: input.bankAccountName ?? input.firstName ?? input.providerName,
    bank_account_number: input.bankAccountNumber ?? input.destinationReference,
  };
}

async function executeStructuredPayChanguPayout(
  input: ExecutePayChanguPayoutInput,
  resolved: ResolvedPayChanguPayoutConfig,
): Promise<PayChanguPayoutExecutionResult> {
  const providerChargeId = buildPayChanguPayoutChargeId(input.payoutId, input.attemptNo);
  const providerReference = buildPayoutReference(input.payoutId);
  const destinationType = input.destinationType ?? 'bank';

  if (destinationType === 'mobile_money') {
    const url = buildUrl(resolved.paychanguBaseUrl, resolved.paychanguMobileMoneyPayoutPath);
    const requestBody = buildMobileMoneyBody(input, providerChargeId);
    const { payload, rawText, ok, status } = await postJson(
      url,
      requestBody,
      resolved.paychanguSecretKey,
    );

    const responseRecord = toPlainObject(payload);
    const responseStatus = extractString(payload, ['data', 'transaction', 'status']) ?? extractString(payload, ['data', 'status']) ?? extractString(payload, ['status']) ?? null;

    return {
      payoutId: input.payoutId,
      provider: 'paychangu',
      providerChargeId,
      providerReference,
      status: ok ? normalizeProviderStatus(responseStatus) : 'failed',
      amount: input.amount,
      currency: input.currency,
      attemptNo: input.attemptNo,
      processedAt: nowIso(),
      rawResponse: {
        httpStatus: status,
        ok,
        request: requestBody,
        response: responseRecord,
        rawText,
      },
    };
  }

  const url = buildUrl(resolved.paychanguBaseUrl, resolved.paychanguBankPayoutPath);
  const requestBody = buildBankBody(input, providerChargeId);
  const { payload, rawText, ok, status } = await postJson(
    url,
    requestBody,
    resolved.paychanguSecretKey,
  );

  const responseRecord = toPlainObject(payload);
  const responseStatus = extractString(payload, ['data', 'transaction', 'status']) ?? extractString(payload, ['data', 'status']) ?? extractString(payload, ['status']) ?? null;

  return {
    payoutId: input.payoutId,
    provider: 'paychangu',
    providerChargeId,
    providerReference,
    status: ok ? normalizeProviderStatus(responseStatus) : 'failed',
    amount: input.amount,
    currency: input.currency,
    attemptNo: input.attemptNo,
    processedAt: nowIso(),
    rawResponse: {
      httpStatus: status,
      ok,
      request: requestBody,
      response: responseRecord,
      rawText,
    },
  };
}

async function executeCompatibilityPayChanguPayout(
  input: ExecutePayChanguPayoutInput,
  resolved: ResolvedPayChanguPayoutConfig,
): Promise<PayChanguPayoutExecutionResult> {
  const providerChargeId = buildPayChanguPayoutChargeId(input.payoutId, input.attemptNo);
  const providerReference = buildPayoutReference(input.payoutId);
  const requestBody = buildLegacyPayoutBody(input, providerChargeId, providerReference);

  try {
    const { payload, rawText, ok, status } = await postJson(
      buildUrl(resolved.paychanguBaseUrl, resolved.paychanguPayoutCreatePath),
      requestBody,
      resolved.paychanguSecretKey,
    );

    const responseRecord = toPlainObject(payload);
    const responseStatus = extractString(payload, ['data', 'status']) ?? extractString(payload, ['status']) ?? null;
    const normalizedStatus = ok ? normalizeProviderStatus(responseStatus) : 'failed';

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
        httpStatus: status,
        ok,
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

export async function executePayChanguPayout(
  input: ExecutePayChanguPayoutInput,
  config: PayChanguPayoutConfig = {},
): Promise<PayChanguPayoutExecutionResult> {
  const resolved = resolveConfig(config);

  if (input.destinationType === 'mobile_money' || input.destinationType === 'bank') {
    return executeStructuredPayChanguPayout(input, resolved);
  }

  return executeCompatibilityPayChanguPayout(input, resolved);
}

export async function listPayChanguMobileMoneyOperators(
  config: PayChanguPayoutConfig = {},
): Promise<PayChanguMobileMoneyOperatorRecord[]> {
  const resolved = resolveConfig(config);
  const { payload, ok, rawText, status } = await getJson(
    buildUrl(resolved.paychanguBaseUrl, resolved.paychanguMobileMoneyPath),
    resolved.paychanguSecretKey,
  );

  if (!ok) {
    const message = extractString(payload, ['message']) ?? extractString(payload, ['error']) ?? rawText || `PayChangu mobile money operator lookup failed (${status})`;
    throw new Error(message);
  }

  return normalizeMobileMoneyOperators(payload);
}

export async function listPayChanguPayoutBanks(
  currency = 'MWK',
  config: PayChanguPayoutConfig = {},
): Promise<PayChanguBankRecord[]> {
  const resolved = resolveConfig(config);
  const { payload, ok, rawText, status } = await getJson(
    buildUrl(resolved.paychanguBaseUrl, resolved.paychanguBanksPath, { currency }),
    resolved.paychanguSecretKey,
  );

  if (!ok) {
    const message = extractString(payload, ['message']) ?? extractString(payload, ['error']) ?? rawText || `PayChangu bank lookup failed (${status})`;
    throw new Error(message);
  }

  return normalizeBanks(payload);
}

export async function initializePayChanguMobileMoneyPayout(
  input: Omit<ExecutePayChanguPayoutInput, 'destinationType'> & {
    mobile: string;
    mobileMoneyOperatorRefId: string;
  },
  config: PayChanguPayoutConfig = {},
): Promise<PayChanguPayoutExecutionResult> {
  return executePayChanguPayout(
    {
      ...input,
      destinationType: 'mobile_money',
    },
    config,
  );
}

export async function initializePayChanguBankPayout(
  input: Omit<ExecutePayChanguPayoutInput, 'destinationType'> & {
    bankUuid: string;
    bankAccountName: string;
    bankAccountNumber: string;
  },
  config: PayChanguPayoutConfig = {},
): Promise<PayChanguPayoutExecutionResult> {
  return executePayChanguPayout(
    {
      ...input,
      destinationType: 'bank',
    },
    config,
  );
}

export async function getPayChanguPayoutStatus(
  chargeId: string,
  config: PayChanguPayoutConfig = {},
): Promise<PayChanguPayoutStatusResult> {
  const resolved = resolveConfig(config);
  const url = buildUrl(
    resolved.paychanguBaseUrl,
    resolved.paychanguPayoutStatusPath.replace('{charge_id}', encodeURIComponent(chargeId)),
  );
  const { payload, ok, rawText, status } = await getJson(url, resolved.paychanguSecretKey);

  if (!ok) {
    const message = extractString(payload, ['message']) ?? extractString(payload, ['error']) ?? rawText || `PayChangu payout status lookup failed (${status})`;
    throw new Error(message);
  }

  const responseRecord = toPlainObject(payload);
  const transaction = extractNestedValue(payload, ['data', 'transaction']) ?? extractNestedValue(payload, ['transaction']) ?? payload;
  const responseStatus = extractString(transaction, ['status']) ?? extractString(payload, ['status']) ?? null;
  const amountValue = extractNumber(transaction, ['amount']) ?? extractNumber(payload, ['amount']);
  const currencyValue = extractString(transaction, ['currency']) ?? extractString(payload, ['currency']);
  const reference = extractString(transaction, ['ref_id']) ?? extractString(transaction, ['reference']) ?? extractString(payload, ['reference']) ?? null;

  return {
    provider: 'paychangu',
    chargeId,
    reference,
    status: normalizeProviderStatus(responseStatus),
    amount: amountValue,
    currency: currencyValue,
    rawResponse: responseRecord,
    checkedAt: nowIso(),
  };
}

export async function verifyPayChanguPayoutWebhook(
  signature: string | undefined,
  payload: string | Record<string, unknown>,
  config: PayChanguPayoutConfig = {},
) {
  const resolved = resolveConfig(config);
  return paychanguProvider.verifyWebhook(signature, payload, {
    paychanguWebhookSecret: config.paychanguWebhookSecret ?? process.env.PAYCHANGU_WEBHOOK_SECRET ?? process.env.PAYCHANGU_PAYOUT_WEBHOOK_SECRET ?? '',
    paychanguSecretKey: resolved.paychanguSecretKey,
    paychanguBaseUrl: resolved.paychanguBaseUrl,
  });
}

export async function getPayChanguPayoutBalance(
  currency = 'MWK',
  config: PayChanguPayoutConfig = {},
): Promise<PayChanguPayoutBalanceResult> {
  const resolved = resolveConfig(config);
  const { payload, rawText, ok, status } = await getJson(
    buildUrl(resolved.paychanguBaseUrl, resolved.paychanguPayoutBalancePath, { currency }),
    resolved.paychanguSecretKey,
  );

  if (!ok) {
    const message = extractString(payload, ['message']) ?? extractString(payload, ['error']) ?? rawText || `PayChangu balance lookup failed (${status})`;
    throw new Error(message);
  }

  const availableBalance =
    extractNumber(payload, ['data', 'main_balance']) ??
    extractNumber(payload, ['data', 'available_balance']) ??
    extractNumber(payload, ['data', 'balance']) ??
    extractNumber(payload, ['main_balance']) ??
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
    rawResponse: toPlainObject(payload),
  };
}

export function isPaychanguSuccessStatus(status: string | undefined): boolean {
  return normalizePaychanguPayoutStatus(status) === 'paid';
}

export function buildPayChanguPayoutReference(payoutId: string): string {
  return `PAYCHANGU-PAYOUT-${payoutId}-${randomUUID().slice(0, 8)}`;
}

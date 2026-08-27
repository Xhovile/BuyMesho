import { randomUUID } from 'crypto';
import { buildPayChanguPayoutChargeId } from '../payments/paychangu.flow.js';
import { paychanguProvider } from '../payments/paychangu.provider.js';

export type PayChanguPayoutExecutionStatus = 'queued' | 'processing' | 'paid' | 'failed' | 'pending';
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
  transactionStatus?: 'failed' | 'successful';
}

export type PayChanguPayoutFailureClass =
  | 'provider_unavailable'
  | 'provider_timeout'
  | 'provider_rate_limited'
  | 'provider_rejected'
  | 'provider_authentication_error'
  | 'provider_configuration_error'
  | 'provider_conflict'
  | null;

export interface PayChanguPayoutExecutionResult {
  payoutId: string;
  provider: 'paychangu';
  providerChargeId: string;
  providerReference: string;
  providerTransactionId: string | null;
  status: PayChanguPayoutExecutionStatus;
  amount: number;
  currency: string;
  attemptNo: number;
  rawResponse: Record<string, unknown>;
  processedAt: string;
  failureClass: PayChanguPayoutFailureClass;
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
  transactionId: string | null;
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
  paychanguWebhookSecret: string;
  paychanguBaseUrl: string;
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
    config.paychanguBaseUrl ??
      process.env.PAYCHANGU_PAYOUT_BASE_URL ??
      process.env.PAYCHANGU_BASE_URL ??
      'https://api.paychangu.com',
  );

  const timeoutMs = Number(config.paychanguTimeoutMs ?? process.env.PAYCHANGU_PAYOUT_TIMEOUT_MS ?? 20000);

  return {
    paychanguSecretKey: config.paychanguSecretKey ?? process.env.PAYCHANGU_SECRET_KEY ?? '',
    paychanguWebhookSecret: config.paychanguWebhookSecret ?? process.env.PAYCHANGU_WEBHOOK_SECRET ?? '',
    paychanguBaseUrl: baseUrl,
    paychanguPayoutStatusPath: trimPath(
      config.paychanguPayoutStatusPath ?? process.env.PAYCHANGU_PAYOUT_STATUS_PATH ?? '/direct-charge/payouts',
    ),
    paychanguPayoutBalancePath: String(
      config.paychanguPayoutBalancePath ?? process.env.PAYCHANGU_PAYOUT_BALANCE_PATH ?? '/wallet-balance',
    ).trim(),
    paychanguMobileMoneyPath: trimPath(
      config.paychanguMobileMoneyPath ?? process.env.PAYCHANGU_MOBILE_MONEY_PATH ?? '/mobile-money',
    ),
    paychanguBanksPath: trimPath(
      config.paychanguBanksPath ?? process.env.PAYCHANGU_BANKS_PATH ?? '/direct-charge/payouts/supported-banks',
    ),
    paychanguMobileMoneyPayoutPath: trimPath(
      config.paychanguMobileMoneyPayoutPath ??
        process.env.PAYCHANGU_MOBILE_MONEY_PAYOUT_PATH ??
        process.env.PAYCHANGU_PAYOUT_MOBILE_MONEY_PATH ??
        '/mobile-money/payouts/initialize',
    ),
    paychanguBankPayoutPath: trimPath(
      config.paychanguBankPayoutPath ??
        process.env.PAYCHANGU_BANK_PAYOUT_PATH ??
        process.env.PAYCHANGU_PAYOUT_BANK_PATH ??
        '/direct-charge/payouts/initialize',
    ),
    paychanguTimeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000,
  };
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | undefined>): string {
  const url = new URL(`${trimSlash(baseUrl)}${trimPath(path)}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || String(value).trim() === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function toPlainObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') return { message: value };
  return { value };
}

async function readResponseBody(response: Response): Promise<{ payload: unknown; rawText: string }> {
  const rawText = await response.text();
  if (!rawText) return { payload: null, rawText: '' };
  try {
    return { payload: JSON.parse(rawText) as unknown, rawText };
  } catch {
    return { payload: rawText, rawText };
  }
}

function extractNestedValue(payload: unknown, keys: string[]): unknown {
  let current: unknown = payload;
  for (const key of keys) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function extractString(payload: unknown, keys: string[]): string | null {
  const value = extractNestedValue(payload, keys);
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
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

function extractProviderReference(payload: unknown): string | null {
  return (
    extractString(payload, ['data', 'transaction', 'reference']) ??
    extractString(payload, ['data', 'transaction', 'ref_id']) ??
    extractString(payload, ['data', 'reference']) ??
    extractString(payload, ['data', 'ref_id']) ??
    extractString(payload, ['reference']) ??
    extractString(payload, ['ref_id'])
  );
}

function extractProviderTransactionId(payload: unknown): string | null {
  return (
    extractString(payload, ['data', 'transaction', 'trans_id']) ??
    extractString(payload, ['data', 'transaction', 'transaction_id']) ??
    extractString(payload, ['data', 'transaction', 'transactionId']) ??
    extractString(payload, ['data', 'transaction', 'id']) ??
    extractString(payload, ['data', 'trans_id']) ??
    extractString(payload, ['data', 'transaction_id']) ??
    extractString(payload, ['data', 'transactionId']) ??
    extractString(payload, ['data', 'id']) ??
    extractString(payload, ['trans_id']) ??
    extractString(payload, ['transaction_id']) ??
    extractString(payload, ['transactionId']) ??
    extractString(payload, ['id'])
  );
}

function normalizeProviderStatus(rawStatus: unknown): PayChanguPayoutExecutionStatus {
  const status = String(rawStatus ?? '').trim().toLowerCase();
  if (['paid', 'success', 'successful', 'succeeded', 'completed', 'approved', 'captured'].includes(status)) return 'paid';
  if (['queued', 'pending', 'initiated'].includes(status)) return 'pending';
  if (['processing', 'processing_payment', 'in_progress'].includes(status)) return 'processing';
  if (['failed', 'declined', 'rejected', 'cancelled', 'canceled', 'expired', 'error'].includes(status)) return 'failed';
  return 'pending';
}

function classifyProviderError(error: unknown, httpStatus?: number): PayChanguPayoutFailureClass {
  if (httpStatus !== undefined) {
    if (httpStatus === 429) return 'provider_rate_limited';
    if (httpStatus >= 500 && httpStatus < 600) return 'provider_unavailable';
    if (httpStatus === 401 || httpStatus === 403) return 'provider_authentication_error';
    if (httpStatus === 404) return 'provider_configuration_error';
    if (httpStatus === 409) return 'provider_conflict';
    if (httpStatus === 400 || httpStatus === 422) return 'provider_rejected';
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('timeout') || message.includes('timed out') || message.includes('etimedout')) return 'provider_timeout';
    if (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('unavailable') ||
      message.includes('fetch failed')
    ) return 'provider_unavailable';
  }

  return 'provider_unavailable';
}

function hasFailedProviderPayload(payload: unknown): boolean {
  const status = extractString(payload, ['data', 'transaction', 'status']) ?? extractString(payload, ['data', 'status']) ?? extractString(payload, ['status']);
  return normalizeProviderStatus(status) === 'failed';
}

export function normalizePayChanguMobileNumber(value: unknown): string {
  const raw = String(value ?? '').trim();
  const digits = raw.replace(/\D+/g, '');

  if (digits.length === 9) return digits;
  if (digits.length === 10 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith('265')) return digits.slice(3);

  throw new Error('PayChangu mobile payout requires a valid Malawi mobile number with nine digits');
}

function buildMobileMoneyBody(input: ExecutePayChanguPayoutInput, providerChargeId: string): Record<string, unknown> {
  const rawMobile = input.mobile ?? input.destinationReference;
  const mobile = normalizePayChanguMobileNumber(rawMobile);

  return {
    mobile_money_operator_ref_id: input.mobileMoneyOperatorRefId,
    mobile,
    amount: String(input.amount),
    charge_id: providerChargeId,
    ...(input.email ? { email: input.email } : {}),
    ...(input.firstName ? { first_name: input.firstName } : {}),
    ...(input.lastName ? { last_name: input.lastName } : {}),
    ...(input.transactionStatus ? { transaction_status: input.transactionStatus } : {}),
  };
}

function buildBankBody(input: ExecutePayChanguPayoutInput, providerChargeId: string): Record<string, unknown> {
  return {
    payout_method: 'bank_transfer',
    bank_uuid: input.bankUuid,
    amount: String(input.amount),
    charge_id: providerChargeId,
    bank_account_name: input.bankAccountName ?? input.firstName ?? input.providerName,
    bank_account_number: input.bankAccountNumber ?? input.destinationReference,
  };
}

function buildPayChanguHeaders(secretKey: string): Record<string, string> {
  if (!secretKey.trim()) throw new Error('Missing required PayChangu secret key');
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secretKey.trim()}`,
  };
}

async function postJson(
  url: string,
  body: Record<string, unknown>,
  secretKey: string,
  timeoutMs: number,
): Promise<{ payload: unknown; rawText: string; ok: boolean; status: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildPayChanguHeaders(secretKey),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const { payload, rawText } = await readResponseBody(response);
    return { payload, rawText, ok: response.ok, status: response.status };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getJson(url: string, secretKey: string, timeoutMs: number): Promise<{ payload: unknown; rawText: string; ok: boolean; status: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildPayChanguHeaders(secretKey),
      signal: controller.signal,
    });
    const { payload, rawText } = await readResponseBody(response);
    return { payload, rawText, ok: response.ok, status: response.status };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function executeStructuredPayChanguPayout(
  input: ExecutePayChanguPayoutInput,
  resolved: ResolvedPayChanguPayoutConfig,
): Promise<PayChanguPayoutExecutionResult> {
  const providerChargeId = buildPayChanguPayoutChargeId(input.payoutId, input.attemptNo);
  const providerReference = `PAYCHANGU-PAYOUT-${input.payoutId}-${randomUUID().slice(0, 8)}`;
  const destinationType = input.destinationType ?? 'bank';
  const url = buildUrl(
    resolved.paychanguBaseUrl,
    destinationType === 'mobile_money' ? resolved.paychanguMobileMoneyPayoutPath : resolved.paychanguBankPayoutPath,
  );

  let requestBody: Record<string, unknown>;
  try {
    requestBody = destinationType === 'mobile_money'
      ? buildMobileMoneyBody(input, providerChargeId)
      : buildBankBody(input, providerChargeId);
  } catch (error) {
    return {
      payoutId: input.payoutId,
      provider: 'paychangu',
      providerChargeId,
      providerReference,
      providerTransactionId: null,
      status: 'failed',
      amount: input.amount,
      currency: input.currency,
      attemptNo: input.attemptNo,
      processedAt: nowIso(),
      failureClass: 'provider_rejected',
      rawResponse: {
        localValidationError: error instanceof Error ? error.message : String(error),
      },
    };
  }

  try {
    const { payload, rawText, ok, status } = await postJson(url, requestBody, resolved.paychanguSecretKey, resolved.paychanguTimeoutMs);
    const responseRecord = toPlainObject(payload);
    const responseStatus = extractString(payload, ['data', 'transaction', 'status']) ?? extractString(payload, ['data', 'status']) ?? extractString(payload, ['status']);
    const executionStatus = ok ? normalizeProviderStatus(responseStatus) : 'failed';
    const failureClass = !ok ? classifyProviderError(null, status) : hasFailedProviderPayload(payload) ? 'provider_rejected' : null;

    return {
      payoutId: input.payoutId,
      provider: 'paychangu',
      providerChargeId,
      providerReference: extractProviderReference(payload) ?? providerReference,
      providerTransactionId: extractProviderTransactionId(payload),
      status: executionStatus,
      amount: input.amount,
      currency: input.currency,
      attemptNo: input.attemptNo,
      processedAt: nowIso(),
      failureClass,
      rawResponse: {
        httpStatus: status,
        ok,
        response: responseRecord,
        rawText,
      },
    };
  } catch (error) {
    return {
      payoutId: input.payoutId,
      provider: 'paychangu',
      providerChargeId,
      providerReference,
      providerTransactionId: null,
      status: 'failed',
      amount: input.amount,
      currency: input.currency,
      attemptNo: input.attemptNo,
      processedAt: nowIso(),
      failureClass: classifyProviderError(error),
      rawResponse: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function executePayChanguPayout(
  input: ExecutePayChanguPayoutInput,
  config: PayChanguPayoutConfig = {},
): Promise<PayChanguPayoutExecutionResult> {
  const resolved = resolveConfig(config);
  if (!input.destinationType) throw new Error('PayChangu payout destinationType is required');
  if (input.destinationType !== 'mobile_money' && input.destinationType !== 'bank') {
    throw new Error(`Unsupported payout destination type: ${input.destinationType}`);
  }
  if (input.destinationType === 'mobile_money' && !input.mobileMoneyOperatorRefId) {
    throw new Error('PayChangu mobile money payout requires mobileMoneyOperatorRefId');
  }
  if (input.destinationType === 'bank' && !input.bankUuid) {
    throw new Error('PayChangu bank payout requires bankUuid');
  }
  return executeStructuredPayChanguPayout(input, resolved);
}

function extractList(payload: unknown): Record<string, unknown>[] {
  const candidates = [
    extractNestedValue(payload, ['data', 'data']),
    extractNestedValue(payload, ['data', 'transactions']),
    extractNestedValue(payload, ['data', 'results']),
    extractNestedValue(payload, ['data', 'items']),
    extractNestedValue(payload, ['transactions']),
    extractNestedValue(payload, ['results']),
    extractNestedValue(payload, ['items']),
    extractNestedValue(payload, ['data']),
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) {
      return value.filter((item) => typeof item === 'object' && item !== null && !Array.isArray(item)) as Record<string, unknown>[];
    }
  }
  return [];
}

function isSinglePayoutDetailsPath(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.includes('{charge_id}') || lower.includes('{chargeid}') || lower.includes('details');
}

export async function getPayChanguPayoutStatus(chargeId: string, config: PayChanguPayoutConfig = {}): Promise<PayChanguPayoutStatusResult> {
  const resolved = resolveConfig(config);
  if (isSinglePayoutDetailsPath(resolved.paychanguPayoutStatusPath)) {
    const url = buildUrl(resolved.paychanguBaseUrl, resolved.paychanguPayoutStatusPath.replace('{charge_id}', encodeURIComponent(chargeId)).replace('{chargeId}', encodeURIComponent(chargeId)));
    const { payload, rawText, ok, status } = await getJson(url, resolved.paychanguSecretKey, resolved.paychanguTimeoutMs);
    if (!ok) throw new Error(extractString(payload, ['message']) ?? extractString(payload, ['error']) ?? rawText ?? `PayChangu payout lookup failed (${status})`);
    const transaction = extractNestedValue(payload, ['data', 'transaction']) ?? extractNestedValue(payload, ['transaction']) ?? payload;
    return {
      provider: 'paychangu',
      chargeId,
      reference: extractString(transaction, ['ref_id']) ?? extractString(transaction, ['reference']),
      transactionId: extractProviderTransactionId(transaction),
      status: normalizeProviderStatus(extractString(transaction, ['status']) ?? extractString(payload, ['status'])),
      amount: extractNumber(transaction, ['amount']) ?? extractNumber(payload, ['amount']),
      currency: extractString(transaction, ['currency']) ?? extractString(payload, ['currency']),
      rawResponse: toPlainObject(payload),
      checkedAt: nowIso(),
    };
  }

  for (let page = 1; page <= 25; page += 1) {
    const { payload, rawText, ok, status } = await getJson(
      buildUrl(resolved.paychanguBaseUrl, resolved.paychanguPayoutStatusPath, { page: String(page), per_page: '100' }),
      resolved.paychanguSecretKey,
      resolved.paychanguTimeoutMs,
    );
    if (!ok) throw new Error(extractString(payload, ['message']) ?? extractString(payload, ['error']) ?? rawText ?? `PayChangu payout lookup failed (${status})`);
    const match = extractList(payload).find((item) => String(item.charge_id ?? item.chargeId ?? item.provider_charge_id ?? item.id ?? '').trim() === chargeId);
    if (match) {
      return {
        provider: 'paychangu',
        chargeId,
        reference: extractString(match, ['ref_id']) ?? extractString(match, ['reference']),
        transactionId: extractProviderTransactionId(match),
        status: normalizeProviderStatus(extractString(match, ['status'])),
        amount: extractNumber(match, ['amount']),
        currency: extractString(match, ['currency']),
        rawResponse: { page, response: toPlainObject(payload) },
        checkedAt: nowIso(),
      };
    }
    const totalPages = extractNumber(payload, ['data', 'total_pages']) ?? extractNumber(payload, ['total_pages']);
    const nextPageUrl = extractString(payload, ['data', 'next_page_url']) ?? extractString(payload, ['next_page_url']);
    if ((typeof totalPages === 'number' && page >= totalPages) || (!totalPages && (!nextPageUrl || extractList(payload).length < 100))) break;
  }
  throw new Error(`PayChangu payout ${chargeId} not found in payout listing`);
}

export async function listPayChanguMobileMoneyOperators(config: PayChanguPayoutConfig = {}): Promise<PayChanguMobileMoneyOperatorRecord[]> {
  const resolved = resolveConfig(config);
  const { payload, rawText, ok, status } = await getJson(buildUrl(resolved.paychanguBaseUrl, resolved.paychanguMobileMoneyPath), resolved.paychanguSecretKey, resolved.paychanguTimeoutMs);
  if (!ok) throw new Error(extractString(payload, ['message']) ?? extractString(payload, ['error']) ?? rawText ?? `PayChangu mobile money operator lookup failed (${status})`);
  return extractList(payload).map((record) => ({
    refId: String(record.ref_id ?? record.refId ?? record.operator_ref_id ?? record.operatorRefId ?? record.id ?? '').trim(),
    name: String(record.name ?? record.operator_name ?? record.title ?? record.ref_id ?? record.id ?? '').trim(),
    raw: record,
  })).filter((record) => record.refId.length > 0);
}

export async function listPayChanguPayoutBanks(currency = 'MWK', config: PayChanguPayoutConfig = {}): Promise<PayChanguBankRecord[]> {
  const resolved = resolveConfig(config);
  const { payload, rawText, ok, status } = await getJson(
    buildUrl(resolved.paychanguBaseUrl, resolved.paychanguBanksPath, { currency }),
    resolved.paychanguSecretKey,
    resolved.paychanguTimeoutMs,
  );
  if (!ok) throw new Error(extractString(payload, ['message']) ?? extractString(payload, ['error']) ?? rawText ?? `PayChangu payout bank lookup failed (${status})`);
  return extractList(payload).map((record) => ({
    uuid: String(record.uuid ?? record.bank_uuid ?? record.id ?? '').trim(),
    name: String(record.name ?? record.bank_name ?? record.title ?? record.uuid ?? record.id ?? '').trim(),
    raw: record,
  })).filter((record) => record.uuid.length > 0);
}

export async function initializePayChanguMobileMoneyPayout(
  input: Omit<ExecutePayChanguPayoutInput, 'destinationType'> & { mobile: string; mobileMoneyOperatorRefId: string },
  config: PayChanguPayoutConfig = {},
): Promise<PayChanguPayoutExecutionResult> {
  return executePayChanguPayout({ ...input, destinationType: 'mobile_money' }, config);
}

export async function initializePayChanguBankPayout(
  input: Omit<ExecutePayChanguPayoutInput, 'destinationType'> & { bankUuid: string; bankAccountName: string; bankAccountNumber: string },
  config: PayChanguPayoutConfig = {},
): Promise<PayChanguPayoutExecutionResult> {
  return executePayChanguPayout({ ...input, destinationType: 'bank' }, config);
}

export async function getPayChanguPayoutBalance(currency = 'MWK', config: PayChanguPayoutConfig = {}): Promise<PayChanguPayoutBalanceResult> {
  const resolved = resolveConfig(config);
  const { payload, rawText, ok, status } = await getJson(
    buildUrl(resolved.paychanguBaseUrl, resolved.paychanguPayoutBalancePath, { currency }),
    resolved.paychanguSecretKey,
    resolved.paychanguTimeoutMs,
  );
  if (!ok) throw new Error(extractString(payload, ['message']) ?? extractString(payload, ['error']) ?? rawText ?? `PayChangu balance lookup failed (${status})`);
  return {
    provider: 'paychangu',
    currency: extractString(payload, ['data', 'currency']) ?? extractString(payload, ['currency']) ?? currency,
    availableBalance:
      extractNumber(payload, ['data', 'main_balance']) ??
      extractNumber(payload, ['data', 'available_balance']) ??
      extractNumber(payload, ['data', 'balance']) ??
      extractNumber(payload, ['main_balance']) ??
      extractNumber(payload, ['available_balance']) ??
      extractNumber(payload, ['balance']) ??
      0,
    checkedAt: nowIso(),
    rawResponse: toPlainObject(payload),
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

export function isPaychanguSuccessStatus(status: string | undefined): boolean {
  return normalizeProviderStatus(status) === 'paid';
}

export function buildPayChanguPayoutReference(payoutId: string): string {
  return `PAYCHANGU-PAYOUT-${payoutId}-${randomUUID().slice(0, 8)}`;
}

export { buildPayChanguPayoutChargeId } from '../payments/paychangu.flow.js';
export function normalizePaychanguPayoutStatus(status: string | undefined): PayChanguPayoutExecutionStatus {
  return normalizeProviderStatus(status);
}

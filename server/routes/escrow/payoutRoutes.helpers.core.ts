import type express from 'express';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto';
import { type AdminOverrideAction, canApprovePayoutOverride, canEditPayoutSettings, canRequestPayoutRetry, canRequestWithdrawal, canViewPayoutHistory, canViewPayoutSettings, type PayoutPermissionActor } from '../../modules/payouts/payout.service.js';
import { getRequestUser } from './shared.js';

export const DEFAULT_CURRENCY = 'MWK';
const PAYOUT_ENCRYPTION_SECRET = process.env.SELLER_PAYOUT_ENCRYPTION_KEY ?? '';

export type DestinationType = 'mobile_money' | 'bank';
export type NormalizedMobileMoneyOperator = { refId: string; name: string };
export type NormalizedPayoutBank = { uuid: string; name: string };

export type SellerPayoutDestinationRow = {
  id: string;
  seller_uid: string;
  destination_type: DestinationType;
  provider_name: string;
  provider_ref_id: string | null;
  currency: string;
  account_name: string;
  account_number_encrypted: string | null;
  mobile_encrypted: string | null;
  masked_account: string;
  destination_fingerprint: string;
  is_default: number;
  verification_status: string;
  verification_attempts: number;
  last_error: string | null;
  verified_at: string | null;
  replaced_from_id: string | null;
  replaced_by_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type SellerPayoutDestinationRecord = {
  id: string;
  sellerId: string;
  destinationType: DestinationType;
  providerName: string;
  providerRefId: string | null;
  currency: string;
  accountName: string;
  maskedAccount: string;
  isDefault: boolean;
  verificationStatus: string;
  verificationAttempts: number;
  lastError: string | null;
  verifiedAt: string | null;
  replacedFromId: string | null;
  replacedById: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SellerPayoutPermissions = {
  viewPayoutSettings: boolean;
  editPayoutSettings: boolean;
  requestWithdrawal: boolean;
  viewPayoutHistory: boolean;
  requestPayoutRetry: boolean;
  approveOverride: boolean;
};

export function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

export function normalizeOverrideAction(value: unknown): AdminOverrideAction {
  const action = normalizeText(value)?.toLowerCase();
  if (action === 'hold' || action === 'mark_paid' || action === 'mark_failed' || action === 'cancel') return action;
  throw new Error('action must be one of: hold, mark_paid, mark_failed, cancel');
}

export function normalizeCurrency(value: unknown): string {
  const currency = normalizeText(value)?.toUpperCase() ?? DEFAULT_CURRENCY;
  if (currency !== DEFAULT_CURRENCY) throw new Error('Only MWK payout destinations are supported right now');
  return currency;
}

export function normalizeProviderCurrency(value: unknown): string {
  const currency = normalizeText(value)?.toUpperCase() ?? DEFAULT_CURRENCY;
  if (currency !== DEFAULT_CURRENCY) throw new Error('Only MWK payout provider lookups are supported right now');
  return currency;
}

export function normalizeDestinationType(value: unknown): DestinationType {
  const type = normalizeText(value)?.toLowerCase();
  if (type === 'mobile_money' || type === 'bank') return type;
  throw new Error('destinationType must be mobile_money or bank');
}

export function normalizeProviderName(value: unknown): string {
  const providerName = normalizeText(value);
  if (!providerName) throw new Error('providerName is required');
  return providerName;
}

export function normalizeAccountName(value: unknown): string {
  const accountName = normalizeText(value);
  if (!accountName) throw new Error('accountName is required');
  return accountName;
}

export function normalizeProviderRefId(value: unknown): string | null { return normalizeText(value); }

export function normalizeDestinationValue(value: unknown, fieldName: string): string {
  const normalized = normalizeText(value);
  if (!normalized) throw new Error(`${fieldName} is required`);
  return normalized;
}

export function normalizeDestinationId(value: unknown): string {
  const id = normalizeText(value);
  if (!id) throw new Error('Destination id is required');
  return id;
}

export function normalizeManualPayoutAmount(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || !Number.isInteger(numeric)) throw new Error('amount must be a positive integer');
  return numeric;
}

export function onlyDigits(value: string): string { return value.replace(/\D+/g, ''); }

export function maskValue(value: string): string {
  const clean = onlyDigits(value);
  if (!clean) return '****';
  if (clean.length <= 4) return `****${clean}`;
  return `****${clean.slice(-4)}`;
}

export function requirePayoutEncryptionSecret(): string {
  if (!PAYOUT_ENCRYPTION_SECRET) throw new Error('SELLER_PAYOUT_ENCRYPTION_KEY is not configured');
  return PAYOUT_ENCRYPTION_SECRET;
}

export function getDerivedEncryptionKey(): Buffer { return scryptSync(requirePayoutEncryptionSecret(), 'BuyMesho seller payout', 32); }

export function encryptSensitiveValue(value: string): string {
  const key = getDerivedEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSensitiveValue(value: string | null): string | null {
  if (!value) return null;
  const parts = value.split(':');
  if (parts.length !== 3) return value;
  try {
    const key = getDerivedEncryptionKey();
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return `${decipher.update(encrypted, undefined, 'utf8')}${decipher.final('utf8')}`;
  } catch {
    return null;
  }
}

export function normalizeAccountNumber(value: unknown): string { return onlyDigits(normalizeDestinationValue(value, 'accountNumber')); }

export function rowToSellerPayoutDestination(row: SellerPayoutDestinationRow): SellerPayoutDestinationRecord {
  return {
    id: row.id,
    sellerId: row.seller_uid,
    destinationType: row.destination_type,
    providerName: row.provider_name,
    providerRefId: row.provider_ref_id,
    currency: row.currency,
    accountName: row.account_name,
    maskedAccount: row.masked_account,
    isDefault: row.is_default === 1,
    verificationStatus: row.verification_status,
    verificationAttempts: row.verification_attempts,
    lastError: row.last_error,
    verifiedAt: row.verified_at,
    replacedFromId: row.replaced_from_id,
    replacedById: row.replaced_by_id,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getActor(req: express.Request): PayoutPermissionActor | null {
  const user = getRequestUser(req);
  return user ? { uid: user.uid, is_admin: user.is_admin } : null;
}

export function buildPermissions(sellerId: string, actor: PayoutPermissionActor | null): SellerPayoutPermissions {
  const context = { sellerId, actor };
  return {
    viewPayoutSettings: canViewPayoutSettings(context),
    editPayoutSettings: canEditPayoutSettings(context),
    requestWithdrawal: canRequestWithdrawal(context),
    viewPayoutHistory: canViewPayoutHistory(context),
    requestPayoutRetry: canRequestPayoutRetry(context),
    approveOverride: canApprovePayoutOverride(context),
  };
}

export function assertAllowed(req: express.Request, allowed: boolean, message: string): void {
  if (!allowed) {
    const user = getRequestUser(req);
    if (!user) throw new Error('Unauthorized');
    throw new Error(message);
  }
}

export function assertViewSettingsAccess(req: express.Request, sellerId: string): void {
  assertAllowed(req, canViewPayoutSettings({ actor: getActor(req), sellerId }), 'You are not allowed to view this payout setting');
}

export function assertProviderLookupAccess(req: express.Request): string {
  const sellerId = getRequestSellerId(req, req.query.sellerUid);
  assertViewSettingsAccess(req, sellerId);
  return sellerId;
}

export function normalizeMobileMoneyProviderRecords(records: Array<{ refId: string; name: string }>): NormalizedMobileMoneyOperator[] {
  return records.map((record) => ({ refId: record.refId, name: record.name }));
}

export function normalizeBankProviderRecords(records: Array<{ uuid: string; name: string }>): NormalizedPayoutBank[] {
  return records.map((record) => ({ uuid: record.uuid, name: record.name }));
}

export function assertEditSettingsAccess(req: express.Request, sellerId: string): void {
  assertAllowed(req, canEditPayoutSettings({ actor: getActor(req), sellerId }), 'You are not allowed to edit this payout setting');
}

export function assertWithdrawalAccess(req: express.Request, sellerId: string): void {
  assertAllowed(req, canRequestWithdrawal({ actor: getActor(req), sellerId }), 'You are not allowed to request withdrawal for this seller');
}

export function assertHistoryAccess(req: express.Request, sellerId: string): void {
  assertAllowed(req, canViewPayoutHistory({ actor: getActor(req), sellerId }), 'You are not allowed to view this payout history');
}

export function assertRetryAccess(req: express.Request, sellerId: string): void {
  assertAllowed(req, canRequestPayoutRetry({ actor: getActor(req), sellerId }), 'You are not allowed to trigger payout retry');
}

export function assertOverrideAccess(req: express.Request): void {
  const actor = getActor(req);
  assertAllowed(req, canApprovePayoutOverride({ actor, sellerId: actor?.uid ?? '' }), 'Admin approval required');
}

export function formatPayChanguMobile(value: unknown, targetEndpoint: 'momo' | 'bank_payout_momo' = 'momo'): string {
  const raw = normalizeDestinationValue(value, 'mobile');
  const digits = onlyDigits(raw);
  let local: string;
  if (digits.length === 10 && digits.startsWith('0')) local = digits;
  else if (digits.length === 12 && digits.startsWith('265')) local = `0${digits.slice(3)}`;
  else if (digits.length === 9) local = `0${digits}`;
  else throw new Error('mobile must be a valid Malawi number');
  if (local.length !== 10 || !local.startsWith('0')) throw new Error('mobile must be a valid Malawi number');
  return targetEndpoint === 'bank_payout_momo' ? `265${local.slice(1)}` : local;
}

export function normalizeMobileNumber(value: unknown): string { return formatPayChanguMobile(value, 'bank_payout_momo'); }

export function buildDestinationFingerprint(input: { sellerId: string; destinationType: DestinationType; providerName: string; providerRefId: string | null; currency: string; targetValue: string; }): string {
  return createHash('sha256').update([input.sellerId, input.destinationType, input.providerName.toLowerCase(), input.providerRefId?.toLowerCase() ?? '', input.currency.toUpperCase(), input.targetValue].join('|')).digest('hex');
}

export function getRequestSellerId(req: express.Request, sellerUid?: unknown): string {
  const user = getRequestUser(req);
  if (!user) throw new Error('Unauthorized');
  if (user.is_admin && typeof sellerUid === 'string' && sellerUid.trim()) return sellerUid.trim();
  return user.uid;
}

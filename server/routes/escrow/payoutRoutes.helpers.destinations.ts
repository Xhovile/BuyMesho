import { randomUUID } from 'crypto';
import { getPaymentDb } from '../../postgresCompat.js';
import { normalizePayChanguMobile } from '../../modules/payouts/payout.mobile-format.js';
import {
  type DestinationType,
  type SellerPayoutDestinationRecord,
  type SellerPayoutDestinationRow,
  buildDestinationFingerprint,
  decryptSensitiveValue,
  encryptSensitiveValue,
  maskValue,
  normalizeAccountNumber,
  rowToSellerPayoutDestination,
} from './payoutRoutes.helpers.core.js';

function isUniqueFingerprintViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { code?: unknown; constraint?: unknown; message?: unknown };
  return (
    record.code === '23505' &&
    (record.constraint === 'idx_seller_payout_accounts_destination_fingerprint' ||
      String(record.message ?? '').includes('idx_seller_payout_accounts_destination_fingerprint'))
  );
}

function findDestinationById(destinationId: string): SellerPayoutDestinationRow | undefined {
  const db = getPaymentDb();
  return db.prepare('SELECT * FROM seller_payout_accounts WHERE id = ? LIMIT 1').get(destinationId) as SellerPayoutDestinationRow | undefined;
}

export function findDestinationDuplicate(sellerId: string, fingerprint: string, excludeId?: string): SellerPayoutDestinationRow | undefined {
  const db = getPaymentDb();
  const query = excludeId
    ? `SELECT * FROM seller_payout_accounts WHERE seller_uid = ? AND destination_fingerprint = ? AND id <> ? LIMIT 1`
    : `SELECT * FROM seller_payout_accounts WHERE seller_uid = ? AND destination_fingerprint = ? LIMIT 1`;
  return (excludeId ? db.prepare(query).get(sellerId, fingerprint, excludeId) : db.prepare(query).get(sellerId, fingerprint)) as SellerPayoutDestinationRow | undefined;
}

function buildDestinationDuplicateMessage(existing: SellerPayoutDestinationRow | undefined): string {
  if (!existing) return 'That payout destination already exists for this seller';
  const status = existing.verification_status?.toLowerCase() ?? 'pending';
  if (existing.is_active === 1 && status === 'verified') return 'That payout destination already exists and is already verified';
  return 'That payout destination already exists for this seller';
}

function normalizeDuplicateFingerprintRow(
  existing: SellerPayoutDestinationRow,
  input: {
    destinationType: DestinationType;
    providerName: string;
    providerRefId: string | null;
    currency: string;
    accountName: string;
    accountNumber?: string | null;
    mobile?: string | null;
    isDefault: boolean;
    sourceId?: string | null;
  },
): SellerPayoutDestinationRecord {
  const db = getPaymentDb();
  const now = new Date().toISOString();
  const isDefault = input.isDefault || existing.is_default === 1;
  const targetValue = input.destinationType === 'bank'
    ? normalizeAccountNumber(input.accountNumber ?? decryptSensitiveValue(existing.account_number_encrypted) ?? '')
    : normalizePayChanguMobile(input.mobile ?? decryptSensitiveValue(existing.mobile_encrypted) ?? '');
  const fingerprint = buildDestinationFingerprint({ sellerId: existing.seller_uid, destinationType: input.destinationType, providerName: input.providerName, providerRefId: input.providerRefId, currency: input.currency, targetValue });
  const accountNumberEncrypted = input.destinationType === 'bank' ? encryptSensitiveValue(normalizeAccountNumber(input.accountNumber ?? decryptSensitiveValue(existing.account_number_encrypted) ?? '')) : null;
  const mobileEncrypted = input.destinationType === 'mobile_money' ? encryptSensitiveValue(normalizePayChanguMobile(input.mobile ?? decryptSensitiveValue(existing.mobile_encrypted) ?? '')) : null;
  const maskedAccount = input.destinationType === 'bank' ? maskValue(normalizeAccountNumber(input.accountNumber ?? decryptSensitiveValue(existing.account_number_encrypted) ?? '')) : maskValue(normalizePayChanguMobile(input.mobile ?? decryptSensitiveValue(existing.mobile_encrypted) ?? ''));

  db.transaction(() => {
    if (isDefault) db.prepare('UPDATE seller_payout_accounts SET is_default = 0, updated_at = ? WHERE seller_uid = ? AND id <> ?').run(now, existing.seller_uid, existing.id);
    db.prepare(`UPDATE seller_payout_accounts SET destination_type = ?, provider_name = ?, provider_ref_id = ?, currency = ?, account_name = ?, account_number_encrypted = ?, mobile_encrypted = ?, masked_account = ?, destination_fingerprint = ?, is_default = ?, verification_status = 'pending', verification_attempts = 0, last_error = NULL, verified_at = NULL, replaced_from_id = ?, replaced_by_id = NULL, is_active = 1, updated_at = ? WHERE id = ?`).run(input.destinationType, input.providerName, input.providerRefId, input.currency, input.accountName, accountNumberEncrypted, mobileEncrypted, maskedAccount, fingerprint, isDefault ? 1 : 0, input.sourceId ?? existing.replaced_from_id ?? null, now, existing.id);
  })();

  const updated = findDestinationById(existing.id);
  if (!updated) throw new Error('Failed to revive payout destination');
  return rowToSellerPayoutDestination(updated);
}

export function addDestinationEvent(input: { sellerId: string; accountId: string; eventType: string; actorType: 'seller' | 'admin' | 'system'; actorId?: string | null; note?: string | null; payload?: Record<string, unknown> | null; }): void {
  const db = getPaymentDb();
  db.prepare(`INSERT INTO seller_payout_account_events (seller_uid, account_id, event_type, actor_type, actor_id, note, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(input.sellerId, input.accountId, input.eventType, input.actorType, input.actorId ?? null, input.note ?? null, input.payload ? JSON.stringify(input.payload) : null, new Date().toISOString());
}

export function createDestinationRecord(input: { sellerId: string; destinationType: DestinationType; providerName: string; providerRefId: string | null; currency: string; accountName: string; accountNumber?: string | null; mobile?: string | null; isDefault: boolean; sourceId?: string | null; }): SellerPayoutDestinationRecord {
  const db = getPaymentDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const targetValue = input.destinationType === 'bank' ? normalizeAccountNumber(input.accountNumber ?? '') : normalizePayChanguMobile(input.mobile ?? '');
  const fingerprint = buildDestinationFingerprint({ sellerId: input.sellerId, destinationType: input.destinationType, providerName: input.providerName, providerRefId: input.providerRefId, currency: input.currency, targetValue });
  const duplicate = findDestinationDuplicate(input.sellerId, fingerprint);
  if (duplicate) return normalizeDuplicateFingerprintRow(duplicate, input);
  const accountNumberEncrypted = input.destinationType === 'bank' ? encryptSensitiveValue(normalizeAccountNumber(input.accountNumber ?? '')) : null;
  const mobileEncrypted = input.destinationType === 'mobile_money' ? encryptSensitiveValue(normalizePayChanguMobile(input.mobile ?? '')) : null;
  const maskedAccount = input.destinationType === 'bank' ? maskValue(normalizeAccountNumber(input.accountNumber ?? '')) : maskValue(normalizePayChanguMobile(input.mobile ?? ''));

  try {
    db.transaction(() => {
      if (input.isDefault) db.prepare(`UPDATE seller_payout_accounts SET is_default = 0, updated_at = ? WHERE seller_uid = ?`).run(now, input.sellerId);
      db.prepare(`INSERT INTO seller_payout_accounts (id, seller_uid, destination_type, provider_name, provider_ref_id, currency, account_name, account_number_encrypted, mobile_encrypted, masked_account, destination_fingerprint, is_default, verification_status, verification_attempts, last_error, verified_at, replaced_from_id, replaced_by_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, NULL, ?, NULL, 1, ?, ?)`).run(id, input.sellerId, input.destinationType, input.providerName, input.providerRefId, input.currency, input.accountName, accountNumberEncrypted, mobileEncrypted, maskedAccount, fingerprint, input.isDefault ? 1 : 0, input.sourceId ?? null, now, now);
    })();
  } catch (error) {
    if (isUniqueFingerprintViolation(error)) {
      const existing = findDestinationDuplicate(input.sellerId, fingerprint);
      if (existing) return normalizeDuplicateFingerprintRow(existing, input);
      throw new Error(buildDestinationDuplicateMessage(existing));
    }
    throw error;
  }

  const created = findDestinationById(id);
  if (!created) throw new Error('Failed to create payout destination');
  return rowToSellerPayoutDestination(created);
}

export function updateDestinationRecord(existing: SellerPayoutDestinationRow, updates: { destinationType?: DestinationType; providerName?: string; providerRefId?: string | null; currency?: string; accountName?: string; accountNumber?: string | null; mobile?: string | null; isDefault?: boolean; }): SellerPayoutDestinationRecord {
  const db = getPaymentDb();
  const now = new Date().toISOString();
  const destinationType = updates.destinationType ?? existing.destination_type;
  const providerName = updates.providerName ?? existing.provider_name;
  const providerRefId = updates.providerRefId ?? existing.provider_ref_id;
  const currency = updates.currency ?? existing.currency;
  const accountName = updates.accountName ?? existing.account_name;
  const accountNumber = destinationType === 'bank' ? (updates.accountNumber ?? decryptSensitiveValue(existing.account_number_encrypted) ?? '') : null;
  const mobile = destinationType === 'mobile_money' ? (updates.mobile ?? decryptSensitiveValue(existing.mobile_encrypted) ?? '') : null;
  const targetValue = destinationType === 'bank' ? normalizeAccountNumber(accountNumber) : normalizePayChanguMobile(mobile);
  const fingerprint = buildDestinationFingerprint({ sellerId: existing.seller_uid, destinationType, providerName, providerRefId, currency, targetValue });
  const duplicate = findDestinationDuplicate(existing.seller_uid, fingerprint, existing.id);
  if (duplicate) return rowToSellerPayoutDestination(duplicate);
  const accountNumberEncrypted = destinationType === 'bank' ? encryptSensitiveValue(normalizeAccountNumber(accountNumber)) : null;
  const mobileEncrypted = destinationType === 'mobile_money' ? encryptSensitiveValue(normalizePayChanguMobile(mobile)) : null;
  const maskedAccount = destinationType === 'bank' ? maskValue(normalizeAccountNumber(accountNumber)) : maskValue(normalizePayChanguMobile(mobile));
  const isDefault = updates.isDefault ?? existing.is_default === 1;
  const shouldResetVerification = fingerprint !== existing.destination_fingerprint;

  try {
    db.transaction(() => {
      if (isDefault) db.prepare('UPDATE seller_payout_accounts SET is_default = 0, updated_at = ? WHERE seller_uid = ? AND id <> ?').run(now, existing.seller_uid, existing.id);
      db.prepare(`UPDATE seller_payout_accounts SET destination_type = ?, provider_name = ?, provider_ref_id = ?, currency = ?, account_name = ?, account_number_encrypted = ?, mobile_encrypted = ?, masked_account = ?, destination_fingerprint = ?, is_default = ?, verification_status = ?, verification_attempts = ?, last_error = ?, verified_at = ?, updated_at = ? WHERE id = ?`).run(destinationType, providerName, providerRefId, currency, accountName, accountNumberEncrypted, mobileEncrypted, maskedAccount, fingerprint, isDefault ? 1 : 0, shouldResetVerification ? 'pending' : existing.verification_status, shouldResetVerification ? 0 : existing.verification_attempts, shouldResetVerification ? null : existing.last_error, shouldResetVerification ? null : existing.verified_at, now, existing.id);
    })();
  } catch (error) {
    if (isUniqueFingerprintViolation(error)) {
      const duplicate = findDestinationDuplicate(existing.seller_uid, fingerprint, existing.id);
      if (duplicate) return rowToSellerPayoutDestination(duplicate);
      throw new Error(buildDestinationDuplicateMessage(duplicate));
    }
    throw error;
  }

  const updated = findDestinationById(existing.id);
  if (!updated) throw new Error('Failed to update payout destination');
  return rowToSellerPayoutDestination(updated);
}

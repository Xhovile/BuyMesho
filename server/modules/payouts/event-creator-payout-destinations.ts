import { randomUUID, createHash } from 'crypto';
import { getPaymentDb } from '../../postgresCompat.js';
import { normalizePayChanguMobile } from './payout.mobile-format.js';
import {
  DEFAULT_CURRENCY,
  encryptSensitiveValue,
  maskDestinationDisplay,
  normalizeAccountNumber,
  normalizeAccountName,
  normalizeCurrency,
  normalizeDestinationType,
  normalizeProviderName,
  normalizeProviderRefId,
  decryptSensitiveValue,
  type DestinationType,
} from '../../routes/escrow/payoutRoutes.helpers.core.js';

export type EventCreatorPayoutDestinationRow = {
  id: string;
  event_creator_uid: string;
  owner_type: 'event_creator';
  owner_uid: string;
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

export type EventCreatorPayoutDestination = {
  id: string;
  eventCreatorUid: string;
  destinationType: DestinationType;
  providerName: string;
  providerRefId: string | null;
  currency: string;
  accountName: string;
  accountDisplay: string;
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

function fingerprint(input: {
  ownerUid: string;
  destinationType: DestinationType;
  providerName: string;
  providerRefId: string | null;
  currency: string;
  targetValue: string;
}): string {
  return createHash('sha256')
    .update([
      input.ownerUid,
      input.destinationType,
      input.providerName.toLowerCase(),
      input.providerRefId?.toLowerCase() ?? '',
      input.currency.toUpperCase(),
      input.targetValue,
    ].join('|'))
    .digest('hex');
}

function rowToDestination(row: EventCreatorPayoutDestinationRow): EventCreatorPayoutDestination {
  const sensitive = row.destination_type === 'bank'
    ? decryptSensitiveValue(row.account_number_encrypted)
    : decryptSensitiveValue(row.mobile_encrypted);

  return {
    id: row.id,
    eventCreatorUid: row.event_creator_uid,
    destinationType: row.destination_type,
    providerName: row.provider_name,
    providerRefId: row.provider_ref_id,
    currency: row.currency,
    accountName: row.account_name,
    accountDisplay: sensitive ? maskDestinationDisplay(sensitive) : row.masked_account,
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

export function listEventCreatorPayoutDestinations(eventCreatorUid: string): EventCreatorPayoutDestination[] {
  const db = getPaymentDb();
  const rows = db.prepare(
    `SELECT * FROM seller_payout_accounts
     WHERE owner_type = 'event_creator' AND event_creator_uid = ?
     ORDER BY is_default DESC, created_at DESC`,
  ).all(eventCreatorUid) as EventCreatorPayoutDestinationRow[];
  return rows.map(rowToDestination);
}

export function findEventCreatorPayoutDestination(
  eventCreatorUid: string,
  destinationId: string,
): EventCreatorPayoutDestinationRow | undefined {
  const db = getPaymentDb();
  return db.prepare(
    `SELECT * FROM seller_payout_accounts
     WHERE id = ? AND owner_type = 'event_creator' AND event_creator_uid = ?
     LIMIT 1`,
  ).get(destinationId, eventCreatorUid) as EventCreatorPayoutDestinationRow | undefined;
}

export function assertUsableEventCreatorPayoutDestination(
  eventCreatorUid: string,
  destinationId: string,
): EventCreatorPayoutDestinationRow {
  const row = findEventCreatorPayoutDestination(eventCreatorUid, destinationId);
  if (!row) throw new Error('Payout destination not found for this event creator');
  if (row.is_active !== 1) throw new Error('Selected payout destination is inactive');
  if (row.verification_status.toLowerCase() !== 'verified') throw new Error('Selected payout destination is not verified');
  return row;
}

export function createEventCreatorPayoutDestination(input: {
  eventCreatorUid: string;
  destinationType: unknown;
  providerName: unknown;
  providerRefId?: unknown;
  currency?: unknown;
  accountName: unknown;
  accountNumber?: unknown;
  mobile?: unknown;
  isDefault?: boolean;
}): EventCreatorPayoutDestination {
  const destinationType = normalizeDestinationType(input.destinationType);
  const providerName = normalizeProviderName(input.providerName);
  const providerRefId = normalizeProviderRefId(input.providerRefId);
  const currency = normalizeCurrency(input.currency ?? DEFAULT_CURRENCY);
  const accountName = normalizeAccountName(input.accountName);
  const targetValue = destinationType === 'bank'
    ? normalizeAccountNumber(input.accountNumber)
    : normalizePayChanguMobile(input.mobile);
  const id = randomUUID();
  const now = new Date().toISOString();
  const destinationFingerprint = fingerprint({
    ownerUid: input.eventCreatorUid,
    destinationType,
    providerName,
    providerRefId,
    currency,
    targetValue,
  });
  const db = getPaymentDb();

  const duplicate = db.prepare(
    `SELECT * FROM seller_payout_accounts
     WHERE owner_type = 'event_creator' AND event_creator_uid = ? AND destination_fingerprint = ?
     LIMIT 1`,
  ).get(input.eventCreatorUid, destinationFingerprint) as EventCreatorPayoutDestinationRow | undefined;

  if (duplicate) return rowToDestination(duplicate);

  const accountNumberEncrypted = destinationType === 'bank' ? encryptSensitiveValue(targetValue) : null;
  const mobileEncrypted = destinationType === 'mobile_money' ? encryptSensitiveValue(targetValue) : null;
  const maskedAccount = maskDestinationDisplay(targetValue);
  const isDefault = input.isDefault === true;

  try {
    db.transaction(() => {
      if (isDefault) {
        db.prepare(
          `UPDATE seller_payout_accounts
           SET is_default = 0, updated_at = ?
           WHERE owner_type = 'event_creator' AND event_creator_uid = ?`,
        ).run(now, input.eventCreatorUid);
      }

      db.prepare(
        `INSERT INTO seller_payout_accounts (
          id, seller_uid, event_creator_uid, owner_type, owner_uid,
          destination_type, provider_name, provider_ref_id, currency, account_name,
          account_number_encrypted, mobile_encrypted, masked_account, destination_fingerprint,
          is_default, verification_status, verification_attempts, last_error, verified_at,
          replaced_from_id, replaced_by_id, is_active, created_at, updated_at
        ) VALUES (?, NULL, ?, 'event_creator', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', 0, NULL, ?, NULL, NULL, 1, ?, ?)`
      ).run(
        id,
        input.eventCreatorUid,
        input.eventCreatorUid,
        destinationType,
        providerName,
        providerRefId,
        currency,
        accountName,
        accountNumberEncrypted,
        mobileEncrypted,
        maskedAccount,
        destinationFingerprint,
        isDefault ? 1 : 0,
        now,
        now,
      );

      db.prepare(
        `INSERT INTO seller_payout_account_events
         (seller_uid, event_creator_uid, owner_type, owner_uid, account_id, event_type, actor_type, actor_id, note, payload, created_at)
         VALUES (NULL, ?, 'event_creator', ?, ?, 'destination_added', 'event_creator', ?, NULL, ?, ?)`
      ).run(
        input.eventCreatorUid,
        input.eventCreatorUid,
        id,
        input.eventCreatorUid,
        JSON.stringify({ destinationType, providerName }),
        now,
      );
    })();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('idx_seller_payout_accounts_destination_fingerprint') || message.includes('23505')) {
      const existing = db.prepare(
        `SELECT * FROM seller_payout_accounts
         WHERE owner_type = 'event_creator' AND event_creator_uid = ? AND destination_fingerprint = ?
         LIMIT 1`,
      ).get(input.eventCreatorUid, destinationFingerprint) as EventCreatorPayoutDestinationRow | undefined;
      if (existing) return rowToDestination(existing);
    }
    throw error;
  }

  const created = db.prepare('SELECT * FROM seller_payout_accounts WHERE id = ? LIMIT 1').get(id) as EventCreatorPayoutDestinationRow | undefined;
  if (!created) throw new Error('Failed to create payout destination');
  return rowToDestination(created);
}

import express, { type RequestHandler } from 'express';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, scryptSync } from 'crypto';
import { getPaymentDb } from '../../sqlite.js';
import {
  listPayChanguMobileMoneyOperators,
  listPayChanguPayoutBanks,
} from '../../modules/payouts/paychangu.payout.js';
import { escrowRepository } from '../../modules/escrow/escrow.repository.js';
import {
  type AdminOverrideAction,
  canApprovePayoutOverride,
  canEditPayoutSettings,
  canRequestPayoutRetry,
  canRequestWithdrawal,
  canViewPayoutHistory,
  canViewPayoutSettings,
  payoutService,
  type PayoutPermissionActor,
} from '../../modules/payouts/payout.service.js';
import { PAYOUT_POLICY, isRetryableFailureCode } from '../../modules/payouts/payout.policy.js';
import { getRequestUser, jsonError, payoutLimiter } from './shared.js';

const DEFAULT_CURRENCY = 'MWK';
const PAYOUT_ENCRYPTION_SECRET = process.env.SELLER_PAYOUT_ENCRYPTION_KEY ?? '';

type DestinationType = 'mobile_money' | 'bank';

type SellerPayoutDestinationRow = {
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

type SellerPayoutDestinationRecord = {
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

type SellerPayoutPermissions = {
  viewPayoutSettings: boolean;
  editPayoutSettings: boolean;
  requestWithdrawal: boolean;
  viewPayoutHistory: boolean;
  requestPayoutRetry: boolean;
  approveOverride: boolean;
};

type NormalizedMobileMoneyOperator = {
  refId: string;
  name: string;
};

type NormalizedPayoutBank = {
  uuid: string;
  name: string;
};

function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeOverrideAction(value: unknown): AdminOverrideAction {
  const action = normalizeText(value)?.toLowerCase();
  if (action === 'hold' || action === 'mark_paid' || action === 'mark_failed' || action === 'cancel') {
    return action;
  }
  throw new Error('action must be one of: hold, mark_paid, mark_failed, cancel');
}

function normalizeCurrency(value: unknown): string {
  const currency = normalizeText(value)?.toUpperCase() ?? DEFAULT_CURRENCY;
  if (currency !== DEFAULT_CURRENCY) {
    throw new Error('Only MWK payout destinations are supported right now');
  }
  return currency;
}

function normalizeProviderCurrency(value: unknown): string {
  const currency = normalizeText(value)?.toUpperCase() ?? DEFAULT_CURRENCY;
  if (currency !== DEFAULT_CURRENCY) {
    throw new Error('Only MWK payout provider lookups are supported right now');
  }
  return currency;
}

function normalizeDestinationType(value: unknown): DestinationType {
  const type = normalizeText(value)?.toLowerCase();
  if (type === 'mobile_money' || type === 'bank') return type;
  throw new Error('destinationType must be mobile_money or bank');
}

function normalizeProviderName(value: unknown): string {
  const providerName = normalizeText(value);
  if (!providerName) {
    throw new Error('providerName is required');
  }
  return providerName;
}

function normalizeAccountName(value: unknown): string {
  const accountName = normalizeText(value);
  if (!accountName) {
    throw new Error('accountName is required');
  }
  return accountName;
}

function normalizeProviderRefId(value: unknown): string | null {
  return normalizeText(value);
}

function normalizeDestinationValue(value: unknown, fieldName: string): string {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

function normalizeDestinationId(value: unknown): string {
  const id = normalizeText(value);
  if (!id) {
    throw new Error('Destination id is required');
  }
  return id;
}

function normalizeManualPayoutAmount(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || !Number.isInteger(numeric)) {
    throw new Error('amount must be a positive integer');
  }
  return numeric;
}

function onlyDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

function maskValue(value: string): string {
  const clean = onlyDigits(value);
  if (!clean) return '****';
  if (clean.length <= 4) return `****${clean}`;
  return `****${clean.slice(-4)}`;
}

function requirePayoutEncryptionSecret(): string {
  if (!PAYOUT_ENCRYPTION_SECRET) {
    throw new Error('SELLER_PAYOUT_ENCRYPTION_KEY is not configured');
  }
  return PAYOUT_ENCRYPTION_SECRET;
}

function getDerivedEncryptionKey(): Buffer {
  const secret = requirePayoutEncryptionSecret();
  return scryptSync(secret, 'BuyMesho seller payout', 32);
}

function encryptSensitiveValue(value: string): string {
  const key = getDerivedEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSensitiveValue(value: string | null): string | null {
  if (!value) return null;
  const parts = value.split(':');
  if (parts.length !== 3) {
    return value;
  }

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

function normalizeAccountNumber(value: unknown): string {
  return onlyDigits(normalizeDestinationValue(value, 'accountNumber'));
}

function normalizeMobileNumber(value: unknown): string {
  return onlyDigits(normalizeDestinationValue(value, 'mobile'));
}

function buildDestinationFingerprint(input: {
  sellerId: string;
  destinationType: DestinationType;
  providerName: string;
  providerRefId: string | null;
  currency: string;
  targetValue: string;
}): string {
  return createHash('sha256')
    .update(
      [
        input.sellerId,
        input.destinationType,
        input.providerName.toLowerCase(),
        input.providerRefId?.toLowerCase() ?? '',
        input.currency.toUpperCase(),
        input.targetValue,
      ].join('|'),
    )
    .digest('hex');
}

function rowToSellerPayoutDestination(row: SellerPayoutDestinationRow): SellerPayoutDestinationRecord {
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

function getActor(req: express.Request): PayoutPermissionActor | null {
  const user = getRequestUser(req);
  return user ? { uid: user.uid, is_admin: user.is_admin } : null;
}

function buildPermissions(sellerId: string, actor: PayoutPermissionActor | null): SellerPayoutPermissions {
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

function assertAllowed(req: express.Request, allowed: boolean, message: string): void {
  if (!allowed) {
    const user = getRequestUser(req);
    if (!user) {
      throw new Error('Unauthorized');
    }
    throw new Error(message);
  }
}

function assertViewSettingsAccess(req: express.Request, sellerId: string): void {
  assertAllowed(req, canViewPayoutSettings({ actor: getActor(req), sellerId }), 'You are not allowed to view this payout setting');
}

function assertProviderLookupAccess(req: express.Request): string {
  const sellerId = getRequestSellerId(req, req.query.sellerUid);
  assertViewSettingsAccess(req, sellerId);
  return sellerId;
}

function normalizeMobileMoneyProviderRecords(records: Array<{ refId: string; name: string }>): NormalizedMobileMoneyOperator[] {
  return records.map((record) => ({
    refId: record.refId,
    name: record.name,
  }));
}

function normalizeBankProviderRecords(records: Array<{ uuid: string; name: string }>): NormalizedPayoutBank[] {
  return records.map((record) => ({
    uuid: record.uuid,
    name: record.name,
  }));
}

function assertEditSettingsAccess(req: express.Request, sellerId: string): void {
  assertAllowed(req, canEditPayoutSettings({ actor: getActor(req), sellerId }), 'You are not allowed to edit this payout setting');
}

function assertWithdrawalAccess(req: express.Request, sellerId: string): void {
  assertAllowed(req, canRequestWithdrawal({ actor: getActor(req), sellerId }), 'You are not allowed to request withdrawal for this seller');
}

function assertHistoryAccess(req: express.Request, sellerId: string): void {
  assertAllowed(req, canViewPayoutHistory({ actor: getActor(req), sellerId }), 'You are not allowed to view this payout history');
}

function assertRetryAccess(req: express.Request, sellerId: string): void {
  assertAllowed(req, canRequestPayoutRetry({ actor: getActor(req), sellerId }), 'You are not allowed to trigger payout retry');
}

function assertOverrideAccess(req: express.Request): void {
  const actor = getActor(req);
  assertAllowed(req, canApprovePayoutOverride({ actor, sellerId: actor?.uid ?? '' }), 'Admin approval required');
}

function findDestinationById(destinationId: string): SellerPayoutDestinationRow | undefined {
  const db = getPaymentDb();
  return db
    .prepare(
      `SELECT * FROM seller_payout_accounts WHERE id = ? LIMIT 1`,
    )
    .get(destinationId) as SellerPayoutDestinationRow | undefined;
}

function findDestinationDuplicate(sellerId: string, fingerprint: string, excludeId?: string): SellerPayoutDestinationRow | undefined {
  const db = getPaymentDb();
  const query = excludeId
    ? `SELECT * FROM seller_payout_accounts
       WHERE seller_uid = ?
         AND destination_fingerprint = ?
         AND id <> ?
         AND is_active = 1
       LIMIT 1`
    : `SELECT * FROM seller_payout_accounts
       WHERE seller_uid = ?
         AND destination_fingerprint = ?
         AND is_active = 1
       LIMIT 1`;

  return (excludeId
    ? db.prepare(query).get(sellerId, fingerprint, excludeId)
    : db.prepare(query).get(sellerId, fingerprint)) as SellerPayoutDestinationRow | undefined;
}

function listSellerDestinations(sellerId: string): SellerPayoutDestinationRecord[] {
  const db = getPaymentDb();
  const rows = db
    .prepare(
      `SELECT * FROM seller_payout_accounts
       WHERE seller_uid = ?
       ORDER BY is_default DESC, created_at DESC`,
    )
    .all(sellerId) as SellerPayoutDestinationRow[];
  return rows.map(rowToSellerPayoutDestination);
}

function listSellerPayoutOperationalView(sellerId: string) {
  const db = getPaymentDb();
  const rows = db.prepare(
    `SELECT
       p.id,
       p.seller_id,
       p.order_id,
       p.escrow_id,
       p.release_entry_id,
       p.amount,
       p.currency,
       p.gross_amount,
       p.platform_fee_amount,
       p.reserve_amount,
       p.manual_adjustment_amount,
       p.net_amount,
       p.status,
       p.provider,
       p.provider_charge_id,
       p.provider_status,
       p.failure_reason,
       p.manual_review_reason,
       p.requested_by,
       p.requested_at,
       p.created_at,
       p.updated_at,
       spa.verification_status AS destination_verification_status,
       spa.is_active AS destination_is_active,
       (
         SELECT COALESCE(MAX(attempt_no), 0)
         FROM payout_attempts pa
         WHERE pa.payout_id = p.id
       ) AS retry_count
     FROM payouts p
     LEFT JOIN seller_payout_accounts spa ON spa.id = p.destination_account_id
     WHERE p.seller_id = ?
     ORDER BY p.created_at DESC`,
  ).all(sellerId) as Array<Record<string, unknown>>;

  return rows.map((row) => {
    const status = String(row.status ?? 'pending').toLowerCase();
    const destinationStatus = String(row.destination_verification_status ?? 'missing').toLowerCase();
    const failureReason = (row.failure_reason as string | null) ?? null;
    const manualReviewReason = (row.manual_review_reason as string | null) ?? null;
    const retryCount = Number(row.retry_count ?? 0);
    const verificationBlockers: string[] = [];

    if (destinationStatus === 'missing') {
      verificationBlockers.push('Update destination to continue');
    } else if (destinationStatus === 'failed') {
      verificationBlockers.push('Destination verification failed');
    } else if (destinationStatus === 'disabled' || Number(row.destination_is_active ?? 0) !== 1) {
      verificationBlockers.push('Destination is disabled');
    } else if (destinationStatus !== 'verified') {
      verificationBlockers.push('Destination pending verification');
    }

    const retryAllowed =
      status === 'failed' &&
      retryCount < PAYOUT_POLICY.maxRetryCount &&
      isRetryableFailureCode(failureReason);

    return {
      id: row.id,
      sellerId: row.seller_id,
      orderId: row.order_id,
      escrowId: row.escrow_id,
      releaseEntryId: row.release_entry_id,
      amount: row.amount,
      currency: row.currency,
      grossAmount: row.gross_amount,
      platformFeeAmount: row.platform_fee_amount,
      reserveAmount: row.reserve_amount,
      manualAdjustmentAmount: row.manual_adjustment_amount,
      netAmount: row.net_amount,
      status,
      provider: row.provider,
      providerChargeId: row.provider_charge_id,
      providerStatus: row.provider_status,
      requestedBy: row.requested_by,
      requestedAt: row.requested_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      destinationStatus,
      holdReason: status === 'held' ? manualReviewReason : null,
      lastFailureReason: failureReason,
      retryAllowed,
      retryCount,
      manualReviewPending: status === 'held' || !!manualReviewReason,
      verificationBlockers,
      lastUpdatedTimestamp: row.updated_at,
    };
  });
}

function addDestinationEvent(input: {
  sellerId: string;
  accountId: string;
  eventType: string;
  actorType: 'seller' | 'admin' | 'system';
  actorId?: string | null;
  note?: string | null;
  payload?: Record<string, unknown> | null;
}): void {
  const db = getPaymentDb();
  db.prepare(
    `INSERT INTO seller_payout_account_events (
      seller_uid,
      account_id,
      event_type,
      actor_type,
      actor_id,
      note,
      payload,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.sellerId,
    input.accountId,
    input.eventType,
    input.actorType,
    input.actorId ?? null,
    input.note ?? null,
    input.payload ? JSON.stringify(input.payload) : null,
    new Date().toISOString(),
  );
}

function createDestinationRecord(input: {
  sellerId: string;
  destinationType: DestinationType;
  providerName: string;
  providerRefId: string | null;
  currency: string;
  accountName: string;
  accountNumber?: string | null;
  mobile?: string | null;
  isDefault: boolean;
  sourceId?: string | null;
}): SellerPayoutDestinationRecord {
  const db = getPaymentDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const targetValue = input.destinationType === 'bank'
    ? normalizeAccountNumber(input.accountNumber ?? '')
    : normalizeMobileNumber(input.mobile ?? '');
  const fingerprint = buildDestinationFingerprint({
    sellerId: input.sellerId,
    destinationType: input.destinationType,
    providerName: input.providerName,
    providerRefId: input.providerRefId,
    currency: input.currency,
    targetValue,
  });

  const duplicate = findDestinationDuplicate(input.sellerId, fingerprint);
  if (duplicate) {
    throw new Error('That payout destination already exists for this seller');
  }

  const accountNumberEncrypted = input.destinationType === 'bank'
    ? encryptSensitiveValue(normalizeAccountNumber(input.accountNumber ?? ''))
    : null;
  const mobileEncrypted = input.destinationType === 'mobile_money'
    ? encryptSensitiveValue(normalizeMobileNumber(input.mobile ?? ''))
    : null;
  const maskedAccount = input.destinationType === 'bank'
    ? maskValue(normalizeAccountNumber(input.accountNumber ?? ''))
    : maskValue(normalizeMobileNumber(input.mobile ?? ''));

  db.transaction(() => {
    if (input.isDefault) {
      db.prepare(
        `UPDATE seller_payout_accounts
         SET is_default = 0, updated_at = ?
         WHERE seller_uid = ?`,
      ).run(now, input.sellerId);
    }

    db.prepare(
      `INSERT INTO seller_payout_accounts (
        id,
        seller_uid,
        destination_type,
        provider_name,
        provider_ref_id,
        currency,
        account_name,
        account_number_encrypted,
        mobile_encrypted,
        masked_account,
        destination_fingerprint,
        is_default,
        verification_status,
        verification_attempts,
        last_error,
        verified_at,
        replaced_from_id,
        replaced_by_id,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, NULL, ?, NULL, 1, ?, ?)`,
    ).run(
      id,
      input.sellerId,
      input.destinationType,
      input.providerName,
      input.providerRefId,
      input.currency,
      input.accountName,
      accountNumberEncrypted,
      mobileEncrypted,
      maskedAccount,
      fingerprint,
      input.isDefault ? 1 : 0,
      input.sourceId ?? null,
      now,
      now,
    );
  })();

  const created = findDestinationById(id);
  if (!created) {
    throw new Error('Failed to create payout destination');
  }
  return rowToSellerPayoutDestination(created);
}

function updateDestinationRecord(
  existing: SellerPayoutDestinationRow,
  updates: {
    destinationType?: DestinationType;
    providerName?: string;
    providerRefId?: string | null;
    currency?: string;
    accountName?: string;
    accountNumber?: string | null;
    mobile?: string | null;
    isDefault?: boolean;
  },
): SellerPayoutDestinationRecord {
  const db = getPaymentDb();
  const now = new Date().toISOString();

  const destinationType = updates.destinationType ?? existing.destination_type;
  const providerName = updates.providerName ?? existing.provider_name;
  const providerRefId = updates.providerRefId ?? existing.provider_ref_id;
  const currency = updates.currency ?? existing.currency;
  const accountName = updates.accountName ?? existing.account_name;
  const accountNumber = destinationType === 'bank'
    ? (updates.accountNumber ?? decryptSensitiveValue(existing.account_number_encrypted) ?? '')
    : null;
  const mobile = destinationType === 'mobile_money'
    ? (updates.mobile ?? decryptSensitiveValue(existing.mobile_encrypted) ?? '')
    : null;
  const targetValue = destinationType === 'bank'
    ? normalizeAccountNumber(accountNumber)
    : normalizeMobileNumber(mobile);
  const fingerprint = buildDestinationFingerprint({
    sellerId: existing.seller_uid,
    destinationType,
    providerName,
    providerRefId,
    currency,
    targetValue,
  });

  const duplicate = findDestinationDuplicate(existing.seller_uid, fingerprint, existing.id);
  if (duplicate) {
    throw new Error('That payout destination already exists for this seller');
  }

  const accountNumberEncrypted = destinationType === 'bank'
    ? encryptSensitiveValue(normalizeAccountNumber(accountNumber))
    : null;
  const mobileEncrypted = destinationType === 'mobile_money'
    ? encryptSensitiveValue(normalizeMobileNumber(mobile))
    : null;
  const maskedAccount = destinationType === 'bank'
    ? maskValue(normalizeAccountNumber(accountNumber))
    : maskValue(normalizeMobileNumber(mobile));

  const isDefault = updates.isDefault ?? existing.is_default === 1;

  db.transaction(() => {
    if (isDefault) {
      db.prepare(
        `UPDATE seller_payout_accounts
         SET is_default = 0, updated_at = ?
         WHERE seller_uid = ? AND id <> ?`,
      ).run(now, existing.seller_uid, existing.id);
    }

    db.prepare(
      `UPDATE seller_payout_accounts
       SET destination_type = ?,
           provider_name = ?,
           provider_ref_id = ?,
           currency = ?,
           account_name = ?,
           account_number_encrypted = ?,
           mobile_encrypted = ?,
           masked_account = ?,
           destination_fingerprint = ?,
           is_default = ?,
           verification_status = 'pending',
           verification_attempts = 0,
           last_error = NULL,
           verified_at = NULL,
           updated_at = ?
       WHERE id = ?`,
    ).run(
      destinationType,
      providerName,
      providerRefId,
      currency,
      accountName,
      accountNumberEncrypted,
      mobileEncrypted,
      maskedAccount,
      fingerprint,
      isDefault ? 1 : 0,
      now,
      existing.id,
    );
  })();

  const updated = findDestinationById(existing.id);
  if (!updated) {
    throw new Error('Failed to update payout destination');
  }
  return rowToSellerPayoutDestination(updated);
}

function getRequestSellerId(req: express.Request, sellerUid?: unknown): string {
  const user = getRequestUser(req);
  if (!user) {
    throw new Error('Unauthorized');
  }
  if (user.is_admin && typeof sellerUid === 'string' && sellerUid.trim()) {
    return sellerUid.trim();
  }
  return user.uid;
}

export function createPayoutRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get('/permissions/:sellerId', requireAuth, (req, res) => {
    try {
      const sellerId = normalizeDestinationId(req.params.sellerId);
      const permissions = buildPermissions(sellerId, getActor(req));
      return res.json({ sellerId, permissions });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load payout permissions';
      const status = /Unauthorized/i.test(message) ? 401 : 400;
      return res.status(status).json({ error: message });
    }
  });

  router.get('/metadata', requireAuth, (_req, res) => {
    return res.json({
      mobileMoneyOperators: [],
      banks: [],
      currencies: [DEFAULT_CURRENCY],
      launchPolicy: PAYOUT_POLICY.launchMode,
    });
  });

  router.get('/provider/mobile-money-operators', requireAuth, async (req, res) => {
    try {
      assertProviderLookupAccess(req);
      const operators = await listPayChanguMobileMoneyOperators();
      return res.json({ operators: normalizeMobileMoneyProviderRecords(operators) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load mobile money operators';
      const status = /Unauthorized/i.test(message) ? 401 : /not allowed/i.test(message) ? 403 : 502;
      return res.status(status).json({ error: message });
    }
  });

  router.get('/provider/banks', requireAuth, async (req, res) => {
    try {
      assertProviderLookupAccess(req);
      const currency = normalizeProviderCurrency(req.query.currency);
      const banks = await listPayChanguPayoutBanks(currency);
      return res.json({ banks: normalizeBankProviderRecords(banks), currency });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load payout banks';
      const status = /Unauthorized/i.test(message)
        ? 401
        : /not allowed/i.test(message)
          ? 403
          : /Only MWK payout provider lookups/i.test(message)
            ? 400
            : 502;
      return res.status(status).json({ error: message });
    }
  });

  router.get('/destinations', requireAuth, (req, res) => {
    try {
      const sellerId = getRequestSellerId(req, req.query.sellerUid);
      assertViewSettingsAccess(req, sellerId);
      return res.json({ destinations: listSellerDestinations(sellerId) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load payout destinations';
      const status = /Unauthorized/i.test(message) ? 401 : 403;
      return res.status(status).json(jsonError(error, 'Failed to load payout destinations'));
    }
  });

  router.post('/destinations', payoutLimiter, requireAuth, (req, res) => {
    try {
      const sellerId = getRequestSellerId(req, req.body.sellerUid);
      assertEditSettingsAccess(req, sellerId);

      const destinationType = normalizeDestinationType(req.body.destinationType);
      const providerName = normalizeProviderName(req.body.providerName);
      const providerRefId = normalizeProviderRefId(req.body.providerRefId);
      const currency = normalizeCurrency(req.body.currency);
      const accountName = normalizeAccountName(req.body.accountName);
      const isDefault = req.body.isDefault === true;

      if (destinationType === 'bank') {
        const accountNumber = normalizeAccountNumber(req.body.accountNumber);
        const created = createDestinationRecord({
          sellerId,
          destinationType,
          providerName,
          providerRefId,
          currency,
          accountName,
          accountNumber,
          isDefault,
        });
        addDestinationEvent({
          sellerId,
          accountId: created.id,
          eventType: 'destination_added',
          actorType: req.user?.is_admin ? 'admin' : 'seller',
          actorId: req.user?.uid ?? null,
          payload: { destinationType: created.destinationType, providerName: created.providerName },
        });
        return res.status(201).json({ destination: created });
      }

      const mobile = normalizeMobileNumber(req.body.mobile);
      const created = createDestinationRecord({
        sellerId,
        destinationType,
        providerName,
        providerRefId,
        currency,
        accountName,
        mobile,
        isDefault,
      });
      addDestinationEvent({
        sellerId,
        accountId: created.id,
        eventType: 'destination_added',
        actorType: req.user?.is_admin ? 'admin' : 'seller',
        actorId: req.user?.uid ?? null,
        payload: { destinationType: created.destinationType, providerName: created.providerName },
      });
      return res.status(201).json({ destination: created });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create payout destination';
      const status = /already exists/i.test(message) ? 409 : /Unauthorized/i.test(message) ? 401 : 403;
      return res.status(status).json({ error: message });
    }
  });

  router.patch('/destinations/:id', payoutLimiter, requireAuth, (req, res) => {
    try {
      const destinationId = normalizeDestinationId(req.params.id);
      const existing = findDestinationById(destinationId);
      if (!existing) {
        return res.status(404).json({ error: 'Payout destination not found' });
      }
      assertEditSettingsAccess(req, existing.seller_uid);

      const destinationType = req.body.destinationType
        ? normalizeDestinationType(req.body.destinationType)
        : undefined;
      const providerName = req.body.providerName
        ? normalizeProviderName(req.body.providerName)
        : undefined;
      const providerRefId = req.body.providerRefId !== undefined
        ? normalizeProviderRefId(req.body.providerRefId)
        : undefined;
      const currency = req.body.currency !== undefined
        ? normalizeCurrency(req.body.currency)
        : undefined;
      const accountName = req.body.accountName !== undefined
        ? normalizeAccountName(req.body.accountName)
        : undefined;
      const isDefault = req.body.isDefault === true;

      const currentType = destinationType ?? existing.destination_type;
      const accountNumber = currentType === 'bank'
        ? (req.body.accountNumber !== undefined
          ? normalizeAccountNumber(req.body.accountNumber)
          : decryptSensitiveValue(existing.account_number_encrypted) ?? '')
        : null;
      const mobile = currentType === 'mobile_money'
        ? (req.body.mobile !== undefined
          ? normalizeMobileNumber(req.body.mobile)
          : decryptSensitiveValue(existing.mobile_encrypted) ?? '')
        : null;

      const updated = updateDestinationRecord(existing, {
        destinationType,
        providerName,
        providerRefId,
        currency,
        accountName,
        accountNumber,
        mobile,
        isDefault,
      });
      addDestinationEvent({
        sellerId: existing.seller_uid,
        accountId: updated.id,
        eventType: 'destination_updated',
        actorType: req.user?.is_admin ? 'admin' : 'seller',
        actorId: req.user?.uid ?? null,
        payload: { destinationType: updated.destinationType, providerName: updated.providerName },
      });

      return res.json({ destination: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update payout destination';
      const status = /already exists/i.test(message)
        ? 409
        : /Unauthorized/i.test(message)
          ? 401
          : /not allowed/i.test(message)
            ? 403
            : 400;
      return res.status(status).json({ error: message });
    }
  });

  router.delete('/destinations/:id', payoutLimiter, requireAuth, (req, res) => {
    try {
      const destinationId = normalizeDestinationId(req.params.id);
      const existing = findDestinationById(destinationId);
      if (!existing) {
        return res.status(404).json({ error: 'Payout destination not found' });
      }
      assertEditSettingsAccess(req, existing.seller_uid);
      const isDefaultDestination = existing.is_default === 1;
      if (isDefaultDestination) {
        return res.status(409).json({
          error: 'Default payout destination cannot be removed. Replace it instead.',
        });
      }

      const now = new Date().toISOString();
      const db = getPaymentDb();
      db.prepare(
        `UPDATE seller_payout_accounts
         SET is_active = 0,
             is_default = 0,
             updated_at = ?
         WHERE id = ?`,
      ).run(now, existing.id);

      const updated = findDestinationById(existing.id);
      if (!updated) {
        throw new Error('Failed to remove payout destination');
      }

      addDestinationEvent({
        sellerId: existing.seller_uid,
        accountId: existing.id,
        eventType: 'destination_removed',
        actorType: req.user?.is_admin ? 'admin' : 'seller',
        actorId: req.user?.uid ?? null,
        payload: { providerName: existing.provider_name },
      });

      return res.json({
        destination: rowToSellerPayoutDestination(updated),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove payout destination';
      const status = /Unauthorized/i.test(message)
        ? 401
        : /not allowed/i.test(message)
          ? 403
          : 400;
      return res.status(status).json({ error: message });
    }
  });

  router.post('/destinations/:id/replace', payoutLimiter, requireAuth, (req, res) => {
    try {
      const destinationId = normalizeDestinationId(req.params.id);
      const existing = findDestinationById(destinationId);
      if (!existing) {
        return res.status(404).json({ error: 'Payout destination not found' });
      }
      assertEditSettingsAccess(req, existing.seller_uid);

      const destinationType = req.body.destinationType
        ? normalizeDestinationType(req.body.destinationType)
        : existing.destination_type;
      const providerName = req.body.providerName
        ? normalizeProviderName(req.body.providerName)
        : existing.provider_name;
      const providerRefId = req.body.providerRefId !== undefined
        ? normalizeProviderRefId(req.body.providerRefId)
        : existing.provider_ref_id;
      const currency = req.body.currency !== undefined
        ? normalizeCurrency(req.body.currency)
        : existing.currency;
      const accountName = req.body.accountName !== undefined
        ? normalizeAccountName(req.body.accountName)
        : existing.account_name;
      const isDefault = req.body.isDefault === true || existing.is_default === 1;

      const accountNumber = destinationType === 'bank'
        ? normalizeAccountNumber(
            req.body.accountNumber !== undefined
              ? req.body.accountNumber
              : decryptSensitiveValue(existing.account_number_encrypted) ?? '',
          )
        : null;
      const mobile = destinationType === 'mobile_money'
        ? normalizeMobileNumber(
            req.body.mobile !== undefined
              ? req.body.mobile
              : decryptSensitiveValue(existing.mobile_encrypted) ?? '',
          )
        : null;

      const sameAsCurrent =
        destinationType === existing.destination_type &&
        providerName === existing.provider_name &&
        providerRefId === existing.provider_ref_id &&
        currency === existing.currency &&
        accountName === existing.account_name &&
        ((destinationType === 'bank' && accountNumber === decryptSensitiveValue(existing.account_number_encrypted)) ||
          (destinationType === 'mobile_money' && mobile === decryptSensitiveValue(existing.mobile_encrypted)));

      if (sameAsCurrent) {
        throw new Error('Replacement must change at least one payout detail');
      }

      const created = createDestinationRecord({
        sellerId: existing.seller_uid,
        destinationType,
        providerName,
        providerRefId,
        currency,
        accountName,
        accountNumber: destinationType === 'bank' ? accountNumber ?? undefined : undefined,
        mobile: destinationType === 'mobile_money' ? mobile ?? undefined : undefined,
        isDefault,
        sourceId: existing.id,
      });

      const db = getPaymentDb();
      const now = new Date().toISOString();
      db.prepare(
        `UPDATE seller_payout_accounts
         SET is_active = 0,
             replaced_by_id = ?,
             updated_at = ?
         WHERE id = ?`,
      ).run(created.id, now, existing.id);

      db.prepare(
        `UPDATE seller_payout_accounts
         SET replaced_from_id = ?, updated_at = ?
         WHERE id = ?`,
      ).run(existing.id, now, created.id);

      const latest = findDestinationById(created.id);
      addDestinationEvent({
        sellerId: existing.seller_uid,
        accountId: created.id,
        eventType: 'destination_replaced',
        actorType: req.user?.is_admin ? 'admin' : 'seller',
        actorId: req.user?.uid ?? null,
        payload: { replacedFromId: existing.id, replacedById: created.id },
      });
      return res.status(201).json({
        destination: latest ? rowToSellerPayoutDestination(latest) : created,
        replacedDestinationId: existing.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to replace payout destination';
      const status = /already exists/i.test(message)
        ? 409
        : /Unauthorized/i.test(message)
          ? 401
          : /not allowed/i.test(message)
            ? 403
            : 400;
      return res.status(status).json({ error: message });
    }
  });

  router.post('/withdrawals', payoutLimiter, requireAuth, (req, res) => {
    try {
      const sellerId = getRequestSellerId(req, req.body.sellerUid);
      assertWithdrawalAccess(req, sellerId);
      if (PAYOUT_POLICY.launchMode === 'admin_approved' && !req.user?.is_admin) {
        return res.status(403).json({
          error: 'Seller withdrawal requests are disabled while launch mode is admin-approved',
        });
      }
      return res.status(202).json({
        status: 'queued_for_admin_review',
        sellerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to request withdrawal';
      const status = /Unauthorized/i.test(message) ? 401 : 403;
      return res.status(status).json({ error: message });
    }
  });

  router.get('/history/:sellerId', requireAuth, (req, res) => {
    try {
      const sellerId = normalizeDestinationId(req.params.sellerId);
      assertHistoryAccess(req, sellerId);
      const rows = listSellerPayoutOperationalView(sellerId);
      return res.json({ payouts: rows });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load payout history';
      const status = /Unauthorized/i.test(message) ? 401 : 403;
      return res.status(status).json({ error: message });
    }
  });

  router.post('/:sellerId/retry', payoutLimiter, requireAuth, async (req, res) => {
    try {
      const sellerId = normalizeDestinationId(req.params.sellerId);
      assertRetryAccess(req, sellerId);
      const payoutId = normalizeDestinationId(req.body?.payoutId);
      if (PAYOUT_POLICY.launchMode === 'admin_approved' && !req.user?.is_admin) {
        return res.status(403).json({
          error: 'Seller retry is disabled while launch mode is admin-approved',
        });
      }
      const result = await payoutService.executePayout({
        payoutId,
        actorType: req.user?.is_admin ? 'admin' : 'system',
        actorId: req.user?.uid ?? null,
      });
      return res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to request payout retry';
      const status = /Unauthorized/i.test(message) ? 401 : 403;
      return res.status(status).json({ error: message });
    }
  });

  router.post('/:sellerId/override', payoutLimiter, requireAuth, (req, res) => {
    try {
      assertOverrideAccess(req);
      const sellerId = normalizeDestinationId(req.params.sellerId);
      const payoutId = normalizeDestinationId(req.body?.payoutId);
      const reason = normalizeText(req.body?.reason);
      if (!reason) {
        return res.status(400).json({ error: 'reason is required' });
      }
      const action = normalizeOverrideAction(req.body?.action);
      const actorId = req.user?.uid ?? 'admin';
      const payout = payoutService.applyAdminOverride({
        payoutId,
        sellerId,
        action,
        actorId,
        reason,
      });
      if (!payout) return res.status(404).json({ error: 'Payout not found' });
      return res.status(200).json({ payout });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve payout override';
      const status = /Unauthorized/i.test(message)
        ? 401
        : /action must be one of|reason is required|Invalid admin override transition|does not belong to the provided seller/i.test(message)
          ? 400
          : 403;
      return res.status(status).json({ error: message });
    }
  });

  router.post('/', payoutLimiter, requireAuth, (req, res) => {
    return (async () => {
      try {
      if (!req.user?.is_admin) {
        return res.status(403).json({
          error: 'Admin access required',
        });
      }

      const {
        sellerId,
        orderId,
        amount,
        destinationAccountId,
        grossAmount,
        platformFeeAmount,
        processingFeeAmount,
        reserveAmount,
        reserveCapAmount,
        manualAdjustmentAmount,
        netAmount,
        formulaSnapshot,
        reason,
        currency = 'MWK',
      } = req.body as {
        sellerId?: string;
        orderId?: string;
        amount?: number;
        destinationAccountId?: string;
        grossAmount?: number;
        platformFeeAmount?: number;
        processingFeeAmount?: number;
        reserveAmount?: number;
        reserveCapAmount?: number;
        manualAdjustmentAmount?: number;
        netAmount?: number;
        formulaSnapshot?: Record<string, unknown>;
        reason?: string;
        currency?: string;
      };

      if (!sellerId || amount === undefined) {
        return res.status(400).json({
          error: 'sellerId and amount are required',
        });
      }
      const adminReason = normalizeText(reason);
      if (!adminReason) {
        return res.status(400).json({ error: 'reason is required' });
      }
      const normalizedAmount = normalizeManualPayoutAmount(amount);
      const normalizedCurrency = normalizeCurrency(currency);
      const now = new Date().toISOString();
      const id = randomUUID();
      const normalizedSellerId = normalizeDestinationId(sellerId);
      const normalizedDestinationAccountId = destinationAccountId === undefined
        ? null
        : normalizeDestinationId(destinationAccountId);

      const db = getPaymentDb();
      const escrow = orderId
        ? escrowRepository.findByOrderId(orderId)
        : undefined;

      db.prepare(
        `INSERT INTO payouts (
          id,
          seller_id,
          order_id,
          escrow_id,
          amount,
          gross_amount,
          platform_fee_amount,
          processing_fee_amount,
          reserve_amount,
          reserve_cap_amount,
          manual_adjustment_amount,
          net_amount,
          formula_snapshot,
          currency,
          status,
          destination_account_id,
          requested_by,
          requested_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'eligible', ?, ?, ?, ?, ?)`,
      ).run(
        id,
        normalizedSellerId,
        orderId ?? null,
        escrow?.id ?? null,
        normalizedAmount,
        grossAmount ?? normalizedAmount,
        platformFeeAmount ?? 0,
        processingFeeAmount ?? 0,
        reserveAmount ?? 0,
        reserveCapAmount ?? 0,
        manualAdjustmentAmount ?? 0,
        netAmount ?? normalizedAmount,
        JSON.stringify(formulaSnapshot ?? {}),
        normalizedCurrency,
        normalizedDestinationAccountId,
        req.user.uid,
        now,
        now,
        now,
      );
      payoutService.addEvent({
        payoutId: id,
        sellerId: normalizedSellerId,
        eventType: 'manual_payout_created',
        actorType: 'admin',
        actorId: req.user.uid,
        note: adminReason,
        payload: {
          reason: adminReason,
          destinationAccountId: normalizedDestinationAccountId,
          formulaSnapshot: formulaSnapshot ?? {},
        },
      });

      const execution = await payoutService.executePayout({
        payoutId: id,
        actorType: 'admin',
        actorId: req.user.uid,
      });

      const created = payoutService.findById(id);

      return res.status(201).json({
        id,
        sellerId: normalizedSellerId,
        orderId,
        amount: normalizedAmount,
        currency: normalizedCurrency,
        status: created?.status ?? 'eligible',
        nextAction: execution.nextAction,
        reasonCode: execution.reasonCode,
        reason: execution.reason,
        createdAt: now,
      });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to process payout';
        const status = /reason is required|amount must be a positive integer|Destination id is required|Only MWK/i.test(message)
          ? 400
          : /Unauthorized/i.test(message)
            ? 401
            : 500;
        return res.status(status).json(jsonError(error, 'Failed to process payout'));
      }
    })();
  });

  return router;
}

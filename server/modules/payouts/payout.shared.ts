import { createDecipheriv, scryptSync } from 'crypto';
import type { MoneyValue } from '../../../src/shared/types/common.js';
import { PAYOUT_POLICY } from './payout.policy.js';
import type { PayChanguPayoutFailureClass } from './paychangu.payout.js';

export type PayoutStatus =
  | 'eligible'
  | 'pending_settlement'
  | 'ready_for_payout'
  | 'queued'
  | 'processing'
  | 'pending'
  | 'held'
  | 'paid'
  | 'failed'
  | 'cancelled';

export interface PayoutRecord {
  id: string;
  sellerId: string;
  orderId: string | null;
  escrowId: string | null;
  releaseEntryId: string | null;
  destinationAccountId: string | null;
  amount: number;
  currency: string;
  status: PayoutStatus;
  provider: string | null;
  providerChargeId: string | null;
  providerStatus?: string | null;
  lastAttemptId?: string | null;
  requestedBy: string | null;
  requestedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutAttemptRecord {
  id: string;
  payoutId: string;
  provider: string;
  providerChargeId: string;
  providerReference: string;
  providerTransactionId: string | null;
  status: PayoutStatus;
  attemptNo: number;
  rawResponse: Record<string, unknown>;
  createdAt: string;
}

export interface CreateEligiblePayoutInput {
  sellerId: string;
  orderId: string;
  escrowId: string;
  releaseEntryId: string;
  amount: number;
  grossAmount: number;
  platformFeeAmount: number;
  processingFeeAmount: number;
  reserveAmount: number;
  reserveCapAmount: number;
  manualAdjustmentAmount: number;
  payoutFeeAmount?: number;
  sellerReceivesAmount?: number;
  netAmount: number;
  formulaSnapshot: Record<string, unknown>;
  currency: string;
  requestedBy: string;
  requestedAt?: string;
  destinationAccountId?: string | null;
  snapshot?: Record<string, unknown> | null;
}

export interface CreateConnectPayoutInput {
  sellerId: string;
  orderId: string;
  amount: number;
  grossAmount: number;
  platformFeeAmount: number;
  processingFeeAmount: number;
  reserveAmount: number;
  reserveCapAmount: number;
  manualAdjustmentAmount: number;
  payoutFeeAmount?: number;
  sellerReceivesAmount?: number;
  netAmount: number;
  formulaSnapshot: Record<string, unknown>;
  currency: string;
  requestedBy: string;
  requestedAt?: string;
  destinationAccountId?: string | null;
  snapshot?: Record<string, unknown> | null;
}

export interface PayoutRequest {
  sellerId: string;
  amount: MoneyValue;
}

export interface ExecutePayoutInput {
  payoutId: string;
  sellerId?: string;
  amount?: number;
  currency?: string;
  providerName?: string;
  destinationReference?: string;
  actorType?: 'admin' | 'system';
  actorId?: string | null;
}

export interface ReconcileProviderCallbackInput {
  payoutId: string;
  status: PayoutStatus;
  providerChargeId?: string | null;
  providerReference?: string | null;
  providerTransactionId?: string | null;
  rawPayload?: unknown;
  eventId?: string | number | null;
}

export type AdminOverrideAction = 'hold' | 'mark_paid' | 'mark_failed' | 'cancel';

export type PayoutPermissionActor = {
  uid: string;
  is_admin?: boolean;
};

export type PayoutPermissionContext = {
  sellerId: string;
  actor: PayoutPermissionActor | null;
};

export type PayoutNextAction =
  | 'manual_review'
  | 'retry_blocked'
  | 'awaiting_provider'
  | 'none';

const PAYOUT_ENCRYPTION_SECRET = process.env.SELLER_PAYOUT_ENCRYPTION_KEY ?? '';

export function classifyProviderFailureFromError(error: unknown): PayChanguPayoutFailureClass {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('rate-limit') ||
      message.includes('too many requests')
    ) {
      return 'provider_rate_limited';
    }
    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('etimedout')
    ) {
      return 'provider_timeout';
    }
  }
  return 'provider_unavailable';
}

export function exactProviderErrorMessage(rawResponse: unknown): string | null {
  const extract = (value: unknown): string | null => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;

      try {
        const parsed = JSON.parse(trimmed);
        return extract(parsed) ?? trimmed;
      } catch {
        return trimmed;
      }
    }

    if (!value || typeof value !== 'object') {
      return null;
    }

    const record = value as Record<string, unknown>;

    for (const key of ['message', 'error', 'detail', 'reason', 'rawText']) {
      const found = extract(record[key]);
      if (found) return found;
    }

    if (record.response) {
      return extract(record.response);
    }

    return null;
  };

  return extract(rawResponse);
}

export function providerFailureReason(
  reasonCode: PayChanguPayoutFailureClass,
  exactMessage?: string | null,
): string {
  if (exactMessage) return exactMessage;

  switch (reasonCode) {
    case 'provider_timeout':
      return 'Provider timeout; payout held for manual review.';
    case 'provider_rate_limited':
      return 'Provider rate-limited payout submission; retry is blocked pending manual review.';
    case 'provider_unavailable':
    default:
      return 'Provider outage detected; payout held for manual review.';
  }
}

export function isProviderHoldFailure(reasonCode: string | null | undefined): reasonCode is NonNullable<PayChanguPayoutFailureClass> {
  return (
    reasonCode === 'provider_unavailable' ||
    reasonCode === 'provider_timeout' ||
    reasonCode === 'provider_rate_limited'
  );
}

export function isAdminActor(actor: PayoutPermissionActor | null): boolean {
  return actor?.is_admin === true;
}

export function isSameSeller(actor: PayoutPermissionActor | null, sellerId: string): boolean {
  return !!actor?.uid && actor.uid === sellerId;
}

export function requirePayoutEncryptionSecret(): string {
  if (!PAYOUT_ENCRYPTION_SECRET) {
    throw new Error('SELLER_PAYOUT_ENCRYPTION_KEY is not configured');
  }
  return PAYOUT_ENCRYPTION_SECRET;
}

export function getDerivedEncryptionKey(): Buffer {
  return scryptSync(requirePayoutEncryptionSecret(), 'BuyMesho seller payout', 32);
}

export function decryptSensitiveValue(value: string | null): string | null {
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

export function canViewPayoutSettings(context: PayoutPermissionContext): boolean {
  return isAdminActor(context.actor) || isSameSeller(context.actor, context.sellerId);
}

export function canEditPayoutSettings(context: PayoutPermissionContext): boolean {
  return isAdminActor(context.actor) || isSameSeller(context.actor, context.sellerId);
}

export function canRequestWithdrawal(context: PayoutPermissionContext): boolean {
  if (PAYOUT_POLICY.launchMode === 'admin_approved') {
    return isAdminActor(context.actor);
  }
  return isAdminActor(context.actor) || isSameSeller(context.actor, context.sellerId);
}

export function canViewPayoutHistory(context: PayoutPermissionContext): boolean {
  return isAdminActor(context.actor) || isSameSeller(context.actor, context.sellerId);
}

export function canRequestPayoutRetry(context: PayoutPermissionContext): boolean {
  if (PAYOUT_POLICY.launchMode === 'admin_approved') {
    return isAdminActor(context.actor);
  }
  return isAdminActor(context.actor) || isSameSeller(context.actor, context.sellerId);
}

export function canApprovePayoutOverride(context: PayoutPermissionContext): boolean {
  return isAdminActor(context.actor);
}

export function canManageSellerPayoutDestination(context: PayoutPermissionContext): boolean {
  return canEditPayoutSettings(context);
}

export function canAccessSellerPayoutData(context: PayoutPermissionContext): boolean {
  return canViewPayoutSettings(context);
}

/**
 * System actor permission gate.
 * The system actor (e.g. scheduled reconciliation, automated release) may always
 * execute internal payout operations. System actions bypass human approval gates
 * but still emit audit events with actorType='system'.
 */
export function canExecuteSystemAction(_operation: string): boolean {
  return true;
}

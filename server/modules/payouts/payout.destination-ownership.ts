import { getPaymentDb } from '../../postgresCompat.js';

export type PayoutDestinationOwnerType = 'seller' | 'event_creator';

export type PayoutDestinationOwner = {
  type: PayoutDestinationOwnerType;
  uid: string;
};

export type SharedPayoutDestinationRow = {
  id: string;
  seller_uid: string | null;
  event_creator_uid: string | null;
  owner_type: PayoutDestinationOwnerType;
  owner_uid: string;
  destination_type: 'mobile_money' | 'bank';
  provider_name: string;
  provider_ref_id: string | null;
  currency: string;
  account_name: string;
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

/**
 * Shared read contract for payout destinations. Seller and event-creator
 * callers use the same table and the same destination lifecycle.
 */
export function listPayoutDestinationsForOwner(owner: PayoutDestinationOwner): SharedPayoutDestinationRow[] {
  const db = getPaymentDb();
  return db
    .prepare(
      `SELECT *
       FROM seller_payout_accounts
       WHERE owner_type = ?
         AND owner_uid = ?
       ORDER BY is_default DESC, created_at DESC`,
    )
    .all(owner.type, owner.uid) as SharedPayoutDestinationRow[];
}

export function findPayoutDestinationForOwner(
  owner: PayoutDestinationOwner,
  destinationId: string,
): SharedPayoutDestinationRow | undefined {
  const db = getPaymentDb();
  return db
    .prepare(
      `SELECT *
       FROM seller_payout_accounts
       WHERE id = ?
         AND owner_type = ?
         AND owner_uid = ?
       LIMIT 1`,
    )
    .get(destinationId, owner.type, owner.uid) as SharedPayoutDestinationRow | undefined;
}

export function assertPayoutDestinationOwner(owner: PayoutDestinationOwner): void {
  if (owner.type !== 'seller' && owner.type !== 'event_creator') {
    throw new Error('Unsupported payout destination owner type');
  }
  if (!owner.uid.trim()) {
    throw new Error('Payout destination owner id is required');
  }
}

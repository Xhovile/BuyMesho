import { getPaymentDb } from '../../postgresCompat.js';
import {
  type SellerPayoutDestinationRecord,
  type SellerPayoutDestinationRow,
  rowToSellerPayoutDestination,
} from './payoutRoutes.helpers.core.js';

/**
 * Compatibility query helpers retained after splitting payout route helpers.
 * These are read-only and intentionally keep the legacy helper names stable
 * for existing payout route imports.
 */
export function findDestinationByIdPublic(destinationId: string): SellerPayoutDestinationRow | undefined {
  const db = getPaymentDb();
  return db
    .prepare('SELECT * FROM seller_payout_accounts WHERE id = ? LIMIT 1')
    .get(destinationId) as SellerPayoutDestinationRow | undefined;
}

export function listSellerDestinations(sellerId: string): SellerPayoutDestinationRecord[] {
  const db = getPaymentDb();
  const rows = db
    .prepare(
      `SELECT *
       FROM seller_payout_accounts
       WHERE seller_uid = ?
       ORDER BY is_default DESC, created_at DESC`,
    )
    .all(sellerId) as SellerPayoutDestinationRow[];

  return rows.map(rowToSellerPayoutDestination);
}

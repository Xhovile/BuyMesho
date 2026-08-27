import { getPaymentDb } from '../../postgresCompat.js';
import { PAYOUT_POLICY, isRetryableFailureCode } from '../../modules/payouts/payout.policy.js';

export function listSellerPayoutOperationalView(sellerId: string) {
  const db = getPaymentDb();
  const rows = db.prepare(`
    SELECT
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
      p.payout_fee_amount,
      p.seller_receives_amount,
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
    ORDER BY p.created_at DESC
  `).all(sellerId) as Array<Record<string, unknown>>;

  return rows.map((row) => {
    const status = String(row.status ?? 'pending').toLowerCase();
    const destinationStatus = String(row.destination_verification_status ?? 'missing').toLowerCase();
    const failureReason = (row.failure_reason as string | null) ?? null;
    const manualReviewReason = (row.manual_review_reason as string | null) ?? null;
    const retryCount = Number(row.retry_count ?? 0);
    const verificationBlockers: string[] = [];

    if (destinationStatus === 'missing') verificationBlockers.push('Update destination to continue');
    else if (destinationStatus === 'failed') verificationBlockers.push('Destination verification failed');
    else if (destinationStatus === 'disabled' || Number(row.destination_is_active ?? 0) !== 1) verificationBlockers.push('Destination is disabled');
    else if (destinationStatus !== 'verified') verificationBlockers.push('Destination pending verification');

    const retryAllowed = status === 'failed' && retryCount < PAYOUT_POLICY.maxRetryCount && isRetryableFailureCode(failureReason);

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
      payoutFeeAmount: row.payout_fee_amount,
      sellerReceivesAmount: row.seller_receives_amount,
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

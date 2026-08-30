import express, { type RequestHandler } from 'express';
import { hasAdminAccess } from '../../auth/adminAccess.js';
import { query } from '../../postgres.js';
import { PAYOUT_POLICY, isRetryableFailureCode } from '../payouts/payout.policy.js';
import { payoutLimiter } from '../../routes/escrow/shared.js';

function requireAdmin(req: express.Request, res: express.Response): boolean {
  if (!hasAdminAccess(req.user)) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result || null;
}

function bool(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function jsonValue(value: unknown): unknown {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function shapePayout(row: Record<string, unknown>, attempts: Array<Record<string, unknown>>, events: Array<Record<string, unknown>>, adjustments: Array<Record<string, unknown>>) {
  const status = text(row.status)?.toLowerCase() ?? 'unknown';
  const attemptCount = attempts.length;
  const latestAttempt = attempts[0] ?? null;
  const destinationVerificationStatus = text(row.destinationVerificationStatus)?.toLowerCase() ?? 'missing';
  const destinationActive = bool(row.destinationActive);
  const sellerSuspended = bool(row.sellerSuspended);
  const failureReason = text(row.failureReason);

  const retryEligible =
    (status === 'failed' || status === 'held') &&
    attemptCount < PAYOUT_POLICY.maxRetryCount &&
    (status === 'held' ? !failureReason || isRetryableFailureCode(failureReason) : isRetryableFailureCode(failureReason ?? '')) &&
    !sellerSuspended &&
    destinationVerificationStatus === 'verified' &&
    destinationActive;

  const retryBlockedReason = retryEligible
    ? null
    : sellerSuspended
      ? 'Seller payouts are suspended'
      : destinationVerificationStatus !== 'verified' || !destinationActive
        ? 'Destination is not verified and active'
        : status !== 'failed'
          ? `Retry unavailable while payout is ${status}`
          : 'Retry unavailable due to policy gate';

  const latestAuditEvent = events[0] ?? null;

  return {
    id: text(row.id) ?? '',
    sellerId: text(row.sellerId) ?? '',
    sellerBusinessName: text(row.sellerBusinessName),
    sellerEmail: text(row.sellerEmail),
    orderId: text(row.orderId),
    escrowId: text(row.escrowId),
    escrowState: text(row.escrowState),
    releaseEntryId: text(row.releaseEntryId),
    amount: Number(row.amount ?? 0),
    currency: text(row.currency) ?? 'MWK',
    status,
    provider: text(row.provider) ?? 'paychangu',
    providerChargeId: text(row.providerChargeId),
    providerReference: text(row.providerReference),
    providerTransactionId: text(row.providerTransactionId),
    providerStatus: text(row.providerStatus),
    destinationAccountId: text(row.destinationAccountId),
    destinationMaskedAccount: text(row.destinationMaskedAccount),
    destinationType: text(row.destinationType),
    destinationProviderName: text(row.destinationProviderName),
    destinationVerificationStatus,
    destinationStatus: destinationVerificationStatus,
    destinationActive,
    destinationLastError: text(row.destinationLastError),
    sellerSuspended,
    failureReason,
    manualReviewReason: text(row.manualReviewReason),
    requestedBy: text(row.requestedBy),
    requestedAt: row.requestedAt ?? null,
    sentAt: row.sentAt ?? null,
    paidAt: row.paidAt ?? null,
    failedAt: row.failedAt ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
    grossAmount: Number(row.grossAmount ?? 0),
    platformFeeAmount: Number(row.platformFeeAmount ?? 0),
    legacyProcessingFeeAmount: Number(row.legacyProcessingFeeAmount ?? 0),
    reserveAmount: Number(row.reserveAmount ?? 0),
    reserveCapAmount: Number(row.reserveCapAmount ?? 0),
    manualAdjustmentAmount: Number(row.manualAdjustmentAmount ?? 0),
    netAmount: Number(row.netAmount ?? row.amount ?? 0),
    formulaSnapshot: jsonValue(row.formulaSnapshot),
    latestAttemptNo: latestAttempt ? Number(latestAttempt.attemptNo ?? 0) : null,
    latestAttemptStatus: text(latestAttempt?.status),
    latestAttemptAt: latestAttempt?.createdAt ?? null,
    latestAttemptFailureReason: text(latestAttempt?.failureReason),
    latestAttemptProviderChargeId: text(latestAttempt?.providerChargeId),
    latestAttemptProviderReference: text(latestAttempt?.providerReference),
    latestAttemptProviderTransactionId: text(latestAttempt?.providerTransactionId),
    latestAttemptProviderResponse: jsonValue(latestAttempt?.providerResponse),
    attemptCount,
    latestWebhookEventType: text(row.latestWebhookEventType),
    latestWebhookEventAt: row.latestWebhookEventAt ?? null,
    latestAuditEventType: text(latestAuditEvent?.eventType),
    latestAuditEventAt: latestAuditEvent?.createdAt ?? null,
    retryEligible,
    retryAllowed: retryEligible,
    retryBlockedReason,
    manualReviewPending: status === 'held',
    verificationBlockers:
      [
        sellerSuspended ? 'Seller payouts are suspended' : null,
        destinationVerificationStatus !== 'verified' ? 'Destination is not verified' : null,
        !destinationActive ? 'Destination is inactive' : null,
      ].filter((value): value is string => Boolean(value)),
    auditSummary: {
      totalEvents: events.length,
      latestEventType: text(latestAuditEvent?.eventType),
      latestEventAt: latestAuditEvent?.createdAt ?? null,
    },
    adjustments,
    diagnostics: {
      payoutId: text(row.id),
      sellerId: text(row.sellerId),
      orderId: text(row.orderId),
      escrowId: text(row.escrowId),
      releaseEntryId: text(row.releaseEntryId),
      status,
      provider: text(row.provider),
      providerStatus: text(row.providerStatus),
      providerChargeId: text(row.providerChargeId),
      providerReference: text(row.providerReference),
      providerTransactionId: text(row.providerTransactionId),
      destinationAccountId: text(row.destinationAccountId),
      destinationVerificationStatus,
      destinationActive,
      destinationLastError: text(row.destinationLastError),
      sellerSuspended,
      failureReason,
      manualReviewReason: text(row.manualReviewReason),
      latestAttemptNo: latestAttempt ? Number(latestAttempt.attemptNo ?? 0) : null,
      latestAttemptStatus: text(latestAttempt?.status),
      latestAttemptFailureReason: text(latestAttempt?.failureReason),
      latestAttemptAt: latestAttempt?.createdAt ?? null,
      latestAttemptProviderChargeId: text(latestAttempt?.providerChargeId),
      latestAttemptProviderResponse: jsonValue(latestAttempt?.providerResponse),
      latestWebhookEventType: text(row.latestWebhookEventType),
      latestWebhookEventAt: row.latestWebhookEventAt ?? null,
      latestAuditEventType: text(latestAuditEvent?.eventType),
      latestAuditEventAt: latestAuditEvent?.createdAt ?? null,
      retryEligible,
      retryBlockedReason,
    },
  };
}

const baseSelect = `
  SELECT
    p.id,
    p.seller_id AS "sellerId",
    s.business_name AS "sellerBusinessName",
    s.email AS "sellerEmail",
    p.order_id AS "orderId",
    p.escrow_id AS "escrowId",
    e.state AS "escrowState",
    p.release_entry_id AS "releaseEntryId",
    p.amount,
    p.currency,
    p.status,
    p.provider,
    p.provider_charge_id AS "providerChargeId",
    p.provider_ref_id AS "providerReference",
    p.provider_transaction_id AS "providerTransactionId",
    p.provider_status AS "providerStatus",
    p.destination_account_id AS "destinationAccountId",
    spa.masked_account AS "destinationMaskedAccount",
    spa.destination_type AS "destinationType",
    spa.provider_name AS "destinationProviderName",
    spa.verification_status AS "destinationVerificationStatus",
    spa.is_active AS "destinationActive",
    spa.last_error AS "destinationLastError",
    s.is_suspended AS "sellerSuspended",
    p.failure_reason AS "failureReason",
    p.manual_review_reason AS "manualReviewReason",
    p.requested_by AS "requestedBy",
    p.requested_at AS "requestedAt",
    p.sent_at AS "sentAt",
    p.paid_at AS "paidAt",
    p.failed_at AS "failedAt",
    p.created_at AS "createdAt",
    p.updated_at AS "updatedAt",
    p.gross_amount AS "grossAmount",
    p.platform_fee_amount AS "platformFeeAmount",
    p.processing_fee_amount AS "legacyProcessingFeeAmount",
    p.reserve_amount AS "reserveAmount",
    p.reserve_cap_amount AS "reserveCapAmount",
    p.manual_adjustment_amount AS "manualAdjustmentAmount",
    p.net_amount AS "netAmount",
    p.formula_snapshot AS "formulaSnapshot",
    (
      SELECT pe.event_type
      FROM payout_events pe
      WHERE pe.payout_id = p.id
        AND pe.event_type IN ('payout_reconciled', 'payout_webhook_duplicate', 'payout_webhook_rejected')
      ORDER BY pe.created_at DESC
      LIMIT 1
    ) AS "latestWebhookEventType",
    (
      SELECT pe.created_at
      FROM payout_events pe
      WHERE pe.payout_id = p.id
        AND pe.event_type IN ('payout_reconciled', 'payout_webhook_duplicate', 'payout_webhook_rejected')
      ORDER BY pe.created_at DESC
      LIMIT 1
    ) AS "latestWebhookEventAt"
  FROM payouts p
  LEFT JOIN sellers s ON s.uid = p.seller_id
  LEFT JOIN escrows e ON e.id = p.escrow_id
  LEFT JOIN seller_payout_accounts spa ON spa.id = p.destination_account_id
`;

async function loadRelated(payoutId: string) {
  const [attemptsResult, eventsResult, adjustmentsResult] = await Promise.all([
    query(
      `SELECT
         attempt_no AS "attemptNo",
         status,
         failure_reason AS "failureReason",
         provider_charge_id AS "providerChargeId",
         provider_ref_id AS "providerReference",
         provider_transaction_id AS "providerTransactionId",
         response_payload AS "providerResponse",
         created_at AS "createdAt"
       FROM payout_attempts
       WHERE payout_id = $1
       ORDER BY attempt_no DESC`,
      [payoutId],
    ),
    query(
      `SELECT event_type AS "eventType", created_at AS "createdAt", note, payload
       FROM payout_events
       WHERE payout_id = $1
       ORDER BY created_at DESC, id DESC`,
      [payoutId],
    ),
    query(
      `SELECT
         id,
         payout_id AS "payoutId",
         seller_id AS "sellerId",
         adjustment_type AS "adjustmentType",
         amount,
         currency,
         reason,
         actor_type AS "actorType",
         actor_id AS "actorId",
         provider_reference AS "providerReference",
         created_at AS "createdAt"
       FROM payout_adjustments
       WHERE payout_id = $1
       ORDER BY created_at DESC, id DESC`,
      [payoutId],
    ),
  ]);

  return {
    attempts: attemptsResult.rows as Array<Record<string, unknown>>,
    events: eventsResult.rows as Array<Record<string, unknown>>,
    adjustments: adjustmentsResult.rows as Array<Record<string, unknown>>,
  };
}

export function createPaymentAdminPayoutCanonicalRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get('/payouts', payoutLimiter, requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;

      const rawLimit = Array.isArray(req.query?.limit) ? req.query.limit[0] : req.query?.limit;
      const rawOffset = Array.isArray(req.query?.offset) ? req.query.offset[0] : req.query?.offset;
      const parsedLimit = Number(rawLimit);
      const parsedOffset = Number(rawOffset);
      const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 500) : 50;
      const offset = Number.isFinite(parsedOffset) ? Math.max(Math.trunc(parsedOffset), 0) : 0;

      const result = await query(
        `${baseSelect}
         ORDER BY p.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      const totalResult = await query(`SELECT COUNT(*)::int AS total FROM payouts`);
      const rows = result.rows as Array<Record<string, unknown>>;

      const shaped = await Promise.all(rows.map(async (row) => {
        const related = await loadRelated(String(row.id));
        return shapePayout(row, related.attempts, related.events, related.adjustments);
      }));

      return res.status(200).json({
        rows: shaped,
        pagination: {
          limit,
          offset,
          total: Number(totalResult.rows[0]?.total ?? 0),
          hasMore: offset + shaped.length < Number(totalResult.rows[0]?.total ?? 0),
        },
      });
    } catch (error) {
      console.error('[admin-payout-canonical] list failed', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load payout queue' });
    }
  });

  router.get('/payouts/summary', payoutLimiter, requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;
      const result = await query(`
        SELECT
          COUNT(*)::int AS "totalPayouts",
          COUNT(*) FILTER (WHERE status IN ('eligible','queued','processing','pending','held'))::int AS "pendingPayouts",
          COUNT(*) FILTER (WHERE status = 'paid')::int AS "paidPayouts",
          COUNT(*) FILTER (WHERE status = 'failed')::int AS "failedPayouts",
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS "cancelledPayouts"
        FROM payouts
      `);
      return res.status(200).json({ summary: result.rows[0] ?? {} });
    } catch (error) {
      console.error('[admin-payout-canonical] summary failed', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load payout summary' });
    }
  });

  router.get('/payouts/detail/:payoutId', payoutLimiter, requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;
      const payoutId = String(req.params.payoutId ?? '').trim();
      if (!payoutId) return res.status(400).json({ error: 'payoutId is required' });

      const result = await query(`${baseSelect} WHERE p.id = $1 LIMIT 1`, [payoutId]);
      const row = result.rows[0] as Record<string, unknown> | undefined;
      if (!row) return res.status(404).json({ error: 'Payout not found' });

      const related = await loadRelated(payoutId);
      return res.status(200).json(shapePayout(row, related.attempts, related.events, related.adjustments));
    } catch (error) {
      console.error('[admin-payout-canonical] detail failed', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load payout detail' });
    }
  });

  return router;
}

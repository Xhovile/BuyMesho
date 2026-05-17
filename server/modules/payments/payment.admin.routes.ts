import express, { type RequestHandler } from 'express';
import { hasAdminAccess } from '../../auth/adminAccess.js';
import { getPaymentDb } from '../../sqlite.js';
import { payoutService } from '../payouts/payout.service.js';
import { PAYOUT_POLICY, calculatePayoutFormula, isRetryableFailureCode } from '../payouts/payout.policy.js';
import { payoutLimiter } from '../../routes/escrow/shared.js';

function jsonError(error: unknown, fallback: string): { error: string } {
  return {
    error: error instanceof Error ? error.message : fallback,
  };
}

function requireAdmin(req: express.Request, res: express.Response): boolean {
  if (!hasAdminAccess(req.user)) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeAmount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('amount must be a non-negative number');
  }
  return Math.round(parsed);
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  throw new Error('suspended must be a boolean');
}

function normalizeVerificationStatus(value: unknown): 'pending' | 'verified' | 'failed' | 'disabled' {
  const status = normalizeText(value)?.toLowerCase();
  if (status === 'pending' || status === 'verified' || status === 'failed' || status === 'disabled') {
    return status;
  }
  throw new Error('status must be one of: pending, verified, failed, disabled');
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return null;
}

function getGrossAmount(row: Record<string, unknown>): number {
  const fromColumn = Number(row.gross_amount ?? 0);
  if (Number.isFinite(fromColumn) && fromColumn > 0) {
    return Math.round(fromColumn);
  }

  const snapshot = parseJsonObject((row.raw_request as string | null | undefined) ?? null);
  const payoutFormula = snapshot?.payoutFormula && typeof snapshot.payoutFormula === 'object' ? snapshot.payoutFormula as Record<string, unknown> : null;
  const grossFromSnapshot = Number(payoutFormula?.grossAmount ?? snapshot?.releaseAmount ?? row.amount ?? 0);
  if (Number.isFinite(grossFromSnapshot) && grossFromSnapshot > 0) {
    return Math.round(grossFromSnapshot);
  }

  return Math.round(Number(row.amount ?? 0));
}

function getCurrentFormulaSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  const existingSnapshot = parseJsonObject((row.formula_snapshot as string | null | undefined) ?? null);
  if (existingSnapshot) {
    return existingSnapshot;
  }

  const rawRequest = parseJsonObject((row.raw_request as string | null | undefined) ?? null);
  const payoutFormula = rawRequest?.payoutFormula && typeof rawRequest.payoutFormula === 'object'
    ? rawRequest.payoutFormula as Record<string, unknown>
    : null;

  return payoutFormula ?? {};
}

function insertPayoutAdjustment(params: {
  payoutId: string;
  sellerId: string;
  adjustmentType: string;
  amount: number;
  currency: string;
  reason: string;
  actorType: 'admin';
  actorId: string | null;
  providerReference?: string | null;
}): number {
  const db = getPaymentDb();
  const result = db.prepare(
    `INSERT INTO payout_adjustments (
      payout_id,
      seller_id,
      adjustment_type,
      amount,
      currency,
      reason,
      actor_type,
      actor_id,
      provider_reference,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    params.payoutId,
    params.sellerId,
    params.adjustmentType,
    params.amount,
    params.currency,
    params.reason,
    params.actorType,
    params.actorId,
    params.providerReference ?? null,
    new Date().toISOString(),
  );
  return Number(result.lastInsertRowid);
}

function recalculatePayoutFinancials(row: Record<string, unknown>, next: {
  processingFeeAmount?: number;
  manualAdjustmentAmount?: number;
  reserveAmount?: number;
}): ReturnType<typeof calculatePayoutFormula> {
  const grossAmount = getGrossAmount(row);
  const currentSnapshot = getCurrentFormulaSnapshot(row);
  const processingFeeAmount = normalizeAmount(next.processingFeeAmount ?? row.processing_fee_amount ?? currentSnapshot.processingFeeAmount ?? 0);
  const manualAdjustmentAmount = normalizeAmount(next.manualAdjustmentAmount ?? row.manual_adjustment_amount ?? currentSnapshot.manualAdjustmentAmount ?? 0);
  const reserveAmount = normalizeAmount(next.reserveAmount ?? row.reserve_amount ?? currentSnapshot.reserveAmount ?? 0);

  return calculatePayoutFormula({
    grossAmount,
    processingFeeAmount,
    reserveAmount,
    manualAdjustmentAmount,
    currency: String(row.currency ?? 'MWK'),
  });
}

function addSellerPayoutAccountEvent(input: {
  sellerId: string;
  accountId: string;
  eventType: string;
  actorId: string | null;
  note?: string | null;
  payload?: Record<string, unknown> | null;
}) {
  getPaymentDb().prepare(
    `INSERT INTO seller_payout_account_events (
      seller_uid,
      account_id,
      event_type,
      actor_type,
      actor_id,
      note,
      payload,
      created_at
    ) VALUES (?, ?, ?, 'admin', ?, ?, ?, ?)`,
  ).run(
    input.sellerId,
    input.accountId,
    input.eventType,
    input.actorId,
    input.note ?? null,
    input.payload ? JSON.stringify(input.payload) : null,
    new Date().toISOString(),
  );
}

export function createPaymentAdminRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get('/payments', requireAuth, (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;

      const db = getPaymentDb();
      const rows = db.prepare(`
        SELECT
          p.id,
          p.order_id,
          p.provider,
          p.method,
          p.status AS payment_status,
          p.reference,
          p.provider_reference,
          p.currency,
          p.amount,
          p.checkout_url,
          p.paid_at,
          p.verified,
          p.verification,
          p.created_at,
          p.updated_at,
          o.status AS order_status,
          o.paid_at AS order_paid_at,
          o.fulfilled_at AS order_fulfilled_at,
          o.escrow_id,
          e.state AS escrow_state,
          e.balance_amount,
          e.balance_currency,
          e.updated_at AS escrow_updated_at
        FROM payments p
        LEFT JOIN orders o ON o.payment_reference = p.reference
        LEFT JOIN escrows e ON e.order_id = o.id
        ORDER BY p.created_at DESC
        LIMIT 200
      `).all();

      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to load payments'));
    }
  });

  router.get('/webhook-events', requireAuth, (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;

      const db = getPaymentDb();
      const rows = db.prepare(`
        SELECT id, provider, reference, event_type, signature_valid, payload, created_at
        FROM payment_webhook_events
        ORDER BY created_at DESC
        LIMIT 200
      `).all();

      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to load webhook events'));
    }
  });

  router.get('/payment-summary', requireAuth, (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;

      const db = getPaymentDb();
      const summary = db.prepare(`
        SELECT
          COUNT(*) AS total_payments,
          SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) AS verified_payments,
          SUM(CASE WHEN status IN ('captured', 'paid') THEN 1 ELSE 0 END) AS paid_payments,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_payments
        FROM payments
      `).get();

      const webhookSummary = db.prepare(`
        SELECT
          COUNT(*) AS total_webhooks,
          SUM(CASE WHEN signature_valid = 1 THEN 1 ELSE 0 END) AS valid_webhooks,
          SUM(CASE WHEN signature_valid = 0 THEN 1 ELSE 0 END) AS invalid_webhooks
        FROM payment_webhook_events
      `).get();

      return res.status(200).json({ summary, webhookSummary });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to load payment summary'));
    }
  });

  router.get('/payouts', requireAuth, (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;

      const db = getPaymentDb();
      const rows = db.prepare(`
        SELECT
          p.id,
          p.seller_id AS sellerId,
          p.order_id AS orderId,
          p.escrow_id AS escrowId,
          p.release_entry_id AS releaseEntryId,
          p.amount,
          p.currency,
           p.status,
           p.provider,
           p.provider_charge_id AS providerChargeId,
           p.provider_ref_id AS providerReference,
           p.provider_transaction_id AS providerTransactionId,
           p.provider_status AS providerStatus,
            p.processed_by AS processedBy,
           p.approved_by AS approvedBy,
           p.destination_account_id AS destinationAccountId,
           spa.masked_account AS destinationMaskedAccount,
           spa.destination_type AS destinationType,
           spa.verification_status AS destinationVerificationStatus,
           spa.is_active AS destinationIsActive,
           spa.last_error AS destinationLastError,
           s.is_suspended AS sellerSuspended,
           p.failure_reason AS failureReason,
           p.manual_review_reason AS manualReviewReason,
          p.requested_by AS requestedBy,
          p.requested_at AS requestedAt,
          p.sent_at AS sentAt,
          p.paid_at AS paidAt,
          p.failed_at AS failedAt,
          p.created_at AS createdAt,
          p.updated_at AS updatedAt,
          p.gross_amount AS grossAmount,
          p.platform_fee_amount AS platformFeeAmount,
          p.processing_fee_amount AS processingFeeAmount,
          p.reserve_amount AS reserveAmount,
          p.reserve_cap_amount AS reserveCapAmount,
          p.manual_adjustment_amount AS manualAdjustmentAmount,
          p.net_amount AS netAmount,
          p.formula_snapshot AS formulaSnapshot,
          p.last_adjustment_id AS lastAdjustmentId,
          (SELECT COALESCE(MAX(attempt_no), 0) FROM payout_attempts pa WHERE pa.payout_id = p.id) AS attemptCount,
          (SELECT MAX(attempt_no) FROM payout_attempts pa WHERE pa.payout_id = p.id) AS latestAttemptNo,
           (SELECT status FROM payout_attempts pa WHERE pa.payout_id = p.id ORDER BY pa.attempt_no DESC LIMIT 1) AS latestAttemptStatus,
           (SELECT created_at FROM payout_attempts pa WHERE pa.payout_id = p.id ORDER BY pa.attempt_no DESC LIMIT 1) AS latestAttemptAt,
           (SELECT failure_reason FROM payout_attempts pa WHERE pa.payout_id = p.id ORDER BY pa.attempt_no DESC LIMIT 1) AS latestAttemptFailureReason,
           (SELECT event_type FROM payout_events pe WHERE pe.payout_id = p.id AND pe.event_type IN ('payout_reconciled', 'payout_webhook_duplicate', 'payout_webhook_rejected') ORDER BY pe.created_at DESC LIMIT 1) AS latestWebhookEventType,
           (SELECT created_at FROM payout_events pe WHERE pe.payout_id = p.id AND pe.event_type IN ('payout_reconciled', 'payout_webhook_duplicate', 'payout_webhook_rejected') ORDER BY pe.created_at DESC LIMIT 1) AS latestWebhookEventAt,
           (SELECT event_type FROM payout_events pe WHERE pe.payout_id = p.id ORDER BY pe.created_at DESC LIMIT 1) AS latestAuditEventType,
           (SELECT created_at FROM payout_events pe WHERE pe.payout_id = p.id ORDER BY pe.created_at DESC LIMIT 1) AS latestAuditEventAt,
           (SELECT COUNT(*) FROM payout_events pe WHERE pe.payout_id = p.id) AS auditEventCount,
           (SELECT COUNT(*) FROM payout_adjustments pa WHERE pa.payout_id = p.id) AS adjustmentCount,
           (
             SELECT details
             FROM admin_actions aa
             WHERE aa.target_type = 'seller'
               AND aa.target_id = p.seller_id
               AND aa.action_type IN ('suspend_payouts', 'unsuspend_payouts')
             ORDER BY aa.created_at DESC, aa.id DESC
             LIMIT 1
           ) AS latestSellerPayoutControlDetails
        FROM payouts p
        LEFT JOIN seller_payout_accounts spa ON spa.id = p.destination_account_id
        LEFT JOIN sellers s ON s.uid = p.seller_id
        ORDER BY p.created_at DESC
        LIMIT 200
      `).all();
      const shapedRows = (rows as Array<Record<string, unknown>>).map((row) => {
        const status = String(row.status ?? '').toLowerCase();
        const failureReason = (row.failureReason as string | null) ?? null;
        const attemptCount = Number(row.attemptCount ?? 0);
        const destinationVerificationStatus = String(row.destinationVerificationStatus ?? 'missing').toLowerCase();
        const destinationActive = Number(row.destinationIsActive ?? 0) === 1;
        const sellerSuspended = Number(row.sellerSuspended ?? 0) === 1;
        const verificationBlockers = [];
        if (sellerSuspended) {
          verificationBlockers.push('Seller payouts are suspended');
        }
        if (destinationVerificationStatus !== 'verified' || !destinationActive) {
          verificationBlockers.push(
            destinationVerificationStatus === 'failed'
              ? 'Destination verification failed'
              : destinationVerificationStatus === 'disabled' || !destinationActive
                ? 'Destination is disabled'
                : 'Destination pending verification',
          );
        }
        const retryEligible =
          status === 'failed' &&
          attemptCount < PAYOUT_POLICY.maxRetryCount &&
          isRetryableFailureCode(failureReason) &&
          !sellerSuspended &&
          destinationVerificationStatus === 'verified' &&
          destinationActive;
        const holdReason = status === 'held' ? (row.manualReviewReason as string | null) ?? null : null;
        const auditSummary = {
          totalEvents: Number(row.auditEventCount ?? 0),
          latestEventType: (row.latestAuditEventType as string | null) ?? null,
          latestEventAt: (row.latestAuditEventAt as string | null) ?? null,
        };
        return {
          ...row,
          currentState: status,
          attemptCount,
          destinationVerificationStatus,
          destinationActive,
          sellerSuspended,
          verificationBlockers,
          lastError: failureReason ?? (row.latestAttemptFailureReason as string | null) ?? null,
          holdReason,
          retryEligible,
          retryBlockedReason: retryEligible
            ? null
            : destinationVerificationStatus !== 'verified' || !destinationActive
              ? 'Destination pending verification'
              : status !== 'failed'
                ? `Retry unavailable while payout is ${status}`
                : 'Retry unavailable due to policy gate',
          auditSummary,
        };
      });

      return res.status(200).json(shapedRows);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to load payout queue'));
    }
  });

  router.post('/payouts/destinations/:destinationId/verification', payoutLimiter, requireAuth, (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;

      const destinationId = String(req.params.destinationId || '').trim();
      if (!destinationId) {
        return res.status(400).json({ error: 'destinationId is required' });
      }

      const status = normalizeVerificationStatus(req.body?.status);
      const reason = normalizeText(req.body?.reason);
      const actorId = String(req.user?.uid || 'admin').trim();
      const now = new Date().toISOString();
      const db = getPaymentDb();
      const destination = db.prepare(
        `SELECT id, seller_uid, verification_status, is_active
         FROM seller_payout_accounts
         WHERE id = ?
         LIMIT 1`,
      ).get(destinationId) as { id: string; seller_uid: string; verification_status: string; is_active: number } | undefined;

      if (!destination) {
        return res.status(404).json({ error: 'Payout destination not found' });
      }

      const nextActive = status === 'disabled' ? 0 : 1;
      const nextVerifiedAt = status === 'verified' ? now : null;
      const nextLastError = status === 'failed' || status === 'disabled' ? reason : null;
      const nextAttempts = status === 'failed'
        ? Number(
            (db.prepare(`SELECT verification_attempts FROM seller_payout_accounts WHERE id = ?`).get(destinationId) as { verification_attempts?: number } | undefined)?.verification_attempts ?? 0,
          ) + 1
        : 0;

      db.prepare(
        `UPDATE seller_payout_accounts
         SET verification_status = ?,
             is_active = ?,
             verification_attempts = ?,
             last_error = ?,
             verified_at = ?,
             updated_at = ?
         WHERE id = ?`,
      ).run(
        status,
        nextActive,
        nextAttempts,
        nextLastError,
        nextVerifiedAt,
        now,
        destinationId,
      );

      addSellerPayoutAccountEvent({
        sellerId: destination.seller_uid,
        accountId: destinationId,
        eventType: `destination_${status}`,
        actorId,
        note: reason,
        payload: {
          previousStatus: destination.verification_status,
          nextStatus: status,
          active: nextActive === 1,
        },
      });

      const updated = db.prepare(
        `SELECT
           id,
           seller_uid AS sellerId,
           verification_status AS verificationStatus,
           verification_attempts AS verificationAttempts,
           last_error AS lastError,
           verified_at AS verifiedAt,
           is_active AS isActive,
           updated_at AS updatedAt
         FROM seller_payout_accounts
         WHERE id = ?
         LIMIT 1`,
      ).get(destinationId);

      return res.status(200).json({ destination: updated });
    } catch (error) {
      return res.status(400).json(jsonError(error, 'Failed to update payout destination verification'));
    }
  });

  router.post('/payouts/sellers/:sellerId/suspension', payoutLimiter, requireAuth, (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;

      const sellerId = String(req.params.sellerId || '').trim();
      if (!sellerId) {
        return res.status(400).json({ error: 'sellerId is required' });
      }

      const suspended = normalizeBoolean(req.body?.suspended);
      const reason = normalizeText(req.body?.reason);
      if (!reason) {
        return res.status(400).json({ error: 'reason is required' });
      }

      const actorId = String(req.user?.uid || 'admin').trim();
      const db = getPaymentDb();
      const seller = db.prepare(
        `SELECT uid, is_suspended AS isSuspended
         FROM sellers
         WHERE uid = ?
         LIMIT 1`,
      ).get(sellerId) as { uid: string; isSuspended: number } | undefined;

      if (!seller) {
        return res.status(404).json({ error: 'Seller not found' });
      }

      db.prepare(`UPDATE sellers SET is_suspended = ? WHERE uid = ?`).run(suspended ? 1 : 0, sellerId);
      db.prepare(
        `INSERT INTO admin_actions (
          admin_uid,
          admin_email,
          action_type,
          target_type,
          target_id,
          details,
          created_at
        ) VALUES (?, ?, ?, 'seller', ?, ?, ?)`,
      ).run(
        actorId,
        req.user?.email ?? null,
        suspended ? 'suspend_payouts' : 'unsuspend_payouts',
        sellerId,
        JSON.stringify({ reason }),
        new Date().toISOString(),
      );

      const activePayouts = db.prepare(
        `SELECT id
         FROM payouts
         WHERE seller_id = ?
           AND status IN ('eligible', 'queued', 'processing', 'pending', 'failed', 'held')`,
      ).all(sellerId) as Array<{ id: string }>;

      for (const payout of activePayouts) {
        payoutService.addEvent({
          payoutId: payout.id,
          sellerId,
          eventType: suspended ? 'seller_payouts_suspended' : 'seller_payouts_unsuspended',
          actorType: 'admin',
          actorId,
          note: reason,
          payload: { suspended },
        });
        if (suspended) {
          db.prepare(
            `UPDATE payouts
             SET status = 'held',
                 failure_reason = 'seller_suspended',
                 manual_review_reason = ?,
                 updated_at = ?
             WHERE id = ?
               AND status <> 'paid'
               AND status <> 'cancelled'`,
          ).run(reason, new Date().toISOString(), payout.id);
        }
      }

      return res.status(200).json({
        sellerId,
        suspended,
        reason,
      });
    } catch (error) {
      return res.status(400).json(jsonError(error, 'Failed to update seller payout suspension'));
    }
  });

  router.get('/payouts/summary', requireAuth, (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;
      const db = getPaymentDb();
      const summary = db.prepare(`
        SELECT
          COUNT(*) AS totalPayouts,
          SUM(CASE WHEN status IN ('eligible', 'queued', 'processing', 'pending', 'held') THEN 1 ELSE 0 END) AS pendingPayouts,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paidPayouts,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failedPayouts,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledPayouts
        FROM payouts
      `).get();

      const attempts = db.prepare(`
        SELECT
          COUNT(*) AS totalAttempts,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS successfulAttempts,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failedAttempts
        FROM payout_attempts
      `).get();

      return res.status(200).json({ summary, attempts });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to load payout summary'));
    }
  });

  router.get('/payouts/:payoutId/adjustments', requireAuth, (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;
      const payoutId = String(req.params.payoutId || '').trim();
      if (!payoutId) {
        return res.status(400).json({ error: 'payoutId is required' });
      }
      const db = getPaymentDb();
      const rows = db.prepare(
        `SELECT id, payout_id AS payoutId, seller_id AS sellerId, adjustment_type AS adjustmentType, amount, currency, reason, actor_type AS actorType, actor_id AS actorId, provider_reference AS providerReference, created_at AS createdAt
         FROM payout_adjustments
         WHERE payout_id = ?
         ORDER BY created_at DESC, id DESC`,
      ).all(payoutId);
      return res.status(200).json({ adjustments: rows });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to load payout adjustments'));
    }
  });

  router.post('/payouts/:payoutId/adjustments', requireAuth, (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;

      const payoutId = String(req.params.payoutId || '').trim();
      if (!payoutId) {
        return res.status(400).json({ error: 'payoutId is required' });
      }

      const adjustmentType = normalizeText(req.body?.adjustmentType)?.toLowerCase();
      if (adjustmentType !== 'processing_fee' && adjustmentType !== 'manual_adjustment') {
        return res.status(400).json({ error: 'adjustmentType must be processing_fee or manual_adjustment' });
      }

      const reason = normalizeText(req.body?.reason);
      if (!reason) {
        return res.status(400).json({ error: 'reason is required' });
      }

      const amount = normalizeAmount(req.body?.amount);
      const providerReference = normalizeText(req.body?.providerReference);
      const actorId = String(req.user?.uid || 'admin').trim();
      const db = getPaymentDb();
      const payoutRow = db.prepare(`SELECT * FROM payouts WHERE id = ? LIMIT 1`).get(payoutId) as Record<string, unknown> | undefined;
      if (!payoutRow) {
        return res.status(404).json({ error: 'Payout not found' });
      }

      const currentStatus = String(payoutRow.status ?? '').toLowerCase();
      if (currentStatus === 'paid' || currentStatus === 'cancelled') {
        return res.status(400).json({ error: `Cannot adjust a payout that is ${currentStatus}` });
      }
      if (currentStatus === 'processing') {
        return res.status(400).json({ error: 'Cannot adjust a payout while processing' });
      }

      const currentProcessingFeeAmount = Number(payoutRow.processing_fee_amount ?? 0);
      const currentManualAdjustmentAmount = Number(payoutRow.manual_adjustment_amount ?? 0);
      const nextProcessingFeeAmount = adjustmentType === 'processing_fee'
        ? currentProcessingFeeAmount + amount
        : currentProcessingFeeAmount;
      const nextManualAdjustmentAmount = adjustmentType === 'manual_adjustment'
        ? currentManualAdjustmentAmount + amount
        : currentManualAdjustmentAmount;

      const recalculated = recalculatePayoutFinancials(payoutRow, {
        processingFeeAmount: nextProcessingFeeAmount,
        manualAdjustmentAmount: nextManualAdjustmentAmount,
      });
      const adjustmentId = insertPayoutAdjustment({
        payoutId,
        sellerId: String(payoutRow.seller_id ?? ''),
        adjustmentType,
        amount,
        currency: String(payoutRow.currency ?? 'MWK'),
        reason,
        actorType: 'admin',
        actorId,
        providerReference,
      });

      db.prepare(
        `UPDATE payouts
         SET gross_amount = ?,
             platform_fee_amount = ?,
             processing_fee_amount = ?,
             reserve_amount = ?,
             reserve_cap_amount = ?,
             manual_adjustment_amount = ?,
             net_amount = ?,
             amount = ?,
             formula_snapshot = ?,
             last_adjustment_id = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      ).run(
        recalculated.grossAmount,
        recalculated.platformFeeAmount,
        recalculated.processingFeeAmount,
        recalculated.reserveAmount,
        recalculated.reserveCapAmount,
        recalculated.manualAdjustmentAmount,
        recalculated.netAmount,
        recalculated.netAmount,
        JSON.stringify(recalculated),
        adjustmentId,
        payoutId,
      );

      payoutService.addEvent({
        payoutId,
        sellerId: String(payoutRow.seller_id ?? ''),
        eventType: 'payout_adjusted',
        actorType: 'admin',
        actorId,
        note: reason,
        payload: {
          adjustmentId,
          adjustmentType,
          amount,
          providerReference,
          recalculated,
        },
      });

      const updated = db.prepare(`SELECT * FROM payouts WHERE id = ? LIMIT 1`).get(payoutId) as Record<string, unknown> | undefined;
      return res.status(200).json({
        payout: updated,
        adjustment: {
          id: adjustmentId,
          payoutId,
          sellerId: String(payoutRow.seller_id ?? ''),
          adjustmentType,
          amount,
          currency: String(payoutRow.currency ?? 'MWK'),
          reason,
          actorType: 'admin',
          actorId,
          providerReference,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to create payout adjustment'));
    }
  });

  router.post('/payouts/:payoutId/reconcile', requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;

      const payoutId = String(req.params.payoutId || '').trim();
      if (!payoutId) {
        return res.status(400).json({ error: 'payoutId is required' });
      }

      const actorId = String(req.user?.uid || 'admin').trim();
      const result = await payoutService.reconcilePayoutStatus({
        payoutId,
        actorType: 'admin',
        actorId,
      });

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json(jsonError(error, 'Failed to reconcile payout status'));
    }
  });

  router.post('/payouts/reconcile-pending', requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;

      const actorId = String(req.user?.uid || 'admin').trim();
      const limit = req.body?.limit;
      const results = await payoutService.reconcilePendingPayoutStatuses({
        actorType: 'admin',
        actorId,
        limit: typeof limit === 'number' ? limit : Number(limit),
      });

      return res.status(200).json({
        count: results.length,
        results,
      });
    } catch (error) {
      return res.status(400).json(jsonError(error, 'Failed to reconcile pending payouts'));
    }
  });

  router.post('/payouts/:payoutId/retry', requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;

      const payoutId = String(req.params.payoutId || '').trim();
      if (!payoutId) {
        return res.status(400).json({ error: 'payoutId is required' });
      }

      const actorId = String(req.user?.uid || 'admin').trim();

      const result = await payoutService.executePayout({
        payoutId,
        actorType: 'admin',
        actorId,
      });

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to retry payout'));
    }
  });

  return router;
}

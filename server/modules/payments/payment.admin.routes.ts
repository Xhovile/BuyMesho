import express, { type RequestHandler } from 'express';
import { hasAdminAccess } from '../../auth/adminAccess.js';
import { getPaymentDb } from '../../sqlite.js';
import { payoutService } from '../payouts/payout.service.js';

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
          p.provider_status AS providerStatus,
          p.destination_account_id AS destinationAccountId,
          spa.masked_account AS destinationMaskedAccount,
          spa.destination_type AS destinationType,
          spa.verification_status AS destinationVerificationStatus,
          p.failure_reason AS failureReason,
          p.manual_review_reason AS manualReviewReason,
          p.requested_by AS requestedBy,
          p.requested_at AS requestedAt,
          p.sent_at AS sentAt,
          p.paid_at AS paidAt,
          p.failed_at AS failedAt,
          p.created_at AS createdAt,
          p.updated_at AS updatedAt,
          (SELECT MAX(attempt_no) FROM payout_attempts pa WHERE pa.payout_id = p.id) AS latestAttemptNo,
          (SELECT status FROM payout_attempts pa WHERE pa.payout_id = p.id ORDER BY pa.attempt_no DESC LIMIT 1) AS latestAttemptStatus,
          (SELECT created_at FROM payout_attempts pa WHERE pa.payout_id = p.id ORDER BY pa.attempt_no DESC LIMIT 1) AS latestAttemptAt
        FROM payouts p
        LEFT JOIN seller_payout_accounts spa ON spa.id = p.destination_account_id
        ORDER BY p.created_at DESC
        LIMIT 200
      `).all();

      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to load payout queue'));
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

  router.post('/payouts/:payoutId/mark-paid', requireAuth, (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;
      const payoutId = String(req.params.payoutId || '').trim();
      const actorId = String(req.user?.uid || 'admin').trim();
      const payout = payoutService.markPaid(payoutId, actorId, String(req.body?.note || '').trim() || undefined);
      if (!payout) return res.status(404).json({ error: 'Payout not found' });
      return res.status(200).json({ payout });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to mark payout paid'));
    }
  });

  router.post('/payouts/:payoutId/mark-failed', requireAuth, (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;
      const payoutId = String(req.params.payoutId || '').trim();
      const reason = String(req.body?.reason || '').trim();
      if (!reason) return res.status(400).json({ error: 'reason is required' });
      const actorId = String(req.user?.uid || 'admin').trim();
      const payout = payoutService.markFailed(payoutId, actorId, reason);
      if (!payout) return res.status(404).json({ error: 'Payout not found' });
      return res.status(200).json({ payout });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to mark payout failed'));
    }
  });

  router.post('/payouts/:payoutId/hold', requireAuth, (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;
      const payoutId = String(req.params.payoutId || '').trim();
      const reason = String(req.body?.reason || '').trim();
      if (!reason) return res.status(400).json({ error: 'reason is required' });
      const actorId = String(req.user?.uid || 'admin').trim();
      const payout = payoutService.markHeld(payoutId, actorId, reason);
      if (!payout) return res.status(404).json({ error: 'Payout not found' });
      return res.status(200).json({ payout });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to hold payout'));
    }
  });

  return router;
}

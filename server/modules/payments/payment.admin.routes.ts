import express, { type RequestHandler } from 'express';
import { getPaymentDb } from '../../sqlite.js';

function jsonError(error: unknown, fallback: string): { error: string } {
  return {
    error: error instanceof Error ? error.message : fallback,
  };
}

export function createPaymentAdminRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get('/payments', requireAuth, (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({
          error: 'Admin access required',
        });
      }

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
        LEFT JOIN orders o
          ON o.payment_reference = p.reference
        LEFT JOIN escrows e
          ON e.order_id = o.id

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
      if (!req.user?.is_admin) {
        return res.status(403).json({
          error: 'Admin access required',
        });
      }

      const db = getPaymentDb();

      const rows = db.prepare(`
        SELECT
          id,
          provider,
          reference,
          event_type,
          signature_valid,
          payload,
          created_at

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
      if (!req.user?.is_admin) {
        return res.status(403).json({
          error: 'Admin access required',
        });
      }

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

      return res.status(200).json({
        summary,
        webhookSummary,
      });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to load payment summary'));
    }
  });

  return router;
}

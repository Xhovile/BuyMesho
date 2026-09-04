import express, { type RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { query, withTransaction } from '../../postgres.js';
import { escrowRepository } from '../../modules/escrow/escrow.repository.js';
import { serverOrderService } from '../../modules/orders/order.service.js';
import { notifyOrderDisputed } from '../../modules/notifications/order-disputed.notification.js';
import { assertAllowedDisputeTransition, type DisputeStatus } from './disputeState.js';
import { ensureDisputeWorkflowFoundation } from '../../db/migrations/20260904_dispute_workflow_foundation.js';
import {
  assertOrderAccessAsync,
  disputeLimiter,
  jsonError,
} from './shared.js';

function configuredDisputeWindowEnd(from: Date): string | null {
  const raw = process.env.BUYMESHO_DISPUTE_WINDOW_DAYS?.trim();
  if (!raw) return null;
  const days = Number(raw);
  if (!Number.isFinite(days) || days <= 0) return null;
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeRequestedResolution(value: unknown): 'refund' | 'return' | 'return_and_refund' | 'review' {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'refund') return 'refund';
  if (normalized === 'return') return 'return';
  if (normalized === 'return_and_refund') return 'return_and_refund';
  return 'review';
}

function normalizeRequestType(value: unknown): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  const allowed = new Set([
    'buyer_cancellation',
    'seller_failed_to_fulfill',
    'product_item_problem',
    'delivery_failure',
    'payment_platform_error',
    'exceptional_dispute',
  ]);
  return allowed.has(normalized) ? normalized : 'exceptional_dispute';
}

async function resolveTicketToOrder(ticketId: string): Promise<{ ticketId: string; orderId: string } | null> {
  const result = await query<{ id?: string; order_id?: string }>(
    `SELECT id, order_id
     FROM event_tickets
     WHERE id = $1 OR code = $1
     LIMIT 1`,
    [ticketId],
  );

  const row = result.rows[0];
  if (!row?.id || !row.order_id) return null;
  return { ticketId: String(row.id), orderId: String(row.order_id) };
}

export function createDisputeRouter(requireAuth: RequestHandler): express.Router {
  ensureDisputeWorkflowFoundation();
  const router = express.Router();

  router.post('/', disputeLimiter, requireAuth, async (req, res) => {
    try {
      const {
        orderId: requestedOrderId,
        ticketId: requestedTicketId,
        reason,
        requestType,
        requestedResolution,
        amountRequested,
        paymentMethod,
        refundDestination,
        evidence,
      } = req.body as {
        orderId?: string;
        ticketId?: string;
        reason?: string;
        requestType?: string;
        requestedResolution?: string;
        amountRequested?: number | string;
        paymentMethod?: string;
        refundDestination?: string;
        evidence?: unknown[];
      };

      const orderId = requestedOrderId?.trim() || '';
      const ticketIdInput = requestedTicketId?.trim() || '';
      if ((!orderId && !ticketIdInput) || !reason?.trim()) {
        return res.status(400).json({ error: 'ticketId or orderId, and reason are required' });
      }

      let resolvedTicketId: string | null = null;
      let resolvedOrderId = orderId;

      if (ticketIdInput) {
        const resolved = await resolveTicketToOrder(ticketIdInput);
        if (!resolved) return res.status(404).json({ error: 'Event ticket not found' });
        resolvedTicketId = resolved.ticketId;
        resolvedOrderId = resolved.orderId;
      }

      if (!resolvedOrderId) {
        return res.status(400).json({ error: 'A valid order or ticket is required' });
      }

      const access = await assertOrderAccessAsync(req, resolvedOrderId);
      if ('error' in access) return res.status(access.error.status).json(access.error.body);

      const openedBy = req.user!.uid;
      const now = new Date();
      const nowIso = now.toISOString();
      const windowEndsAt = configuredDisputeWindowEnd(now);
      const canonicalRequestType = normalizeRequestType(requestType);
      const canonicalResolution = normalizeRequestedResolution(requestedResolution);
      const requestedAmount = Number(amountRequested ?? 0);
      if (!Number.isFinite(requestedAmount) || requestedAmount < 0) {
        return res.status(400).json({ error: 'amountRequested must be a non-negative number' });
      }
      const safeEvidence = Array.isArray(evidence)
        ? evidence.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, 20)
        : [];

      const result = await withTransaction(async (client) => {
        const orderResult = await client.query<Record<string, unknown>>(
          `SELECT id, buyer_id, seller_id, status, escrow_id, total_amount, total_currency
           FROM orders WHERE id = $1 LIMIT 1`,
          [resolvedOrderId],
        );
        const order = orderResult.rows[0];
        if (!order) throw new Error('Order not found');
        if (String(order.buyer_id) !== openedBy && !req.user?.is_admin) throw new Error('Order access denied');

        const existingCaseResult = await client.query<Record<string, unknown>>(
          `SELECT * FROM dispute_cases
           WHERE order_id = $1 AND status IN ('open', 'under_review')
           ORDER BY created_at ASC LIMIT 1`,
          [resolvedOrderId],
        );
        const existingCase = existingCaseResult.rows[0];
        const caseId = existingCase?.id ? String(existingCase.id) : `case_${randomUUID()}`;

        if (!existingCase) {
          await client.query(
            `INSERT INTO dispute_cases (
              id, order_id, buyer_id, seller_id, opened_by, status, opened_at,
              window_ends_at, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,'open',$6,$7,$6,$6)`,
            [caseId, resolvedOrderId, String(order.buyer_id), String(order.seller_id), openedBy, nowIso, windowEndsAt],
          );
        } else if (windowEndsAt && !existingCase.window_ends_at) {
          await client.query(
            `UPDATE dispute_cases SET window_ends_at = $1, updated_at = $2 WHERE id = $3`,
            [windowEndsAt, nowIso, caseId],
          );
        }

        const attemptId = `attempt_${randomUUID()}`;
        await client.query(
          `INSERT INTO dispute_attempts (
            id, case_id, order_id, request_type, requested_resolution, reason,
            amount_requested, evidence, submitted_by, status, window_ends_at,
            created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'$9',$10,$11,$12,$12)`,
          [
            attemptId,
            caseId,
            resolvedOrderId,
            canonicalRequestType,
            canonicalResolution,
            reason.trim(),
            requestedAmount,
            JSON.stringify(safeEvidence),
            openedBy,
            'open',
            windowEndsAt,
            nowIso,
          ],
        );

        let refundRequestId: string | null = null;
        if (canonicalResolution === 'refund' || canonicalResolution === 'return_and_refund') {
          refundRequestId = `refund_${randomUUID()}`;
          await client.query(
            `INSERT INTO refund_requests (
              id, order_id, buyer_id, seller_id, item_id, dispute_case_id,
              request_type, requested_resolution, reason, amount_requested, currency,
              payment_method, refund_destination, order_state_snapshot,
              escrow_state_snapshot, payout_state_snapshot, evidence, buyer_comments,
              status, submitted_at, window_ends_at, created_at, updated_at
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
              'requested',$19,$20,$19,$19
            )`,
            [
              refundRequestId,
              resolvedOrderId,
              String(order.buyer_id),
              String(order.seller_id),
              resolvedTicketId,
              caseId,
              canonicalRequestType,
              canonicalResolution,
              reason.trim(),
              requestedAmount,
              String(order.total_currency ?? 'MWK'),
              paymentMethod?.trim() || null,
              refundDestination?.trim() || null,
              String(order.status ?? 'pending'),
              null,
              null,
              JSON.stringify(safeEvidence),
              reason.trim(),
              nowIso,
              windowEndsAt,
            ],
          );
          await client.query(
            `UPDATE dispute_attempts
             SET updated_at = $1
             WHERE id = $2`,
            [nowIso, attemptId],
          );
        }

        await client.query(
          `INSERT INTO audit_events (
            id, entity_type, entity_id, event_type, performed_by,
            timestamp, previous_state, new_state, metadata
          ) VALUES ($1,'dispute_case',$2,'dispute_submitted',$3,$4,NULL,'open',$5)`,
          [
            `audit_${randomUUID()}`,
            caseId,
            openedBy,
            nowIso,
            JSON.stringify({
              attemptId,
              orderId: resolvedOrderId,
              ticketId: resolvedTicketId,
              requestType: canonicalRequestType,
              requestedResolution: canonicalResolution,
              refundRequestId,
            }),
          ],
        );

        const createdCase = await client.query<Record<string, unknown>>('SELECT * FROM dispute_cases WHERE id = $1', [caseId]);
        const createdAttempt = await client.query<Record<string, unknown>>('SELECT * FROM dispute_attempts WHERE id = $1', [attemptId]);
        return { case: createdCase.rows[0], attempt: createdAttempt.rows[0], refundRequestId };
      });

      try {
        const orderResult = await query<{ buyer_id?: string; seller_id?: string }>(
          'SELECT buyer_id, seller_id FROM orders WHERE id = $1 LIMIT 1',
          [resolvedOrderId],
        );
        const order = orderResult.rows[0];
        if (order?.buyer_id && order.seller_id) {
          await notifyOrderDisputed({
            orderId: resolvedOrderId,
            disputeId: String(result.case?.id ?? result.attempt?.id ?? ''),
            buyerId: String(order.buyer_id),
            sellerId: String(order.seller_id),
            reason: reason.trim(),
          });
        }
      } catch (notificationError) {
        console.warn('Failed to send disputed-order notification:', notificationError);
      }

      return res.status(201).json({
        caseId: result.case?.id,
        attemptId: result.attempt?.id,
        refundRequestId: result.refundRequestId,
        orderId: resolvedOrderId,
        ticketId: resolvedTicketId,
        requestType: canonicalRequestType,
        requestedResolution: canonicalResolution,
        status: result.case?.status ?? 'open',
        windowEndsAt: result.case?.window_ends_at ?? windowEndsAt,
      });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to open dispute'));
    }
  });

  router.get('/me', disputeLimiter, requireAuth, async (req, res) => {
    try {
      const result = await query<Record<string, unknown>>(
        `SELECT dc.*, da.id AS latest_attempt_id, da.request_type AS latest_request_type,
                da.requested_resolution AS latest_requested_resolution, da.reason AS latest_reason,
                da.status AS latest_attempt_status, da.created_at AS latest_attempt_created_at
         FROM dispute_cases dc
         LEFT JOIN LATERAL (
           SELECT * FROM dispute_attempts
           WHERE case_id = dc.id ORDER BY created_at DESC LIMIT 1
         ) da ON true
         WHERE dc.buyer_id = $1
         ORDER BY dc.updated_at DESC`,
        [req.user!.uid],
      );
      return res.status(200).json(result.rows);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch disputes'));
    }
  });

  router.get('/ticket/:ticketId', disputeLimiter, requireAuth, async (req, res) => {
    try {
      const ticket = await resolveTicketToOrder(String(req.params.ticketId ?? '').trim());
      if (!ticket) return res.status(404).json({ error: 'Event ticket not found' });

      const access = await assertOrderAccessAsync(req, ticket.orderId);
      if ('error' in access) return res.status(access.error.status).json(access.error.body);

      const result = await query<Record<string, unknown>>(
        `SELECT * FROM disputes
         WHERE ticket_id = $1
            OR (ticket_id IS NULL AND order_id = $2)
         ORDER BY CASE WHEN ticket_id = $1 THEN 0 ELSE 1 END, created_at DESC
         LIMIT 1`,
        [ticket.ticketId, ticket.orderId],
      );

      const dispute = result.rows[0];
      if (!dispute) return res.status(404).json({ error: 'No dispute found for this ticket' });
      return res.status(200).json(dispute);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch dispute for ticket'));
    }
  });

  router.get('/:orderId', disputeLimiter, requireAuth, async (req, res) => {
    try {
      const access = await assertOrderAccessAsync(req, req.params.orderId);
      if ('error' in access) return res.status(access.error.status).json(access.error.body);

      const result = await query<Record<string, unknown>>(
        'SELECT * FROM disputes WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
        [req.params.orderId],
      );

      const dispute = result.rows[0];
      if (!dispute) return res.status(404).json({ error: 'No dispute found for this order' });
      return res.status(200).json(dispute);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch dispute'));
    }
  });

  router.patch('/:id', disputeLimiter, requireAuth, async (req, res) => {
    try {
      if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin access required' });

      const { status, resolutionNote } = req.body as { status?: string; resolutionNote?: string };
      if (!status || !['resolved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'status must be "resolved" or "rejected"' });
      }

      const disputeResult = await query<Record<string, unknown>>(
        'SELECT * FROM disputes WHERE id = $1 LIMIT 1',
        [req.params.id],
      );
      const existing = disputeResult.rows[0];
      if (!existing) return res.status(404).json({ error: 'Dispute not found' });

      assertAllowedDisputeTransition(existing.status as DisputeStatus, status as DisputeStatus);

      const orderId = String(existing.order_id ?? '').trim();
      if (!orderId) return res.status(400).json({ error: 'Dispute is not attached to an order' });

      const orderResult = await query<{ status?: string }>(
        'SELECT status FROM orders WHERE id = $1 LIMIT 1',
        [orderId],
      );
      const order = orderResult.rows[0];
      const escrow = await escrowRepository.findByOrderIdAsync(orderId);

      if (!resolutionNote?.trim()) {
        return res.status(400).json({ error: 'resolutionNote is required when resolving a dispute' });
      }

      if (status === 'resolved' && !(order?.status === 'refunded' && escrow?.state === 'refunded')) {
        return res.status(409).json({ error: 'Resolve the dispute through the escrow refund action first.' });
      }

      if (status === 'rejected' && !(order?.status === 'fulfilled' && escrow?.state === 'released')) {
        return res.status(409).json({ error: 'Reject the dispute only after escrow has been released to the seller.' });
      }

      const now = new Date().toISOString();
      await query(
        `UPDATE disputes
         SET status = $1,
             resolved_by = $2,
             resolution_note = $3,
             updated_at = $4,
             resolved_at = $4
         WHERE id = $5`,
        [status, req.user.uid, resolutionNote.trim(), now, req.params.id],
      );

      const updatedResult = await query<Record<string, unknown>>(
        'SELECT * FROM disputes WHERE id = $1',
        [req.params.id],
      );

      return res.status(200).json(updatedResult.rows[0]);
    } catch (error) {
      return res.status(400).json(jsonError(error, 'Failed to resolve dispute'));
    }
  });

  return router;
}

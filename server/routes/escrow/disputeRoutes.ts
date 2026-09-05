import express, { type RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { query, withTransaction } from '../../postgres.js';
import { escrowRepository } from '../../modules/escrow/escrow.repository.js';
import { notifyDisputeWorkflowEvent } from '../../modules/notifications/dispute-workflow.notification.js';
import { assertAllowedDisputeTransition, type DisputeStatus } from './disputeState.js';
import { ensureDisputeWorkflowFoundation } from '../../db/migrations/20260904_dispute_workflow_foundation.js';
import { assertOrderAccessAsync, disputeLimiter, jsonError } from './shared.js';

const POST_DELIVERY_DISPUTE_WINDOW_DAYS = 30;
const SETTLED_OUTCOMES = new Set(['refunded', 'returned', 'seller_refund_confirmed', 'seller_refund_accepted', 'return', 'return_and_refund', 'seller_replacement_confirmed', 'seller_replacement_committed', 'seller_rejected', 'seller_dispute_rejected']);

function addDays(from: Date, days: number): string {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}
function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
  const allowed = new Set(['buyer_cancellation','seller_failed_to_fulfill','product_item_problem','delivery_failure','payment_platform_error','exceptional_dispute']);
  return allowed.has(normalized) ? normalized : 'exceptional_dispute';
}
function cleanEvidence(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, 20) : [];
}
async function resolveTicketToOrder(ticketId: string): Promise<{ ticketId: string; orderId: string } | null> {
  const result = await query<{ id?: string; order_id?: string }>(`SELECT id, order_id FROM event_tickets WHERE id = $1 OR code = $1 LIMIT 1`, [ticketId]);
  const row = result.rows[0];
  if (!row?.id || !row.order_id) return null;
  return { ticketId: String(row.id), orderId: String(row.order_id) };
}

export function createDisputeRouter(requireAuth: RequestHandler): express.Router {
  ensureDisputeWorkflowFoundation();
  const router = express.Router();

  router.post('/', disputeLimiter, requireAuth, async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const requestedOrderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
      const requestedTicketId = typeof body.ticketId === 'string' ? body.ticketId.trim() : '';
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if ((!requestedOrderId && !requestedTicketId) || !reason) return res.status(400).json({ error: 'ticketId or orderId, and reason are required' });
      let resolvedTicketId: string | null = null;
      let orderId = requestedOrderId;
      if (requestedTicketId) {
        const ticket = await resolveTicketToOrder(requestedTicketId);
        if (!ticket) return res.status(404).json({ error: 'Event ticket not found' });
        resolvedTicketId = ticket.ticketId;
        orderId = ticket.orderId;
      }
      const access = await assertOrderAccessAsync(req, orderId);
      if ('error' in access) return res.status(access.error.status).json(access.error.body);
      const openedBy = req.user!.uid;
      const now = new Date();
      const nowIso = now.toISOString();
      const requestType = normalizeRequestType(body.requestType);
      const requestedResolution = normalizeRequestedResolution(body.requestedResolution);
      const amountRequested = Number(body.amountRequested ?? 0);
      const evidence = cleanEvidence(body.evidence);
      if (!Number.isFinite(amountRequested) || amountRequested < 0) return res.status(400).json({ error: 'amountRequested must be a non-negative number' });

      const result = await withTransaction(async (client) => {
        const orderResult = await client.query<Record<string, unknown>>(`SELECT id, buyer_id, seller_id, status, escrow_id, total_currency, paid_at, placed_at, fulfilled_at, delivery_period_days, delivery_deadline FROM orders WHERE id = $1 LIMIT 1`, [orderId]);
        const order = orderResult.rows[0];
        if (!order) throw new Error('Order not found');

        const latestCaseResult = await client.query<Record<string, unknown>>(`SELECT id, status, outcome, resolved_at, window_ends_at FROM dispute_cases WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [orderId]);
        const latestCase = latestCaseResult.rows[0];
        if (latestCase) {
          const caseStatus = String(latestCase.status ?? '').trim().toLowerCase();
          const caseOutcome = String(latestCase.outcome ?? '').trim().toLowerCase();
          if (['resolved', 'closed'].includes(caseStatus) || SETTLED_OUTCOMES.has(caseOutcome)) {
            return { duplicate: false, settled: true, timingError: null, caseId: String(latestCase.id), attemptId: null, refundRequestId: null, windowEndsAt: latestCase.window_ends_at ? String(latestCase.window_ends_at) : null, eligibleAt: null, phase: 'settled', buyerId: String(order.buyer_id), sellerId: String(order.seller_id), currency: String(order.total_currency ?? 'MWK'), status: caseStatus };
          }
          if (['open', 'under_review'].includes(caseStatus)) {
            return { duplicate: true, settled: false, timingError: null, caseId: String(latestCase.id), attemptId: null, refundRequestId: null, windowEndsAt: latestCase.window_ends_at ? String(latestCase.window_ends_at) : null, eligibleAt: null, phase: 'active', buyerId: String(order.buyer_id), sellerId: String(order.seller_id), currency: String(order.total_currency ?? 'MWK'), status: caseStatus };
          }
        }

        const legacyLatestResult = await client.query<Record<string, unknown>>(`SELECT id, case_id, status, state, resolution, resolved_at, window_ends_at FROM disputes WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [orderId]);
        const legacyLatest = legacyLatestResult.rows[0];
        if (legacyLatest) {
          const legacyStatus = String(legacyLatest.status ?? legacyLatest.state ?? '').trim().toLowerCase();
          if (['resolved', 'closed'].includes(legacyStatus) || SETTLED_OUTCOMES.has(String(legacyLatest.resolution ?? '').trim().toLowerCase())) {
            return { duplicate: false, settled: true, timingError: null, caseId: String(legacyLatest.case_id ?? legacyLatest.id), attemptId: null, refundRequestId: null, windowEndsAt: legacyLatest.window_ends_at ? String(legacyLatest.window_ends_at) : null, eligibleAt: null, phase: 'settled', buyerId: String(order.buyer_id), sellerId: String(order.seller_id), currency: String(order.total_currency ?? 'MWK'), status: legacyStatus };
          }
        }

        const escrow = await escrowRepository.findByOrderIdAsync(orderId, client);
        const escrowState = String(escrow?.state ?? '').trim().toLowerCase();
        const orderStatus = String(order.status ?? '').trim().toLowerCase();
        const released = escrowState === 'released' || ['fulfilled', 'closed'].includes(orderStatus);

        let windowEndsAt: string | null = null;
        let eligibleAt: string | null = null;
        let phase: 'delivery' | 'escrow' | 'post_delivery' = 'escrow';

        if (released) {
          const deliveredAt = parseDate(order.fulfilled_at) ?? (escrowState === 'released' ? parseDate(escrow?.updatedAt) : null);
          if (!deliveredAt) {
            return { duplicate: false, settled: false, timingError: 'DELIVERY_TIMESTAMP_UNAVAILABLE', caseId: null, attemptId: null, refundRequestId: null, windowEndsAt: null, eligibleAt: null, phase: 'post_delivery', buyerId: String(order.buyer_id), sellerId: String(order.seller_id), currency: String(order.total_currency ?? 'MWK'), status: orderStatus };
          }
          windowEndsAt = addDays(deliveredAt, POST_DELIVERY_DISPUTE_WINDOW_DAYS);
          eligibleAt = deliveredAt.toISOString();
          phase = 'post_delivery';
          if (now.getTime() >= new Date(windowEndsAt).getTime()) {
            return { duplicate: false, settled: false, timingError: 'DISPUTE_PERIOD_EXPIRED', caseId: null, attemptId: null, refundRequestId: null, windowEndsAt, eligibleAt, phase, buyerId: String(order.buyer_id), sellerId: String(order.seller_id), currency: String(order.total_currency ?? 'MWK'), status: orderStatus };
          }
        } else {
          const deliveryDeadline = parseDate(order.delivery_deadline);
          if (deliveryDeadline && now.getTime() < deliveryDeadline.getTime()) {
            return { duplicate: false, settled: false, timingError: 'DISPUTE_WINDOW_NOT_OPEN', caseId: null, attemptId: null, refundRequestId: null, windowEndsAt: null, eligibleAt: deliveryDeadline.toISOString(), phase: 'delivery', buyerId: String(order.buyer_id), sellerId: String(order.seller_id), currency: String(order.total_currency ?? 'MWK'), status: orderStatus };
          }
          eligibleAt = deliveryDeadline?.toISOString() ?? null;
          phase = 'escrow';
        }

        const caseId = `case_${randomUUID()}`;
        await client.query(`INSERT INTO dispute_cases (id, order_id, buyer_id, seller_id, opened_by, status, opened_at, window_ends_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,'open',$6,$7,$6,$6)`, [caseId, orderId, String(order.buyer_id), String(order.seller_id), openedBy, nowIso, windowEndsAt, nowIso]);
        const attemptId = `attempt_${randomUUID()}`;
        await client.query(`INSERT INTO dispute_attempts (id, case_id, order_id, request_type, requested_resolution, reason, amount_requested, evidence, submitted_by, status, window_ends_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10,$11,$11)`, [attemptId, caseId, orderId, requestType, requestedResolution, reason, amountRequested, JSON.stringify(evidence), openedBy, windowEndsAt, nowIso]);
        let refundRequestId: string | null = null;
        if (requestedResolution === 'refund' || requestedResolution === 'return_and_refund') {
          refundRequestId = `refund_${randomUUID()}`;
          await client.query(`INSERT INTO refund_requests (id, order_id, buyer_id, seller_id, item_id, dispute_case_id, request_type, requested_resolution, reason, amount_requested, currency, payment_method, refund_destination, order_state_snapshot, escrow_state_snapshot, payout_state_snapshot, evidence, buyer_comments, status, submitted_at, window_ends_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'requested',$19,$20,$19,$19)`, [refundRequestId, orderId, String(order.buyer_id), String(order.seller_id), resolvedTicketId, caseId, requestType, requestedResolution, reason, amountRequested, String(order.total_currency ?? 'MWK'), typeof body.paymentMethod === 'string' ? body.paymentMethod.trim() || null : null, typeof body.refundDestination === 'string' ? body.refundDestination.trim() || null : null, String(order.status ?? 'pending'), escrowState || null, null, JSON.stringify(evidence), reason, nowIso, windowEndsAt]);
        }
        const legacyResult = await client.query<Record<string, unknown>>(`SELECT id FROM disputes WHERE order_id = $1 AND status = 'open' ORDER BY created_at ASC LIMIT 1`, [orderId]);
        if (!legacyResult.rows[0]) {
          await client.query(`INSERT INTO disputes (id, order_id, ticket_id, escrow_id, opened_by, reason, status, case_id, window_ends_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8,$9,$9)`, [`legacy_${randomUUID()}`, orderId, resolvedTicketId, escrow?.id ?? null, openedBy, reason, caseId, windowEndsAt, nowIso]);
        }
        await client.query(`INSERT INTO audit_events (id, entity_type, entity_id, event_type, performed_by, timestamp, previous_state, new_state, metadata) VALUES ($1,'dispute_case',$2,'dispute_submitted',$3,$4,NULL,'open',$5)`, [`audit_${randomUUID()}`, caseId, openedBy, nowIso, JSON.stringify({ attemptId, refundRequestId, orderId, ticketId: resolvedTicketId, requestType, requestedResolution, phase, eligibleAt, windowEndsAt })]);
        return { duplicate: false, settled: false, timingError: null, caseId, attemptId, refundRequestId, windowEndsAt, eligibleAt, phase, buyerId: String(order.buyer_id), sellerId: String(order.seller_id), currency: String(order.total_currency ?? 'MWK'), status: 'open' };
      });

      if (result.settled) return res.status(409).json({ error: 'Dispute already settled.', code: 'DISPUTE_ALREADY_SETTLED', caseId: result.caseId, status: result.status, windowEndsAt: result.windowEndsAt, orderId });
      if (result.duplicate) return res.status(409).json({ error: 'This order already has an active dispute. Please wait for the current dispute to be resolved before submitting another one.', code: 'ACTIVE_DISPUTE_EXISTS', caseId: result.caseId, status: result.status, windowEndsAt: result.windowEndsAt, orderId });
      if (result.timingError === 'DISPUTE_WINDOW_NOT_OPEN') return res.status(409).json({ error: 'The delivery period has not ended yet. An escrow dispute becomes available after the delivery deadline if delivery has not been confirmed.', code: 'DISPUTE_WINDOW_NOT_OPEN', phase: result.phase, eligibleAt: result.eligibleAt, windowEndsAt: null, orderId });
      if (result.timingError === 'DISPUTE_PERIOD_EXPIRED') return res.status(409).json({ error: 'The 30-day post-delivery dispute period has expired. This order can no longer be disputed.', code: 'DISPUTE_PERIOD_EXPIRED', phase: result.phase, eligibleAt: result.eligibleAt, windowEndsAt: result.windowEndsAt, orderId });
      if (result.timingError === 'DELIVERY_TIMESTAMP_UNAVAILABLE') return res.status(409).json({ error: 'This order cannot be disputed because the confirmed-delivery timestamp is unavailable.', code: 'DELIVERY_TIMESTAMP_UNAVAILABLE', phase: result.phase, orderId });
      if (!result.caseId) return res.status(500).json({ error: 'Dispute was created without a case id.' });

      try {
        await notifyDisputeWorkflowEvent({ caseId: result.caseId, orderId, buyerId: result.buyerId, sellerId: result.sellerId, event: 'submitted', note: reason, amount: amountRequested, currency: result.currency });
      } catch (notificationError) { console.warn('Failed to send dispute submission notification:', notificationError); }
      return res.status(201).json({ caseId: result.caseId, attemptId: result.attemptId, refundRequestId: result.refundRequestId, windowEndsAt: result.windowEndsAt, orderId, ticketId: resolvedTicketId, requestType, requestedResolution, phase: result.phase, eligibleAt: result.eligibleAt, status: 'open' });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to open dispute'));
    }
  });

  router.get('/me', disputeLimiter, requireAuth, async (req, res) => {
    try {
      const result = await query<Record<string, unknown>>(`SELECT dc.*, da.id AS latest_attempt_id, da.request_type AS latest_request_type, da.requested_resolution AS latest_requested_resolution, da.reason AS latest_reason, da.status AS latest_attempt_status, da.created_at AS latest_attempt_created_at, rt.id AS refunded_transaction_id, rt.amount AS refunded_amount, rt.currency AS refunded_currency, rt.payment_method AS refunded_payment_method, rt.provider AS refunded_provider, rt.transaction_id AS refunded_transaction_id_reference, rt.status AS refunded_status, rt.executed_by AS refunded_by, rt.executed_at AS refunded_at FROM dispute_cases dc LEFT JOIN LATERAL (SELECT * FROM dispute_attempts WHERE case_id = dc.id ORDER BY created_at DESC LIMIT 1) da ON true LEFT JOIN LATERAL (SELECT * FROM refund_transactions WHERE order_id = dc.order_id ORDER BY created_at DESC LIMIT 1) rt ON true WHERE dc.buyer_id = $1 ORDER BY dc.updated_at DESC`, [req.user!.uid]);
      return res.status(200).json(result.rows);
    } catch (error) { return res.status(500).json(jsonError(error, 'Failed to fetch disputes')); }
  });

  router.get('/ticket/:ticketId', disputeLimiter, requireAuth, async (req, res) => {
    try {
      const ticket = await resolveTicketToOrder(String(req.params.ticketId ?? '').trim());
      if (!ticket) return res.status(404).json({ error: 'Event ticket not found' });
      const access = await assertOrderAccessAsync(req, ticket.orderId);
      if ('error' in access) return res.status(access.error.status).json(access.error.body);
      const result = await query<Record<string, unknown>>(`SELECT * FROM disputes WHERE ticket_id = $1 OR (ticket_id IS NULL AND order_id = $2) ORDER BY CASE WHEN ticket_id = $1 THEN 0 ELSE 1 END, created_at DESC LIMIT 1`, [ticket.ticketId, ticket.orderId]);
      const dispute = result.rows[0];
      if (!dispute) return res.status(404).json({ error: 'No dispute found for this ticket' });
      return res.status(200).json(dispute);
    } catch (error) { return res.status(500).json(jsonError(error, 'Failed to fetch dispute for ticket')); }
  });

  router.get('/:orderId', disputeLimiter, requireAuth, async (req, res) => {
    try {
      const access = await assertOrderAccessAsync(req, req.params.orderId);
      if ('error' in access) return res.status(access.error.status).json(access.error.body);
      const result = await query<Record<string, unknown>>('SELECT * FROM disputes WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1', [req.params.orderId]);
      const dispute = result.rows[0];
      if (!dispute) return res.status(404).json({ error: 'No dispute found for this order' });
      return res.status(200).json(dispute);
    } catch (error) { return res.status(500).json(jsonError(error, 'Failed to fetch dispute')); }
  });

  router.patch('/:id', disputeLimiter, requireAuth, async (req, res) => {
    try {
      if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin access required' });
      const { status, resolutionNote } = req.body as { status?: string; resolutionNote?: string };
      if (!status || !['resolved', 'rejected'].includes(status)) return res.status(400).json({ error: 'status must be "resolved" or "rejected"' });
      const disputeResult = await query<Record<string, unknown>>('SELECT * FROM disputes WHERE id = $1 LIMIT 1', [req.params.id]);
      const existing = disputeResult.rows[0];
      if (!existing) return res.status(404).json({ error: 'Dispute not found' });
      assertAllowedDisputeTransition(existing.status as DisputeStatus, status as DisputeStatus);
      const orderId = String(existing.order_id ?? '').trim();
      if (!orderId) return res.status(400).json({ error: 'Dispute is not attached to an order' });
      if (!resolutionNote?.trim()) return res.status(400).json({ error: 'resolutionNote is required when resolving a dispute' });
      const orderResult = await query<{ status?: string }>('SELECT status FROM orders WHERE id = $1 LIMIT 1', [orderId]);
      const order = orderResult.rows[0];
      const escrow = await escrowRepository.findByOrderIdAsync(orderId);
      if (status === 'resolved' && !(order?.status === 'refunded' && escrow?.state === 'refunded')) return res.status(409).json({ error: 'Resolve the dispute through the escrow refund action first.' });
      if (status === 'rejected' && !(order?.status === 'fulfilled' && escrow?.state === 'released')) return res.status(409).json({ error: 'Reject the dispute only after escrow has been released to the seller.' });
      const now = new Date().toISOString();
      await query(`UPDATE disputes SET status=$1, resolved_by=$2, resolution_note=$3, updated_at=$4, resolved_at=$4 WHERE id=$5`, [status, req.user.uid, resolutionNote.trim(), now, req.params.id]);
      const updatedResult = await query<Record<string, unknown>>('SELECT * FROM disputes WHERE id = $1', [req.params.id]);
      return res.status(200).json(updatedResult.rows[0]);
    } catch (error) { return res.status(400).json(jsonError(error, 'Failed to resolve dispute')); }
  });
  return router;
}

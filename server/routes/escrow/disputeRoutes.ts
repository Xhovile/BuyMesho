import express, { type RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { query, withTransaction } from '../../postgres.js';
import { withOrderFinancialLock } from '../../modules/financial/orderFinancialLock.js';
import { escrowRepository } from '../../modules/escrow/escrow.repository.js';
import { notifyDisputeWorkflowEvent } from '../../modules/notifications/dispute-workflow.notification.js';
import { assertAllowedDisputeTransition, type DisputeStatus } from './disputeState.js';
import { ensureDisputeWorkflowFoundation } from '../../db/migrations/20260904_dispute_workflow_foundation.js';
import { ensureDisputeResolutionOwnershipMigration } from '../../db/migrations/20260910_dispute_resolution_ownership.js';
import { assertOrderAccessAsync, disputeLimiter, jsonError } from './shared.js';

const POST_DELIVERY_DISPUTE_WINDOW_DAYS = 30;
const SETTLED_OUTCOMES = new Set(['refunded', 'returned', 'seller_refund_confirmed', 'seller_refund_accepted', 'return', 'return_and_refund', 'seller_replacement_confirmed', 'seller_replacement_committed', 'seller_rejected', 'seller_dispute_rejected']);

const DISPUTE_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  under_review: 'Under review',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
};

const DISPUTE_REQUEST_TYPE_LABELS: Record<string, string> = {
  buyer_cancellation: 'Order cancellation',
  seller_failed_to_fulfill: 'Seller did not fulfill the order',
  product_item_problem: 'Problem with the product or item',
  delivery_failure: 'Delivery problem',
  payment_platform_error: 'Payment or platform problem',
  exceptional_dispute: 'Other issue',
  legacy_dispute: 'Previous dispute record',
};

const DISPUTE_RESOLUTION_LABELS: Record<string, string> = {
  refund: 'Refund',
  return: 'Return',
  return_and_refund: 'Return & refund',
  review: 'BuyMesho review',
};
const LISTING_REQUEST_TYPES = new Set([
  'buyer_cancellation',
  'seller_failed_to_fulfill',
  'product_item_problem',
  'delivery_failure',
  'payment_platform_error',
  'exceptional_dispute',
]);

const EVENT_REQUEST_TYPE_LABELS: Record<string, string> = {
  event_payment_problem: 'Payment problem',
  ticket_not_received: 'Ticket was not received',
  invalid_ticket: 'Ticket is invalid or duplicated',
  event_cancelled: 'Event was cancelled',
  event_rescheduled: 'Event was postponed or rescheduled',
  denied_entry: 'Denied entry with a valid ticket',
  event_material_difference: 'Event was materially different from the listing',
  exceptional_event_issue: 'Other event issue',
};

const EVENT_RESOLUTION_LABELS: Record<string, string> = {
  refund: 'Request a refund',
  review: 'Ask BuyMesho to review',
};

const EVENT_REQUEST_TYPES = new Set(Object.keys(EVENT_REQUEST_TYPE_LABELS));
const EVENT_DISPUTE_POST_EVENT_HOURS = 48;

type DisputeSubjectType = 'listing' | 'event';

type DisputeEligibility = {
  eligible: boolean;
  phase: 'delivery' | 'escrow' | 'post_delivery' | 'expired' | 'settled' | 'active' | 'pre_event' | 'event_day' | 'post_event';
  eligibleAt: string | null;
  windowEndsAt: string | null;
  reason: string;
};

function safeParseItems(value: unknown): Array<Record<string, unknown>> {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item)) : [];
  } catch {
    return [];
  }
}

async function detectDisputeSubject(orderId: string): Promise<{ subjectType: DisputeSubjectType; eventId: string | null }> {
  const result = await query<{ source?: string; items?: string }>(`SELECT source, items FROM orders WHERE id = $1 LIMIT 1`, [orderId]);
  const order = result.rows[0];
  if (!order) return { subjectType: 'listing', eventId: null };
  const eventItem = safeParseItems(order.items).find((item) => String(item.kind ?? '').trim().toLowerCase() === 'event_ticket');
  if (eventItem) return { subjectType: 'event', eventId: String(eventItem.eventId ?? eventItem.event_id ?? '').trim() || null };
  if (String(order.source ?? '').trim().toLowerCase() === 'event') return { subjectType: 'event', eventId: null };
  return { subjectType: 'listing', eventId: null };
}

async function getDisputeEligibility(orderId: string, subjectType: DisputeSubjectType, eventId: string | null, now = new Date()): Promise<DisputeEligibility> {
  const latest = await query<Record<string, unknown>>(`SELECT id, status, outcome, window_ends_at FROM dispute_cases WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`, [orderId]);
  const current = latest.rows[0];
  if (current) {
    const status = String(current.status ?? '').trim().toLowerCase();
    const outcome = String(current.outcome ?? '').trim().toLowerCase();
    if (['resolved', 'closed'].includes(status) || SETTLED_OUTCOMES.has(outcome)) return { eligible: false, phase: 'settled', eligibleAt: null, windowEndsAt: current.window_ends_at ? String(current.window_ends_at) : null, reason: 'This dispute already has a final outcome.' };
    if (['open', 'under_review', 'awaiting_response'].includes(status)) return { eligible: false, phase: 'active', eligibleAt: null, windowEndsAt: current.window_ends_at ? String(current.window_ends_at) : null, reason: 'This order already has an active dispute.' };
  }

  if (subjectType === 'event') {
    const eventResult = eventId ? await query<Record<string, unknown>>(`SELECT id, event_title, event_date, start_time, status FROM events WHERE id = $1 LIMIT 1`, [eventId]) : { rows: [] as Record<string, unknown>[] };
    const event = eventResult.rows[0];
    if (String(event?.status ?? '').trim().toLowerCase() === 'cancelled') return { eligible: true, phase: 'post_event', eligibleAt: null, windowEndsAt: null, reason: 'Cancelled-event disputes can be submitted once the cancellation is known.' };
    const eventDate = event?.event_date ? parseDate(String(event.event_date)) : null;
    const startTime = String(event?.start_time ?? '').trim();
    const eventStart = eventDate ? parseDate(`${String(event.event_date).slice(0, 10)}T${startTime || '00:00:00'}`) : null;
    if (eventStart && now.getTime() < eventStart.getTime()) return { eligible: true, phase: 'pre_event', eligibleAt: eventStart.toISOString(), windowEndsAt: null, reason: 'Event disputes for payment or ticket problems can be submitted before the event. Event-day experience disputes should be submitted after entry or the event.' };
    const windowEndsAt = eventStart ? addDays(eventStart, EVENT_DISPUTE_POST_EVENT_HOURS / 24) : null;
    if (windowEndsAt && now.getTime() >= new Date(windowEndsAt).getTime()) return { eligible: false, phase: 'expired', eligibleAt: eventStart?.toISOString() ?? null, windowEndsAt, reason: 'The 48-hour event dispute window has expired.' };
    const eventDayEndsAt = eventStart ? addDays(eventStart, 1) : null;
    const phase: DisputeEligibility['phase'] = eventDayEndsAt && now.getTime() < new Date(eventDayEndsAt).getTime() ? 'event_day' : 'post_event';
    return { eligible: true, phase, eligibleAt: eventStart?.toISOString() ?? null, windowEndsAt, reason: windowEndsAt ? 'Event disputes remain available until 48 hours after the scheduled event start.' : 'Event disputes can be submitted while the event issue can still be reviewed.' };
  }

  const orderResult = await query<Record<string, unknown>>(`SELECT status, fulfilled_at, delivery_deadline FROM orders WHERE id = $1 LIMIT 1`, [orderId]);
  const order = orderResult.rows[0];
  if (!order) return { eligible: false, phase: 'expired', eligibleAt: null, windowEndsAt: null, reason: 'Order not found.' };
  const orderStatus = String(order.status ?? '').trim().toLowerCase();
  const fulfilledAt = parseDate(String(order.fulfilled_at ?? ''));
  const deliveryDeadline = parseDate(String(order.delivery_deadline ?? ''));
  const released = ['fulfilled', 'closed'].includes(orderStatus) || Boolean(fulfilledAt);
  if (released) {
    if (!fulfilledAt) return { eligible: false, phase: 'expired', eligibleAt: null, windowEndsAt: null, reason: 'Delivery confirmation date is unavailable.' };
    const windowEndsAt = addDays(fulfilledAt, POST_DELIVERY_DISPUTE_WINDOW_DAYS);
    if (now.getTime() >= new Date(windowEndsAt).getTime()) return { eligible: false, phase: 'expired', eligibleAt: fulfilledAt.toISOString(), windowEndsAt, reason: 'The 30-day post-delivery dispute period has ended.' };
    return { eligible: true, phase: 'post_delivery', eligibleAt: fulfilledAt.toISOString(), windowEndsAt, reason: 'You can report an issue within 30 days of confirmed delivery.' };
  }
  if (deliveryDeadline && now.getTime() < deliveryDeadline.getTime()) return { eligible: false, phase: 'delivery', eligibleAt: deliveryDeadline.toISOString(), windowEndsAt: null, reason: 'The delivery period has not ended yet. An escrow dispute becomes available after the delivery deadline if delivery has not been confirmed.' };
  return { eligible: true, phase: 'escrow', eligibleAt: deliveryDeadline?.toISOString() ?? null, windowEndsAt: null, reason: 'The delivery period has ended and escrow is still held. You may open a dispute.' };
}


function addDays(from: Date, days: number): string {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}
function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function normalizeRequestedResolution(value: unknown, subjectType: DisputeSubjectType = 'listing'): 'refund' | 'return' | 'return_and_refund' | 'review' {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'refund') return 'refund';
  if (normalized === 'return') return 'return';
  if (normalized === 'return_and_refund' && subjectType === 'listing') return 'return_and_refund';
  if (normalized === 'return' && subjectType === 'listing') return 'return';
  return 'review';
}
function normalizeRequestType(value: unknown, subjectType: DisputeSubjectType): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (subjectType === 'event') return EVENT_REQUEST_TYPES.has(normalized) ? normalized : 'exceptional_event_issue';
  return LISTING_REQUEST_TYPES.has(normalized) ? normalized : 'exceptional_dispute';
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
  ensureDisputeResolutionOwnershipMigration();
  const router = express.Router();

  router.get('/resolve', disputeLimiter, requireAuth, async (req, res) => {
    try {
      const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (!rawQuery) return res.status(400).json({ error: 'A dispute search query is required' });
      const like = `%${rawQuery}%`;
      let orderId: string | null = null;
      let ticketId: string | null = null;
      let matchedBy = '';

      const exactOrder = await query<{ id: string }>(`SELECT id FROM orders WHERE buyer_id = $1 AND (id = $2 OR payment_reference = $2) LIMIT 1`, [req.user!.uid, rawQuery]);
      if (exactOrder.rows[0]?.id) { orderId = String(exactOrder.rows[0].id); matchedBy = 'order'; }

      if (!orderId) {
        const exactTicket = await query<{ order_id: string; id: string }>(`SELECT et.order_id, et.id FROM event_tickets et INNER JOIN orders o ON o.id = et.order_id WHERE o.buyer_id = $1 AND (et.id = $2 OR et.code = $2) LIMIT 1`, [req.user!.uid, rawQuery]);
        if (exactTicket.rows[0]?.order_id) { orderId = String(exactTicket.rows[0].order_id); ticketId = String(exactTicket.rows[0].id); matchedBy = 'ticket'; }
      }

      if (!orderId) {
        const eventMatch = await query<{ order_id: string; ticket_id: string }>(`SELECT et.order_id, et.id AS ticket_id FROM event_tickets et INNER JOIN orders o ON o.id = et.order_id INNER JOIN events e ON e.id = et.event_id WHERE o.buyer_id = $1 AND e.event_title ILIKE $2 ORDER BY o.created_at DESC, et.id ASC LIMIT 1`, [req.user!.uid, like]);
        if (eventMatch.rows[0]?.order_id) { orderId = String(eventMatch.rows[0].order_id); ticketId = String(eventMatch.rows[0].ticket_id ?? ''); matchedBy = 'event'; }
      }

      if (!orderId) {
        const listingMatch = await query<{ order_id: string }>(`SELECT o.id AS order_id FROM orders o WHERE o.buyer_id = $1 AND EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(NULLIF(o.items, '')::jsonb, '[]'::jsonb)) item WHERE lower(COALESCE(item->>'title', '')) LIKE lower($2) AND COALESCE(item->>'kind', 'listing') = 'listing') ORDER BY o.created_at DESC LIMIT 1`, [req.user!.uid, like]);
        if (listingMatch.rows[0]?.order_id) { orderId = String(listingMatch.rows[0].order_id); matchedBy = 'listing'; }
      }

      if (!orderId) return res.status(404).json({ error: 'No order, ticket, event, or listing matching that query was found.' });
      const subject = await detectDisputeSubject(orderId);
      const eventId = subject.eventId;
      const eligibility = await getDisputeEligibility(orderId, subject.subjectType, eventId);
      let event: Record<string, unknown> | null = null;
      let tickets: Record<string, unknown>[] = [];
      let listings: Record<string, unknown>[] = [];
      if (subject.subjectType === 'event') {
        const eventResult = eventId ? await query<Record<string, unknown>>(`SELECT e.id, e.event_title, e.event_type, e.organizer_name, e.event_date, e.start_time, e.end_time, e.venue, e.location, e.status, e.ticket_price FROM events e WHERE e.id = $1 LIMIT 1`, [eventId]) : { rows: [] as Record<string, unknown>[] };
        event = eventResult.rows[0] ?? null;
        const ticketResult = await query<Record<string, unknown>>(`SELECT et.id, et.code, et.ticket_title, et.ticket_type, et.status, et.holder_name, et.holder_email, et.holder_phone, et.purchase_date FROM event_tickets et WHERE et.order_id = $1 ORDER BY et.id ASC`, [orderId]);
        tickets = ticketResult.rows;
      } else {
        const orderResult = await query<{ items: string }>(`SELECT items FROM orders WHERE id = $1 LIMIT 1`, [orderId]);
        listings = safeParseItems(orderResult.rows[0]?.items).filter((item) => String(item.kind ?? 'listing').toLowerCase() === 'listing').map((item) => ({ id: item.listingId ?? item.listing_id ?? null, title: item.title ?? 'Listing', quantity: item.quantity ?? 1, unitPrice: item.unitPrice ?? item.unit_price ?? null, reference: item.reference ?? null }));
      }
      return res.json({ query: rawQuery, matchedBy, subjectType: subject.subjectType, orderId, ticketId, eligibility, requestTypes: subject.subjectType === 'event' ? [...EVENT_REQUEST_TYPES].map((value) => ({ value, label: EVENT_REQUEST_TYPE_LABELS[value] })) : [...LISTING_REQUEST_TYPES].map((value) => ({ value, label: DISPUTE_REQUEST_TYPE_LABELS[value] })), resolutions: subject.subjectType === 'event' ? Object.entries(EVENT_RESOLUTION_LABELS).map(([value, label]) => ({ value, label })) : Object.entries(DISPUTE_RESOLUTION_LABELS).map(([value, label]) => ({ value, label })), event, tickets, listings });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to resolve dispute search' });
    }
  });

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
      const subject = await detectDisputeSubject(orderId);
      const subjectType = subject.subjectType;
      const eligibility = await getDisputeEligibility(orderId, subjectType, subject.eventId, now);
      if (!eligibility.eligible) {
        if (eligibility.phase === 'active') return res.status(409).json({ error: 'This order already has an active dispute.', code: 'ACTIVE_DISPUTE_EXISTS', orderId });
        if (eligibility.phase === 'settled') return res.status(409).json({ error: 'Dispute already settled.', code: 'DISPUTE_ALREADY_SETTLED', orderId });
        return res.status(409).json({ error: eligibility.reason, code: subjectType === 'event' ? 'EVENT_DISPUTE_WINDOW_UNAVAILABLE' : 'DISPUTE_WINDOW_UNAVAILABLE', phase: eligibility.phase, eligibleAt: eligibility.eligibleAt, windowEndsAt: eligibility.windowEndsAt, orderId });
      }
      const requestType = normalizeRequestType(body.requestType, subjectType);
      const requestedResolution = normalizeRequestedResolution(body.requestedResolution, subjectType);
      const amountRequested = Number(body.amountRequested ?? 0);
      const evidence = cleanEvidence(body.evidence);
      if (!Number.isFinite(amountRequested) || amountRequested < 0) return res.status(400).json({ error: 'amountRequested must be a non-negative number' });

      const result = await withOrderFinancialLock(orderId, () => withTransaction(async (client) => {
        const orderResult = await client.query<Record<string, unknown>>(`SELECT id, buyer_id, seller_id, status, escrow_id, total_currency, paid_at, placed_at, fulfilled_at, delivery_period_days, delivery_deadline FROM orders WHERE id = $1 LIMIT 1`, [orderId]);
        const order = orderResult.rows[0];
        if (!order) throw new Error('Order not found');

        const latestCaseResult = await client.query<Record<string, unknown>>(`SELECT id, status, outcome, resolved_at, window_ends_at FROM dispute_cases WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [orderId]);
        const latestCase = latestCaseResult.rows[0];
        if (latestCase) {
          const caseStatus = String(latestCase.status ?? '').trim().toLowerCase();
          const caseOutcome = String(latestCase.outcome ?? '').trim().toLowerCase();
          if (['resolved', 'closed'].includes(caseStatus) || SETTLED_OUTCOMES.has(caseOutcome)) {
            return { duplicate: false, settled: true, timingError: null, caseId: String(latestCase.id), attemptId: null, refundRequestId: null, windowEndsAt: latestCase.window_ends_at ? String(latestCase.window_ends_at) : null, eligibleAt: null, phase: 'settled', buyerId: String(order.buyer_id), sellerId: String(order.seller_id), currency: String(order.total_currency ?? 'MWK'), status: caseStatus, resolutionOwner: String(latestCase.resolution_owner ?? 'admin'), payoutStatusAtSubmission: latestCase.payout_status_at_submission ? String(latestCase.payout_status_at_submission) : null };
          }
          if (['open', 'under_review'].includes(caseStatus)) {
            return { duplicate: true, settled: false, timingError: null, caseId: String(latestCase.id), attemptId: null, refundRequestId: null, windowEndsAt: latestCase.window_ends_at ? String(latestCase.window_ends_at) : null, eligibleAt: null, phase: 'active', buyerId: String(order.buyer_id), sellerId: String(order.seller_id), currency: String(order.total_currency ?? 'MWK'), status: caseStatus, resolutionOwner: String(latestCase.resolution_owner ?? 'admin'), payoutStatusAtSubmission: latestCase.payout_status_at_submission ? String(latestCase.payout_status_at_submission) : null };
          }
        }

        const legacyLatestResult = await client.query<Record<string, unknown>>(`SELECT id, case_id, status, state, resolution, resolved_at, window_ends_at FROM disputes WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [orderId]);
        const legacyLatest = legacyLatestResult.rows[0];
        if (legacyLatest) {
          const legacyStatus = String(legacyLatest.status ?? legacyLatest.state ?? '').trim().toLowerCase();
          if (['resolved', 'closed'].includes(legacyStatus) || SETTLED_OUTCOMES.has(String(legacyLatest.resolution ?? '').trim().toLowerCase())) {
            return { duplicate: false, settled: true, timingError: null, caseId: String(legacyLatest.case_id ?? legacyLatest.id), attemptId: null, refundRequestId: null, windowEndsAt: legacyLatest.window_ends_at ? String(legacyLatest.window_ends_at) : null, eligibleAt: null, phase: 'settled', buyerId: String(order.buyer_id), sellerId: String(order.seller_id), currency: String(order.total_currency ?? 'MWK'), status: legacyStatus, resolutionOwner: 'admin', payoutStatusAtSubmission: null };
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
            return { duplicate: false, settled: false, timingError: 'DELIVERY_TIMESTAMP_UNAVAILABLE', caseId: null, attemptId: null, refundRequestId: null, windowEndsAt: null, eligibleAt: null, phase: 'post_delivery', buyerId: String(order.buyer_id), sellerId: String(order.seller_id), currency: String(order.total_currency ?? 'MWK'), status: orderStatus, resolutionOwner: 'admin', payoutStatusAtSubmission: null };
          }
          windowEndsAt = addDays(deliveredAt, POST_DELIVERY_DISPUTE_WINDOW_DAYS);
          eligibleAt = deliveredAt.toISOString();
          phase = 'post_delivery';
          if (now.getTime() >= new Date(windowEndsAt).getTime()) {
            return { duplicate: false, settled: false, timingError: 'DISPUTE_PERIOD_EXPIRED', caseId: null, attemptId: null, refundRequestId: null, windowEndsAt, eligibleAt, phase, buyerId: String(order.buyer_id), sellerId: String(order.seller_id), currency: String(order.total_currency ?? 'MWK'), status: orderStatus, resolutionOwner: 'admin', payoutStatusAtSubmission: null };
          }
        } else {
          const deliveryDeadline = parseDate(order.delivery_deadline);
          if (deliveryDeadline && now.getTime() < deliveryDeadline.getTime()) {
            return { duplicate: false, settled: false, timingError: 'DISPUTE_WINDOW_NOT_OPEN', caseId: null, attemptId: null, refundRequestId: null, windowEndsAt: null, eligibleAt: deliveryDeadline.toISOString(), phase: 'delivery', buyerId: String(order.buyer_id), sellerId: String(order.seller_id), currency: String(order.total_currency ?? 'MWK'), status: orderStatus, resolutionOwner: 'admin', payoutStatusAtSubmission: null };
          }
          eligibleAt = deliveryDeadline?.toISOString() ?? null;
          phase = 'escrow';
        }

        const payoutResult = await client.query<Record<string, unknown>>(
          `SELECT id, status FROM payouts WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
          [orderId],
        );
        const payout = payoutResult.rows[0] ?? null;
        const payoutStatusAtSubmission = payout ? String(payout.status ?? '').trim().toLowerCase() : null;
        const resolutionOwner: 'admin' | 'seller' = subjectType === 'event' ? 'admin' : released && payoutStatusAtSubmission === 'paid' ? 'seller' : 'admin';

        if (resolutionOwner === 'admin' && payout) {
          const payoutStatus = String(payout.status ?? '').trim().toLowerCase();
          if (!['paid', 'cancelled'].includes(payoutStatus)) {
            const holdReason = 'Payout held because this delivered order has an active pre-payout dispute under BuyMesho review.';
            await client.query(
              `UPDATE payouts SET status = 'held', provider_status = 'held', failure_reason = 'order_disputed', manual_review_reason = $1, updated_at = $2 WHERE id = $3 AND status NOT IN ('paid','cancelled')`,
              [holdReason, nowIso, payout.id],
            );
            await client.query(
              `INSERT INTO payout_events (payout_id, seller_id, event_type, actor_type, actor_id, note, payload, created_at) VALUES ($1,$2,'payout_held_for_dispute','system',$2,$3,$4,$5)`,
              [payout.id, String(order.seller_id), holdReason, JSON.stringify({ orderId, disputeRouting: 'admin', payoutStatusAtSubmission, phase }), nowIso],
            );
          }
        }

        const caseId = `case_${randomUUID()}`;
        await client.query(`INSERT INTO dispute_cases (id, order_id, buyer_id, seller_id, opened_by, status, resolution_owner, payout_status_at_submission, opened_at, window_ends_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,'open',$6,$7,$8,$9,$8,$8)`, [caseId, orderId, String(order.buyer_id), String(order.seller_id), openedBy, resolutionOwner, payoutStatusAtSubmission, nowIso, windowEndsAt]);
        const attemptId = `attempt_${randomUUID()}`;
        await client.query(`INSERT INTO dispute_attempts (id, case_id, order_id, request_type, requested_resolution, reason, amount_requested, evidence, submitted_by, status, window_ends_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10,$11,$12)`, [attemptId, caseId, orderId, requestType, requestedResolution, reason, amountRequested, JSON.stringify(evidence), openedBy, windowEndsAt, nowIso, nowIso]);
        let refundRequestId: string | null = null;
        if (requestedResolution === 'refund' || requestedResolution === 'return_and_refund') {
          refundRequestId = `refund_${randomUUID()}`;
          await client.query(`INSERT INTO refund_requests (id, order_id, buyer_id, seller_id, item_id, dispute_case_id, request_type, requested_resolution, reason, amount_requested, currency, payment_method, refund_destination, order_state_snapshot, escrow_state_snapshot, payout_state_snapshot, evidence, buyer_comments, status, submitted_at, window_ends_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'requested',$19,$20,$21,$22)`, [refundRequestId, orderId, String(order.buyer_id), String(order.seller_id), resolvedTicketId, caseId, requestType, requestedResolution, reason, amountRequested, String(order.total_currency ?? 'MWK'), typeof body.paymentMethod === 'string' ? body.paymentMethod.trim() || null : null, typeof body.refundDestination === 'string' ? body.refundDestination.trim() || null : null, String(order.status ?? 'pending'), escrowState || null, payoutStatusAtSubmission, JSON.stringify(evidence), reason, nowIso, windowEndsAt, nowIso, nowIso]);
        }
        const legacyResult = await client.query<Record<string, unknown>>(`SELECT id FROM disputes WHERE order_id = $1 AND status = 'open' ORDER BY created_at ASC LIMIT 1`, [orderId]);
        if (!legacyResult.rows[0]) {
          await client.query(`INSERT INTO disputes (id, order_id, ticket_id, escrow_id, opened_by, reason, status, case_id, window_ends_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8,$9,$10)`, [`legacy_${randomUUID()}`, orderId, resolvedTicketId, escrow?.id ?? null, openedBy, reason, caseId, windowEndsAt, nowIso, nowIso]);
        }
        await client.query(`INSERT INTO audit_events (id, entity_type, entity_id, event_type, performed_by, timestamp, previous_state, new_state, metadata) VALUES ($1,'dispute_case',$2,'dispute_submitted',$3,$4,NULL,'open',$5)`, [`audit_${randomUUID()}`, caseId, openedBy, nowIso, JSON.stringify({ attemptId, refundRequestId, orderId, ticketId: resolvedTicketId, requestType, requestedResolution, phase, eligibleAt, windowEndsAt, resolutionOwner, payoutStatusAtSubmission })]);
        return { duplicate: false, settled: false, timingError: null, caseId, attemptId, refundRequestId, windowEndsAt, eligibleAt, phase, buyerId: String(order.buyer_id), sellerId: String(order.seller_id), currency: String(order.total_currency ?? 'MWK'), status: 'open', resolutionOwner, payoutStatusAtSubmission };
       }));

      if (result.settled) return res.status(409).json({ error: 'Dispute already settled.', code: 'DISPUTE_ALREADY_SETTLED', caseId: result.caseId, status: result.status, windowEndsAt: result.windowEndsAt, orderId });
      if (result.duplicate) return res.status(409).json({ error: 'This order already has an active dispute. Please wait for the current dispute to be resolved before submitting another one.', code: 'ACTIVE_DISPUTE_EXISTS', caseId: result.caseId, status: result.status, windowEndsAt: result.windowEndsAt, orderId });
      if (result.timingError === 'DISPUTE_WINDOW_NOT_OPEN') return res.status(409).json({ error: 'The delivery period has not ended yet. An escrow dispute becomes available after the delivery deadline if delivery has not been confirmed.', code: 'DISPUTE_WINDOW_NOT_OPEN', phase: result.phase, eligibleAt: result.eligibleAt, windowEndsAt: null, orderId });
      if (result.timingError === 'DISPUTE_PERIOD_EXPIRED') return res.status(409).json({ error: 'The 30-day post-delivery dispute period has expired. This order can no longer be disputed.', code: 'DISPUTE_PERIOD_EXPIRED', phase: result.phase, eligibleAt: result.eligibleAt, windowEndsAt: result.windowEndsAt, orderId });
      if (result.timingError === 'DELIVERY_TIMESTAMP_UNAVAILABLE') return res.status(409).json({ error: 'This order cannot be disputed because the confirmed-delivery timestamp is unavailable.', code: 'DELIVERY_TIMESTAMP_UNAVAILABLE', phase: result.phase, orderId });
      if (!result.caseId) return res.status(500).json({ error: 'Dispute was created without a case id.' });

      try {
        await notifyDisputeWorkflowEvent({ caseId: result.caseId, orderId, buyerId: result.buyerId, sellerId: result.sellerId, event: 'submitted', note: reason, amount: amountRequested, currency: result.currency });
      } catch (notificationError) { console.warn('Failed to send dispute submission notification:', notificationError); }
      return res.status(201).json({ caseId: result.caseId, attemptId: result.attemptId, refundRequestId: result.refundRequestId, windowEndsAt: result.windowEndsAt, orderId, ticketId: resolvedTicketId, requestType, requestedResolution, phase: result.phase, eligibleAt: result.eligibleAt, status: 'open', resolutionOwner: result.resolutionOwner, payoutStatusAtSubmission: result.payoutStatusAtSubmission });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to open dispute'));
    }
  });

  router.get('/me', disputeLimiter, requireAuth, async (req, res) => {
    try {
      const result = await query<Record<string, unknown>>(`
        SELECT DISTINCT ON (dc.order_id)
          dc.*,
          da.id AS latest_attempt_id,
          da.request_type AS latest_request_type,
          da.requested_resolution AS latest_requested_resolution,
          da.reason AS latest_reason,
          da.evidence AS latest_evidence,
          da.status AS latest_attempt_status,
          da.created_at AS latest_attempt_created_at,
          rr.id AS refund_request_id,
          rr.status AS refund_request_status,
          rr.amount_requested AS refund_requested_amount,
          rr.currency AS refund_currency,
          rr.item_id AS refund_ticket_id,
          rt.id AS refund_transaction_id,
          rt.amount AS refunded_amount,
          rt.currency AS refunded_currency,
          rt.payment_method AS refunded_payment_method,
          rt.provider AS refunded_provider,
          rt.transaction_id AS refunded_transaction_id_reference,
          rt.status AS refunded_status,
          rt.executed_at AS refunded_at
        FROM dispute_cases dc
        LEFT JOIN LATERAL (
          SELECT *
          FROM dispute_attempts
          WHERE case_id = dc.id
          ORDER BY created_at DESC
          LIMIT 1
        ) da ON true
        LEFT JOIN LATERAL (
          SELECT *
          FROM refund_requests
          WHERE dispute_case_id = dc.id
          ORDER BY created_at DESC
          LIMIT 1
        ) rr ON true
        LEFT JOIN LATERAL (
          SELECT *
          FROM refund_transactions
          WHERE refund_request_id = (
            SELECT id
            FROM refund_requests
            WHERE dispute_case_id = dc.id
            ORDER BY created_at DESC
            LIMIT 1
          )
          ORDER BY created_at DESC
          LIMIT 1
        ) rt ON true
        WHERE dc.buyer_id = $1 OR dc.seller_id = $1
        ORDER BY
          dc.order_id,
          CASE WHEN dc.legacy_dispute_id IS NULL THEN 0 ELSE 1 END,
          dc.updated_at DESC,
          dc.created_at DESC
      `, [req.user!.uid]);

      const formattedRows = result.rows.map((row) => {
        const status = String(row.status ?? '').trim().toLowerCase();
        const requestType = String(row.latest_request_type ?? '').trim().toLowerCase();
        const resolution = String(row.latest_requested_resolution ?? '').trim().toLowerCase();
        let latestEvidence: string[] = [];
        try {
          const parsed = typeof row.latest_evidence === 'string' ? JSON.parse(row.latest_evidence) : row.latest_evidence;
          latestEvidence = Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, 20)
            : [];
        } catch {
          latestEvidence = [];
        }
        return {
          ...row,
          latest_evidence: latestEvidence,
          status: DISPUTE_STATUS_LABELS[status] ?? status.replace(/_/g, ' '),
          latest_request_type: DISPUTE_REQUEST_TYPE_LABELS[requestType] ?? requestType.replace(/_/g, ' '),
          latest_requested_resolution: DISPUTE_RESOLUTION_LABELS[resolution] ?? resolution.replace(/_/g, ' '),
        };
      });

      return res.json(formattedRows);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load disputes' });
    }
  });

  return router;
}

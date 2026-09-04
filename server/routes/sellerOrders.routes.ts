import express, { type RequestHandler } from 'express';
import { query } from '../postgres.js';
import { orderRepository, type StoredOrder } from '../modules/orders/order.repository.js';
import { paymentRepository } from '../modules/payments/payment.repository.js';
import { escrowRepository } from '../modules/escrow/escrow.repository.js';
import { serverOrderService } from '../modules/orders/order.service.js';

type SellerOrderRow = Record<string, unknown> & {
  payment_id?: string | null;
  payment_status?: string | null;
  payment_verified?: boolean | number | null;
  payment_reference_row?: string | null;
  escrow_state?: string | null;
  dispute_id?: string | null;
  dispute_escrow_id?: string | null;
  dispute_opened_by?: string | null;
  dispute_state?: string | null;
  dispute_reason?: string | null;
  dispute_created_at?: string | null;
  dispute_updated_at?: string | null;
  case_id?: string | null;
  case_status?: string | null;
  case_outcome?: string | null;
  case_window_ends_at?: string | null;
  case_opened_at?: string | null;
  latest_attempt_id?: string | null;
  latest_attempt_status?: string | null;
  latest_attempt_reason?: string | null;
  latest_attempt_resolution?: string | null;
  latest_attempt_requested_resolution?: string | null;
  refund_request_id?: string | null;
  refund_request_status?: string | null;
  refund_request_type?: string | null;
  refund_requested_amount?: number | null;
  refund_requested_resolution?: string | null;
  refund_window_ends_at?: string | null;
};

function parseJsonArray<T>(value: unknown, fallback: T[] = []): T[] {
  try {
    if (typeof value === 'string') return JSON.parse(value) as T[];
    return Array.isArray(value) ? value as T[] : fallback;
  } catch {
    return fallback;
  }
}

function rowToSellerOrder(row: SellerOrderRow): StoredOrder {
  const items = parseJsonArray<StoredOrder['items'][number]>(row.items);
  let buyerDetails: StoredOrder['buyerDetails'] = null;
  try {
    buyerDetails = row.buyer_details
      ? typeof row.buyer_details === 'string'
        ? JSON.parse(row.buyer_details) as StoredOrder['buyerDetails']
        : row.buyer_details as StoredOrder['buyerDetails']
      : null;
  } catch {
    buyerDetails = null;
  }

  const status = row.status as StoredOrder['status'];
  const deliveryStatus = status === 'fulfilled' || status === 'closed'
    ? 'delivered'
    : ((row.delivery_status as StoredOrder['deliveryStatus']) ?? 'action_required');

  return {
    id: row.id as string,
    buyerId: row.buyer_id as string,
    sellerId: row.seller_id as string,
    source: row.source as StoredOrder['source'],
    status,
    deliveryStatus,
    currency: row.currency as string,
    subtotal: { amount: Number(row.subtotal_amount ?? 0), currency: row.subtotal_currency as string },
    total: { amount: Number(row.total_amount ?? 0), currency: row.total_currency as string },
    paymentProvider: (row.payment_provider as StoredOrder['paymentProvider']) ?? undefined,
    settlementRoute: (row.settlement_route as StoredOrder['settlementRoute']) ?? null,
    paymentReference: (row.payment_reference as string | null) ?? null,
    checkoutIdempotencyKey: (row.checkout_idempotency_key as string | null) ?? null,
    checkoutRequestHash: (row.checkout_request_hash as string | null) ?? null,
    paymentCapturedAt: (row.paid_at as string | null) ?? null,
    capturedAt: (row.paid_at as string | null) ?? null,
    escrowId: (row.escrow_id as string | null) ?? null,
    items,
    buyerDetails,
    placedAt: (row.placed_at as string | null) ?? null,
    paidAt: (row.paid_at as string | null) ?? null,
    fulfilledAt: (row.fulfilled_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function buildPayment(row: SellerOrderRow) {
  if (!row.payment_id) return null;
  return {
    status: row.payment_status ?? null,
    verified: row.payment_verified === true || row.payment_verified === 1,
    reference: row.payment_reference_row ?? null,
  };
}

function buildEscrow(row: SellerOrderRow) {
  if (!row.escrow_state) return null;
  return { state: row.escrow_state };
}

function buildDispute(row: SellerOrderRow) {
  if (!row.dispute_id && !row.case_id) return null;
  return {
    id: row.dispute_id ?? row.case_id,
    caseId: row.case_id ?? null,
    orderId: row.id,
    escrowId: row.dispute_escrow_id ?? null,
    openedBy: row.dispute_opened_by ?? null,
    status: row.case_status ?? row.dispute_state ?? null,
    state: row.dispute_state ?? row.case_status ?? null,
    reason: row.latest_attempt_reason ?? row.dispute_reason ?? null,
    requestedResolution: row.latest_attempt_requested_resolution ?? row.refund_requested_resolution ?? null,
    outcome: row.case_outcome ?? null,
    windowEndsAt: row.case_window_ends_at ?? row.refund_window_ends_at ?? null,
    openedAt: row.case_opened_at ?? row.dispute_created_at ?? null,
    createdAt: row.dispute_created_at ?? row.case_opened_at ?? null,
    updatedAt: row.dispute_updated_at ?? null,
    latestAttempt: row.latest_attempt_id ? {
      id: row.latest_attempt_id,
      status: row.latest_attempt_status ?? null,
      reason: row.latest_attempt_reason ?? null,
      resolution: row.latest_attempt_resolution ?? null,
      requestedResolution: row.latest_attempt_requested_resolution ?? null,
    } : null,
  };
}

function buildRefundRequest(row: SellerOrderRow) {
  if (!row.refund_request_id) return null;
  return {
    id: row.refund_request_id,
    status: row.refund_request_status ?? null,
    requestType: row.refund_request_type ?? null,
    amountRequested: Number(row.refund_requested_amount ?? 0),
    requestedResolution: row.refund_requested_resolution ?? null,
    windowEndsAt: row.refund_window_ends_at ?? null,
  };
}

function buildSellerOrderBundle(row: SellerOrderRow, sellerUid: string) {
  const order = rowToSellerOrder(row);
  if (String(order.sellerId) !== sellerUid) return null;
  return {
    order,
    payment: buildPayment(row),
    escrow: buildEscrow(row),
    dispute: buildDispute(row),
    refundRequest: buildRefundRequest(row),
  };
}

const SELLER_ORDER_SELECT = `
  SELECT
    o.*,
    p.id AS payment_id,
    p.status AS payment_status,
    p.verified AS payment_verified,
    p.reference AS payment_reference_row,
    e.state AS escrow_state,
    d.id AS dispute_id,
    d.escrow_id AS dispute_escrow_id,
    d.opened_by AS dispute_opened_by,
    d.status AS dispute_state,
    d.reason AS dispute_reason,
    d.created_at AS dispute_created_at,
    d.updated_at AS dispute_updated_at,
    dc.id AS case_id,
    dc.status AS case_status,
    dc.outcome AS case_outcome,
    dc.window_ends_at AS case_window_ends_at,
    dc.opened_at AS case_opened_at,
    da.id AS latest_attempt_id,
    da.status AS latest_attempt_status,
    da.reason AS latest_attempt_reason,
    da.resolution_note AS latest_attempt_resolution,
    da.requested_resolution AS latest_attempt_requested_resolution,
    rr.id AS refund_request_id,
    rr.status AS refund_request_status,
    rr.request_type AS refund_request_type,
    rr.amount_requested AS refund_requested_amount,
    rr.requested_resolution AS refund_requested_resolution,
    rr.window_ends_at AS refund_window_ends_at
  FROM orders o
  LEFT JOIN payments p ON p.reference = o.payment_reference
  LEFT JOIN escrows e ON e.order_id = o.id
  LEFT JOIN LATERAL (
    SELECT id, escrow_id, opened_by, status, reason, created_at, updated_at
    FROM disputes
    WHERE disputes.order_id = o.id
    ORDER BY disputes.created_at DESC
    LIMIT 1
  ) d ON TRUE
  LEFT JOIN LATERAL (
    SELECT id, status, outcome, window_ends_at, opened_at
    FROM dispute_cases
    WHERE dispute_cases.order_id = o.id
    ORDER BY dispute_cases.created_at DESC
    LIMIT 1
  ) dc ON TRUE
  LEFT JOIN LATERAL (
    SELECT id, status, reason, resolution_note, requested_resolution
    FROM dispute_attempts
    WHERE dispute_attempts.case_id = dc.id
    ORDER BY dispute_attempts.created_at DESC
    LIMIT 1
  ) da ON TRUE
  LEFT JOIN LATERAL (
    SELECT id, status, request_type, amount_requested, requested_resolution, window_ends_at
    FROM refund_requests
    WHERE refund_requests.order_id = o.id
    ORDER BY refund_requests.created_at DESC
    LIMIT 1
  ) rr ON TRUE
`;

export function createSellerOrdersRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get('', requireAuth, async (req: any, res) => {
    try {
      const sellerUid = String(req.user?.uid ?? '').trim();
      if (!sellerUid) return res.status(401).json({ error: 'Authentication required' });
      const result = await query<SellerOrderRow>(`
        ${SELLER_ORDER_SELECT}
        WHERE o.seller_id = $1
          AND o.status NOT IN ('draft', 'pending_payment')
        ORDER BY o.created_at DESC
      `, [sellerUid]);
      const bundles = result.rows
        .map((row) => buildSellerOrderBundle(row, sellerUid))
        .filter((bundle): bundle is NonNullable<ReturnType<typeof buildSellerOrderBundle>> => Boolean(bundle));
      return res.json(bundles);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch seller orders' });
    }
  });

  router.get('/:id', requireAuth, async (req: any, res) => {
    try {
      const sellerUid = String(req.user?.uid ?? '').trim();
      const orderId = decodeURIComponent(String(req.params.id ?? '')).trim();
      if (!sellerUid) return res.status(401).json({ error: 'Authentication required' });
      if (!orderId) return res.status(400).json({ error: 'Order id is required' });
      const bundle = await buildSellerOrderBundleFromId(orderId, sellerUid);
      if (!bundle || ['draft', 'pending_payment'].includes(bundle.order.status)) return res.status(404).json({ error: 'Seller order not found' });
      return res.json(bundle);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch seller order' });
    }
  });

  router.post('/:id/mark-pending-delivery', requireAuth, async (req: any, res) => {
    try {
      const sellerUid = String(req.user?.uid ?? '').trim();
      const orderId = decodeURIComponent(String(req.params.id ?? '')).trim();
      if (!sellerUid) return res.status(401).json({ error: 'Authentication required' });
      if (!orderId) return res.status(400).json({ error: 'Order id is required' });
      const current = orderRepository.findById(orderId);
      if (!current || String(current.sellerId) !== sellerUid) return res.status(404).json({ error: 'Seller order not found' });
      if (['draft', 'pending_payment', 'cancelled', 'refunded', 'closed'].includes(current.status)) return res.status(400).json({ error: 'This order cannot be marked as pending delivery' });
      const updated = serverOrderService.markPendingDelivery(orderId);
      if (!updated) return res.status(404).json({ error: 'Seller order not found' });
      return res.json(await buildSellerOrderBundleFromId(updated.id, sellerUid));
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to mark order as pending delivery' });
    }
  });

  return router;
}

async function buildSellerOrderBundleFromId(orderId: string, sellerUid: string) {
  const order = await orderRepository.findByIdAsync(orderId);
  if (!order || String(order.sellerId) !== sellerUid) return null;

  const [payment, escrow, context] = await Promise.all([
    order.paymentReference ? paymentRepository.findByReferenceAsync(order.paymentReference) : Promise.resolve(undefined),
    escrowRepository.findByOrderIdAsync(order.id),
    query<Record<string, unknown>>(
      `
        ${SELLER_ORDER_SELECT.replace('FROM orders o', 'FROM orders o')}
        WHERE o.id = $1
        LIMIT 1
      `,
      [order.id],
    ).then((result) => result.rows[0] ?? null),
  ]);

  const row = (context ?? {}) as SellerOrderRow;
  return {
    order,
    payment: payment ? { status: payment.status, verified: payment.verified, reference: payment.reference } : null,
    escrow: escrow ? { state: escrow.state } : null,
    dispute: buildDispute({ ...row, id: order.id } as SellerOrderRow),
    refundRequest: buildRefundRequest({ ...row, id: order.id } as SellerOrderRow),
  };
}

import type { BuyerPaymentRecord } from './buyerState';
import type { OrderBundle } from './orderApi';

export type PaymentsStatus = 'pending' | 'paid' | 'rejected' | 'error';

export type PaymentOverviewRecord = {
  key: string;
  reference: string;
  title: string;
  amount: number;
  currency: string;
  status: PaymentsStatus;
  detail: string;
  updatedAt: string | null;
};

export type PaymentsOverview = {
  balance: {
    available: number;
    pending: number;
    paid: number;
    rejected: number;
    held: number;
  };
  statusCounts: Record<PaymentsStatus, number>;
  disputeCount: number;
  records: PaymentOverviewRecord[];
};

const SUCCESS_PAYMENT_STATUSES = new Set(['paid', 'captured', 'verified', 'successful', 'completed']);
const PENDING_PAYMENT_STATUSES = new Set(['pending', 'initiated', 'processing', 'queued', 'awaiting_payment']);
const REJECTED_PAYMENT_STATUSES = new Set(['rejected', 'cancelled', 'refunded']);
const ERROR_PAYMENT_STATUSES = new Set(['failed', 'error']);
const RELEASED_ESCROW_STATES = new Set(['released', 'closed']);
const HELD_ESCROW_STATES = new Set(['held', 'disputed']);
const AVAILABLE_ORDER_STATUSES = new Set(['fulfilled', 'closed']);
const PAID_ORDER_STATUSES = new Set(['paid', 'in_escrow', 'fulfilled', 'closed']);
const REJECTED_ORDER_STATUSES = new Set(['cancelled', 'refunded']);
const PENDING_ORDER_STATUSES = new Set(['draft', 'pending_payment']);

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function classifyOrderStatus(bundle: OrderBundle): PaymentsStatus {
  const orderStatus = normalizeToken(bundle.order?.status);
  const paymentStatus = normalizeToken(bundle.payment?.status);

  if (ERROR_PAYMENT_STATUSES.has(paymentStatus)) return 'error';
  if (REJECTED_PAYMENT_STATUSES.has(paymentStatus) || REJECTED_ORDER_STATUSES.has(orderStatus)) return 'rejected';
  if (PENDING_PAYMENT_STATUSES.has(paymentStatus) || PENDING_ORDER_STATUSES.has(orderStatus) || !paymentStatus) return 'pending';
  if (SUCCESS_PAYMENT_STATUSES.has(paymentStatus) || PAID_ORDER_STATUSES.has(orderStatus)) return 'paid';
  return 'pending';
}

function classifyStoredPaymentStatus(record: BuyerPaymentRecord): PaymentsStatus {
  if (record.status === 'captured') return 'paid';
  if (record.status === 'refunded' || record.status === 'cancelled') return 'rejected';
  if (record.status === 'failed') return 'error';
  return 'pending';
}

function getOrderReference(bundle: OrderBundle): string {
  if (typeof bundle.order?.paymentReference === 'string' && bundle.order.paymentReference.trim()) {
    return bundle.order.paymentReference;
  }
  return String(bundle.order?.id ?? 'Unknown reference');
}

function buildOrderDetail(bundle: OrderBundle): string {
  const escrowState = normalizeToken(bundle.escrow?.state);
  const orderStatus = String(bundle.order?.status ?? 'pending');

  if (HELD_ESCROW_STATES.has(escrowState)) {
    return escrowState === 'disputed' ? 'Funds are currently disputed.' : 'Funds are currently being held in escrow.';
  }

  if (RELEASED_ESCROW_STATES.has(escrowState) || AVAILABLE_ORDER_STATUSES.has(normalizeToken(bundle.order?.status))) {
    return 'Payment is complete and available in the finished order flow.';
  }

  return `Order status: ${orderStatus.replace(/_/g, ' ')}`;
}

function buildStoredPaymentDetail(record: BuyerPaymentRecord): string {
  if (record.status === 'captured') return 'Payment captured successfully.';
  if (record.status === 'failed') return 'Payment returned an error.';
  if (record.status === 'refunded') return 'Payment was refunded.';
  if (record.status === 'cancelled') return 'Payment was cancelled.';
  return 'Payment is still pending confirmation.';
}

export function summarizePayments(
  orders: OrderBundle[],
  buyerPayments: BuyerPaymentRecord[],
): PaymentsOverview {
  const summary: PaymentsOverview = {
    balance: {
      available: 0,
      pending: 0,
      paid: 0,
      rejected: 0,
      held: 0,
    },
    statusCounts: {
      pending: 0,
      paid: 0,
      rejected: 0,
      error: 0,
    },
    disputeCount: 0,
    records: [],
  };

  const seenReferences = new Set<string>();

  orders.forEach((bundle) => {
    const reference = getOrderReference(bundle);
    const amount = Number(bundle.order?.total?.amount ?? 0);
    const currency = String(bundle.order?.total?.currency ?? 'MWK');
    const status = classifyOrderStatus(bundle);
    const escrowState = normalizeToken(bundle.escrow?.state);
    const hasHeldBalance = HELD_ESCROW_STATES.has(escrowState) || normalizeToken(bundle.order?.status) === 'disputed' || Boolean(bundle.dispute);

    summary.statusCounts[status] += 1;
    if (status === 'pending') summary.balance.pending += amount;
    if (status === 'paid') summary.balance.paid += amount;
    if (status === 'rejected') summary.balance.rejected += amount;
    if (hasHeldBalance) {
      summary.balance.held += amount;
      summary.disputeCount += 1;
    }
    if (status === 'paid' && (RELEASED_ESCROW_STATES.has(escrowState) || AVAILABLE_ORDER_STATUSES.has(normalizeToken(bundle.order?.status)))) {
      summary.balance.available += amount;
    }

    summary.records.push({
      key: `order-${reference}`,
      reference,
      title: bundle.order?.items?.[0]?.title ?? 'Untitled order',
      amount,
      currency,
      status,
      detail: buildOrderDetail(bundle),
      updatedAt:
        typeof bundle.escrow?.updated_at === 'string'
          ? bundle.escrow.updated_at
          : typeof bundle.payment?.paid_at === 'string'
            ? bundle.payment.paid_at
            : null,
    });

    seenReferences.add(reference);
    if (bundle.order?.id) seenReferences.add(String(bundle.order.id));
  });

  buyerPayments.forEach((record) => {
    if (seenReferences.has(record.reference) || (record.orderId && seenReferences.has(String(record.orderId)))) {
      return;
    }

    const status = classifyStoredPaymentStatus(record);
    summary.statusCounts[status] += 1;

    if (status === 'pending') summary.balance.pending += Number(record.totalPrice ?? 0);
    if (status === 'paid') summary.balance.paid += Number(record.totalPrice ?? 0);
    if (status === 'rejected') summary.balance.rejected += Number(record.totalPrice ?? 0);
    if (status === 'paid' && record.deliveryConfirmed) {
      summary.balance.available += Number(record.totalPrice ?? 0);
    }

    summary.records.push({
      key: `payment-${record.reference}`,
      reference: record.reference,
      title: record.listingTitle,
      amount: Number(record.totalPrice ?? 0),
      currency: 'MWK',
      status,
      detail: buildStoredPaymentDetail(record),
      updatedAt: record.updatedAt ?? record.createdAt ?? null,
    });
  });

  summary.records.sort((left, right) => {
    const leftTime = left.updatedAt ? Date.parse(left.updatedAt) : 0;
    const rightTime = right.updatedAt ? Date.parse(right.updatedAt) : 0;
    return rightTime - leftTime;
  });

  return summary;
}

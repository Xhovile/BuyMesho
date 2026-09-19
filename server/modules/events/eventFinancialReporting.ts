import type { PgCompatDatabase } from "../../db.js";

type Row = Record<string, unknown>;

export type EventFinancialPayoutAttempt = {
  attemptNo: number;
  provider: string;
  providerChargeId: string;
  status: string;
  failureReason: string | null;
  providerReference: string | null;
  providerTransactionId: string | null;
  createdAt: string | null;
};

export type EventFinancialDestination = {
  id: string;
  destinationType: string | null;
  providerName: string | null;
  maskedAccount: string | null;
  verificationStatus: string | null;
  isActive: boolean;
};

export type EventFinancialPayout = {
  payoutId: string;
  eventId: string;
  eventCreatorUid: string;
  orderId: string | null;
  escrowId: string | null;
  releaseEntryId: string | null;
  status: string;
  provider: string | null;
  providerChargeId: string | null;
  providerReference: string | null;
  providerTransactionId: string | null;
  currency: string;
  grossAmount: number;
  platformFeeAmount: number;
  processingFeeAmount: number;
  reserveAmount: number;
  reserveCapAmount: number;
  manualAdjustmentAmount: number;
  payoutFeeAmount: number;
  netAmount: number;
  formulaVersion: string | null;
  destination: EventFinancialDestination | null;
  attempts: EventFinancialPayoutAttempt[];
  createdAt: string | null;
  requestedAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
};

export type EventFinancialLedgerEntry = {
  id: string;
  kind: "sale" | "refund" | "payout";
  direction: "inflow" | "outflow" | "neutral";
  movementType: "cash" | "obligation" | "none";
  amount: number;
  currency: string;
  status: string;
  occurredAt: string | null;
  orderId: string | null;
  escrowId: string | null;
  payoutId: string | null;
  reference: string | null;
  description: string;
};

export type EventFinancialReport = {
  event: {
    id: string;
    title: string;
    creatorUid: string;
    currency: string;
  };
  sales: {
    ticketsSold: number;
    ticketsRefunded: number;
    grossTicketRevenue: number;
    refundedAmount: number;
    unallocatedRefundedAmount: number;
    netSales: number;
  };
  fees: {
    buyMeshoCommission: number;
    processingFees: number;
    reserves: number;
    payoutFees: number;
    manualAdjustments: number;
  };
  payouts: {
    count: number;
    grossAmountRecorded: number;
    netPaidAmount: number;
    netPayableAmount: number;
    netPayoutAmount: number;
    byStatus: Record<string, { count: number; amount: number }>;
  };
  currentDestination: EventFinancialDestination | null;
  payoutHistory: EventFinancialPayout[];
  ledger: EventFinancialLedgerEntry[];
};

const SUCCESSFUL_PAYMENT_STATUSES = new Set(["captured", "paid", "verified", "successful", "completed"]);
const CANCELLED_TICKET_STATUSES = new Set(["cancelled"]);
const OUTSTANDING_PAYOUT_STATUSES = new Set([
  "pending_settlement",
  "eligible",
  "ready_for_payout",
  "queued",
  "processing",
  "pending",
  "held",
  "failed",
]);

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function isMissingSchemaError(error: unknown): boolean {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";
  return code === "42P01" || code === "42703" || code === "42704";
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseItems(value: unknown): Row[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: unknown): Row | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Row;
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Row : null;
  } catch {
    return null;
  }
}

function itemEventId(item: Row): string {
  return text(item.eventId ?? item.event_id);
}

function eventOrderItems(items: Row[], eventId: string): Row[] {
  return items.filter((item) => itemEventId(item) === eventId);
}

function itemRevenue(item: Row, fallbackTicketPrice: number): number {
  const unitPrice = item.unitPrice ?? item.unit_price;
  let unitAmount = typeof unitPrice === "object" && unitPrice !== null && !Array.isArray(unitPrice)
    ? numberValue((unitPrice as Row).amount)
    : numberValue(unitPrice);

  if (unitAmount <= 0) {
    unitAmount = numberValue(item.ticketPrice ?? item.ticket_price ?? fallbackTicketPrice);
  }

  const quantity = Math.max(1, numberValue(item.quantity) || 1);
  return Math.max(0, Math.round(unitAmount * quantity));
}

function successfulPayment(paymentRows: Row[]): Row | null {
  return paymentRows.find((payment) => {
    const status = text(payment.status).toLowerCase();
    return SUCCESSFUL_PAYMENT_STATUSES.has(status) || Number(payment.verified ?? 0) === 1;
  }) ?? null;
}

function paymentTimestamp(payment: Row | null, order: Row): string | null {
  return text(payment?.paid_at ?? payment?.updated_at ?? order.paid_at ?? order.updated_at ?? order.created_at) || null;
}

function parseEscrowEntries(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((entry): entry is Row => Boolean(entry) && typeof entry === "object");
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is Row => Boolean(entry) && typeof entry === "object")
      : [];
  } catch {
    return [];
  }
}

function loadRefundsForOrder(db: PgCompatDatabase, orderId: string): Array<{ id: string; amount: number; currency: string; occurredAt: string | null; reference: string | null; itemId: string | null }> {
  try {
    const rows = db.prepare(
      `SELECT rt.id, rt.amount, rt.currency, rt.status, rt.transaction_id, rt.executed_at, rt.created_at,
              rr.item_id
       FROM refund_transactions rt
       LEFT JOIN refund_requests rr ON rr.id = rt.refund_request_id
       WHERE rt.order_id = ?
         AND lower(rt.status) IN ('refunded', 'completed', 'successful')
       ORDER BY rt.created_at ASC, rt.id ASC`,
    ).all(orderId) as Row[];

    return rows.map((row) => ({
      id: text(row.id),
      amount: numberValue(row.amount),
      currency: text(row.currency) || "MWK",
      occurredAt: text(row.executed_at ?? row.created_at) || null,
      reference: text(row.transaction_id) || null,
      itemId: text(row.item_id) || null,
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}

function loadEscrowRefundsForOrder(db: PgCompatDatabase, orderId: string): Array<{ id: string; amount: number; currency: string; occurredAt: string | null; reference: string | null; itemId: string | null }> {
  try {
    const row = db.prepare(
      `SELECT id, balance_currency, entries
       FROM escrows
       WHERE order_id = ?
       LIMIT 1`,
    ).get(orderId) as Row | undefined;
    if (!row) return [];

    return parseEscrowEntries(row.entries)
      .filter((entry) => text(entry.entryType).toLowerCase() === "refund")
      .map((entry, index) => ({
        id: text(entry.id) || `escrow-refund-${text(row.id)}-${index + 1}`,
        amount: numberValue(entry.amount),
        currency: text(entry.currency ?? row.balance_currency) || "MWK",
        occurredAt: text(entry.createdAt) || null,
        reference: text(entry.reference) || null,
        itemId: text(entry.itemId ?? entry.item_id) || null,
      }));
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}

function destinationFor(db: PgCompatDatabase, row: Row): EventFinancialDestination | null {
  const id = text(row.destination_account_id);
  const ownerUid = text(row.event_creator_uid);
  if (!id || !ownerUid) return null;

  const destination = db.prepare(
    `SELECT id, destination_type, provider_name, masked_account, verification_status, is_active
     FROM seller_payout_accounts
     WHERE id = ?
       AND owner_type = 'event_creator'
       AND owner_uid = ?
     LIMIT 1`,
  ).get(id, ownerUid) as Row | undefined;

  if (!destination) return null;

  return {
    id: text(destination.id),
    destinationType: text(destination.destination_type) || null,
    providerName: text(destination.provider_name) || null,
    maskedAccount: text(destination.masked_account) || null,
    verificationStatus: text(destination.verification_status) || null,
    isActive: Number(destination.is_active ?? 0) === 1,
  };
}

function currentDestinationForEvent(db: PgCompatDatabase, eventId: string): EventFinancialDestination | null {
  const row = db.prepare(
    `SELECT spa.id, spa.destination_type, spa.provider_name, spa.masked_account,
            spa.verification_status, spa.is_active
     FROM events e
     LEFT JOIN seller_payout_accounts spa
       ON spa.id = e.payout_destination_id
      AND spa.owner_type = 'event_creator'
      AND spa.owner_uid = e.creator_uid
     WHERE e.id = ?
     LIMIT 1`,
  ).get(eventId) as Row | undefined;

  if (!row?.id) return null;

  return {
    id: text(row.id),
    destinationType: text(row.destination_type) || null,
    providerName: text(row.provider_name) || null,
    maskedAccount: text(row.masked_account) || null,
    verificationStatus: text(row.verification_status) || null,
    isActive: Number(row.is_active ?? 0) === 1,
  };
}

function payoutAmounts(row: Row) {
  const snapshot = parseJsonObject(row.formula_snapshot);
  const result = parseJsonObject(snapshot?.result);

  return {
    grossAmount: numberValue(result?.grossAmount ?? row.gross_amount ?? row.amount),
    platformFeeAmount: numberValue(result?.platformFeeAmount ?? row.platform_fee_amount),
    processingFeeAmount: numberValue(result?.processingFeeAmount ?? row.processing_fee_amount),
    reserveAmount: numberValue(result?.reserveAmount ?? row.reserve_amount),
    reserveCapAmount: numberValue(result?.reserveCapAmount ?? row.reserve_cap_amount),
    manualAdjustmentAmount: numberValue(result?.manualAdjustmentAmount ?? row.manual_adjustment_amount),
    payoutFeeAmount: numberValue(result?.payoutFeeAmount ?? row.payout_fee_amount),
    netAmount: numberValue(result?.netAmount ?? result?.sellerReceivesAmount ?? row.net_amount ?? row.amount),
    formulaVersion: text(snapshot?.formulaVersion) || null,
  };
}

function loadAttempts(db: PgCompatDatabase, payoutId: string): EventFinancialPayoutAttempt[] {
  const rows = db.prepare(
    `SELECT attempt_no, provider, provider_charge_id, status, failure_reason,
            request_payload, response_payload, created_at
     FROM payout_attempts
     WHERE payout_id = ?
     ORDER BY attempt_no ASC, created_at ASC`,
  ).all(payoutId) as Row[];

  return rows.map((row) => {
    const request = parseJsonObject(row.request_payload);
    const response = parseJsonObject(row.response_payload);
    return {
      attemptNo: numberValue(row.attempt_no),
      provider: text(row.provider),
      providerChargeId: text(row.provider_charge_id),
      status: text(row.status) || "unknown",
      failureReason: text(row.failure_reason) || null,
      providerReference: text(request?.providerReference ?? response?.providerReference ?? response?.provider_reference) || null,
      providerTransactionId: text(request?.providerTransactionId ?? response?.providerTransactionId ?? response?.provider_transaction_id) || null,
      createdAt: text(row.created_at) || null,
    };
  });
}

function loadOrderIds(db: PgCompatDatabase, eventId: string): string[] {
  const rows = db.prepare(
    `SELECT DISTINCT order_id
     FROM event_tickets
     WHERE event_id = ?
       AND order_id IS NOT NULL
     ORDER BY order_id`,
  ).all(eventId) as Row[];
  return rows.map((row) => text(row.order_id)).filter(Boolean);
}

export function getEventFinancialReport(db: PgCompatDatabase, eventId: string): EventFinancialReport | null {
  const normalizedEventId = text(eventId);
  if (!normalizedEventId) return null;

  const event = db.prepare(
    `SELECT id, creator_uid, event_title, ticket_price
     FROM events
     WHERE id = ?
     LIMIT 1`,
  ).get(normalizedEventId) as Row | undefined;

  const creatorUid = text(event?.creator_uid);
  if (!event?.id || !creatorUid) return null;

  const ticketRows = db.prepare(
    `SELECT id, order_id, status, purchase_date, updated_at
     FROM event_tickets
     WHERE event_id = ?
     ORDER BY purchase_date ASC, id ASC`,
  ).all(normalizedEventId) as Row[];

  const orderIds = loadOrderIds(db, normalizedEventId);
  const orderRows = orderIds.length
    ? db.prepare(
        `SELECT id, status, items, currency, total_currency, paid_at, updated_at, created_at
         FROM orders
         WHERE id IN (${orderIds.map(() => "?").join(",")})`,
      ).all(...orderIds) as Row[]
    : [];
  const paymentRows = orderIds.length
    ? db.prepare(
        `SELECT id, order_id, provider, method, status, reference, provider_reference,
                currency, amount, paid_at, verified, created_at, updated_at
         FROM payments
         WHERE order_id IN (${orderIds.map(() => "?").join(",")})
         ORDER BY created_at ASC, id ASC`,
      ).all(...orderIds) as Row[]
    : [];

  const orderMap = new Map(orderRows.map((row) => [text(row.id), row]));
  const paymentsByOrder = new Map<string, Row[]>();
  for (const payment of paymentRows) {
    const orderId = text(payment.order_id);
    if (!orderId) continue;
    const rows = paymentsByOrder.get(orderId) ?? [];
    rows.push(payment);
    paymentsByOrder.set(orderId, rows);
  }

  let ticketsSold = 0;
  let ticketsRefunded = 0;
  for (const ticket of ticketRows) {
    const status = text(ticket.status).toLowerCase();
    if (!CANCELLED_TICKET_STATUSES.has(status)) ticketsSold += 1;
    if (status === "refunded") ticketsRefunded += 1;
  }

  let grossTicketRevenue = 0;
  let unallocatedRefundedAmount = 0;
  const ledger: EventFinancialLedgerEntry[] = [];
  const refundIds = new Set<string>();

  for (const [orderId, order] of orderMap.entries()) {
    const allItems = parseItems(order.items);
    const items = eventOrderItems(allItems, normalizedEventId);
    if (items.length === 0) continue;

    const eventIdsInOrder = new Set(allItems.map(itemEventId).filter(Boolean));

    const payment = successfulPayment(paymentsByOrder.get(orderId) ?? []);
    const orderStatus = text(order.status).toLowerCase();
    const hasRecordedSale = Boolean(payment) || ["paid", "in_escrow", "fulfilled", "closed"].includes(orderStatus);
    if (!hasRecordedSale) continue;

    const gross = items.reduce((sum, item) => sum + itemRevenue(item, numberValue(event.ticket_price)), 0);
    grossTicketRevenue += gross;

    ledger.push({
      id: `sale-${normalizedEventId}-${orderId}`,
      kind: "sale",
      direction: "inflow",
      movementType: "cash",
      amount: gross,
      currency: text(payment?.currency ?? order.total_currency ?? order.currency) || "MWK",
      status: "paid",
      occurredAt: paymentTimestamp(payment, order),
      orderId,
      escrowId: null,
      payoutId: null,
      reference: text(payment?.reference) || null,
      description: `Ticket sale for ${text(event.event_title) || "event"}`,
    });

    const canonicalRefunds = loadRefundsForOrder(db, orderId);
    const refunds = canonicalRefunds.length ? canonicalRefunds : loadEscrowRefundsForOrder(db, orderId);

    for (const refund of refunds) {
      if (!refund.id || refundIds.has(refund.id)) continue;
      refundIds.add(refund.id);

      let refundBelongsToEvent = eventIdsInOrder.size === 1 && eventIdsInOrder.has(normalizedEventId);
      if (refund.itemId) {
        try {
          const ticketLink = db.prepare(
            `SELECT event_id
             FROM event_tickets
             WHERE id = ? OR code = ?
             LIMIT 1`,
          ).get(refund.itemId, refund.itemId) as Row | undefined;
          refundBelongsToEvent = text(ticketLink?.event_id) === normalizedEventId;
        } catch {
          refundBelongsToEvent = false;
        }
      }

      if (!refundBelongsToEvent) {
        unallocatedRefundedAmount += refund.amount;
        continue;
      }

      ledger.push({
        id: `refund-${refund.id}-${normalizedEventId}`,
        kind: "refund",
        direction: "outflow",
        movementType: "cash",
        amount: refund.amount,
        currency: refund.currency,
        status: "refunded",
        occurredAt: refund.occurredAt,
        orderId,
        escrowId: null,
        payoutId: null,
        reference: refund.reference,
        description: `Refund for ${text(event.event_title) || "event"} ticket sale`,
      });
    }
  }

  const payoutRows = db.prepare(
    `SELECT *
     FROM payouts
     WHERE event_id = ?
     ORDER BY created_at ASC, id ASC`,
  ).all(normalizedEventId) as Row[];

  let buyMeshoCommission = 0;
  let processingFees = 0;
  let reserves = 0;
  let payoutFees = 0;
  let manualAdjustments = 0;
  let grossAmountRecorded = 0;
  let netPaidAmount = 0;
  let netPayableAmount = 0;
  const byStatus: Record<string, { count: number; amount: number }> = {};
  const payoutHistory: EventFinancialPayout[] = [];

  for (const row of payoutRows) {
    const amounts = payoutAmounts(row);
    const status = text(row.status).toLowerCase() || "unknown";

    if (status !== "cancelled") {
      buyMeshoCommission += amounts.platformFeeAmount;
      processingFees += amounts.processingFeeAmount;
      reserves += amounts.reserveAmount;
      payoutFees += amounts.payoutFeeAmount;
      manualAdjustments += amounts.manualAdjustmentAmount;
      grossAmountRecorded += amounts.grossAmount;
      if (status === "paid") netPaidAmount += amounts.netAmount;
      if (OUTSTANDING_PAYOUT_STATUSES.has(status)) netPayableAmount += amounts.netAmount;
    }

    const bucket = byStatus[status] ?? { count: 0, amount: 0 };
    bucket.count += 1;
    bucket.amount += amounts.netAmount;
    byStatus[status] = bucket;

    const payoutId = text(row.id);
    payoutHistory.push({
      payoutId,
      eventId: normalizedEventId,
      eventCreatorUid: text(row.event_creator_uid),
      orderId: text(row.order_id) || null,
      escrowId: text(row.escrow_id) || null,
      releaseEntryId: text(row.release_entry_id) || null,
      status,
      provider: text(row.provider) || null,
      providerChargeId: text(row.provider_charge_id) || null,
      providerReference: text(row.provider_ref_id) || null,
      providerTransactionId: text(row.provider_transaction_id) || null,
      currency: text(row.currency) || "MWK",
      grossAmount: amounts.grossAmount,
      platformFeeAmount: amounts.platformFeeAmount,
      processingFeeAmount: amounts.processingFeeAmount,
      reserveAmount: amounts.reserveAmount,
      reserveCapAmount: amounts.reserveCapAmount,
      manualAdjustmentAmount: amounts.manualAdjustmentAmount,
      payoutFeeAmount: amounts.payoutFeeAmount,
      netAmount: amounts.netAmount,
      formulaVersion: amounts.formulaVersion,
      destination: destinationFor(db, row),
      attempts: loadAttempts(db, payoutId),
      createdAt: text(row.created_at) || null,
      requestedAt: text(row.requested_at) || null,
      paidAt: text(row.paid_at) || null,
      failedAt: text(row.failed_at) || null,
    });

    const payoutMovementType =
      status === "paid"
        ? "cash"
        : OUTSTANDING_PAYOUT_STATUSES.has(status)
          ? "obligation"
          : "none";
    const payoutDirection = status === "paid" ? "outflow" : "neutral";

    ledger.push({
      id: `payout-${payoutId}`,
      kind: "payout",
      direction: payoutDirection,
      movementType: payoutMovementType,
      amount: amounts.netAmount,
      currency: text(row.currency) || "MWK",
      status,
      occurredAt: text(row.paid_at ?? row.requested_at ?? row.created_at) || null,
      orderId: text(row.order_id) || null,
      escrowId: text(row.escrow_id) || null,
      payoutId,
      reference: text(row.provider_ref_id ?? row.provider_charge_id) || null,
      description: `Event payout ${payoutId}`,
    });
  }

  const refundedAmount = ledger
    .filter((entry) => entry.kind === "refund")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const netSales = Math.max(0, grossTicketRevenue - refundedAmount);

  const currency =
    text(ledger.find((entry) => entry.kind === "sale")?.currency) ||
    text(payoutHistory[0]?.currency) ||
    "MWK";

  ledger.sort((left, right) => {
    const leftTime = left.occurredAt ? new Date(left.occurredAt).getTime() : 0;
    const rightTime = right.occurredAt ? new Date(right.occurredAt).getTime() : 0;
    return rightTime - leftTime || left.id.localeCompare(right.id);
  });

  return {
    event: {
      id: normalizedEventId,
      title: text(event.event_title) || "Event",
      creatorUid,
      currency,
    },
    sales: {
      ticketsSold,
      ticketsRefunded,
      grossTicketRevenue,
      refundedAmount,
      unallocatedRefundedAmount,
      netSales,
    },
    fees: {
      buyMeshoCommission,
      processingFees,
      reserves,
      payoutFees,
      manualAdjustments,
    },
    payouts: {
      count: payoutRows.length,
      grossAmountRecorded,
      netPaidAmount,
      netPayableAmount,
      netPayoutAmount: netPaidAmount + netPayableAmount,
      byStatus,
    },
    currentDestination: currentDestinationForEvent(db, normalizedEventId),
    payoutHistory,
    ledger,
  };
}
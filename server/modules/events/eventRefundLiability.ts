import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { assertRefundTransition } from "../disputes/state-machine.js";
import { applySellerReversalDebit } from "../financial/sellerFinancialLedger.js";

type DbExecutor = Pick<PoolClient, "query">;

export type EventRefundStatus = "due" | "recovered" | "waived";

export type EventRefundLiability = {
  id: string;
  eventId: string;
  eventCreatorUid: string;
  orderId: string;
  ticketId: string | null;
  payoutId: string | null;
  refundRequestId: string;
  amount: number;
  currency: string;
  reason: string;
  status: EventRefundStatus;
  dueAt: string;
  recoveryReference: string | null;
  recoveryNote: string | null;
  recoveredBy: string | null;
  recoveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type OrderItem = {
  eventId?: unknown;
  event_id?: unknown;
  listingId?: unknown;
  listing_id?: unknown;
  kind?: unknown;
  ticketId?: unknown;
  ticket_id?: unknown;
  unitPrice?: unknown;
  ticketPrice?: unknown;
  tickets?: unknown;
};

function parseOrderItems(items: unknown): OrderItem[] {
  if (typeof items !== "string") return [];
  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is OrderItem => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      : [];
  } catch {
    return [];
  }
}

function isEventTicketItem(item: OrderItem): boolean {
  const eventId = String(item.eventId ?? item.event_id ?? "").trim();
  const listingId = String(item.listingId ?? item.listing_id ?? "").trim();
  return item.kind === "event_ticket" || (Boolean(eventId) && !listingId);
}

function resolveEventIds(items: unknown): string[] {
  return [...new Set(
    parseOrderItems(items)
      .filter(isEventTicketItem)
      .map((item) => String(item.eventId ?? item.event_id ?? "").trim())
      .filter((eventId) => /^\d+$/.test(eventId)),
  )];
}

function hasNonEventItems(items: unknown): boolean {
  const parsed = parseOrderItems(items);
  return parsed.length > 0 && parsed.some((item) => !isEventTicketItem(item));
}

function numberFromMoney(value: unknown): number | null {
  if (value && typeof value === "object" && !Array.isArray(value) && "amount" in value) {
    const amount = Number((value as Record<string, unknown>).amount);
    return Number.isFinite(amount) ? amount : null;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function itemUnitPrice(item: OrderItem, fallbackTicketPrice: number): number | null {
  const amount = numberFromMoney(item.unitPrice);
  if (amount != null && amount >= 0) return amount;
  const ticketPrice = numberFromMoney(item.ticketPrice);
  if (ticketPrice != null && ticketPrice >= 0) return ticketPrice;
  return fallbackTicketPrice >= 0 ? fallbackTicketPrice : null;
}

function findTicketValue(items: unknown, eventId: string, orderId: string, ticketId: string, fallbackTicketPrice: number): number | null {
  for (const item of parseOrderItems(items).filter(isEventTicketItem)) {
    if (String(item.eventId ?? item.event_id ?? "").trim() !== eventId) continue;
    const unitPrice = itemUnitPrice(item, fallbackTicketPrice);
    if (unitPrice == null) continue;
    const nestedTickets = Array.isArray(item.tickets)
      ? item.tickets.filter((ticket): ticket is Record<string, unknown> => Boolean(ticket) && typeof ticket === "object" && !Array.isArray(ticket))
      : [];
    if (nestedTickets.length > 0) {
      for (const ticket of nestedTickets) {
        const candidateIds = [ticket.ticketId, ticket.ticket_id, ticket.id, ticket.code]
          .map((value) => String(value ?? "").trim())
          .filter(Boolean);
        if (candidateIds.includes(ticketId)) return unitPrice;
      }
      continue;
    }
    const itemTicketId = String(item.ticketId ?? item.ticket_id ?? "").trim();
    if (itemTicketId && itemTicketId === ticketId) return unitPrice;
    const fallbackId = `${orderId}-${eventId}`;
    if (!itemTicketId && ticketId === fallbackId) return unitPrice;
  }
  return null;
}

function rowToLiability(row: Record<string, unknown>): EventRefundLiability {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    eventCreatorUid: String(row.event_creator_uid),
    orderId: String(row.order_id),
    ticketId: row.ticket_id == null ? null : String(row.ticket_id),
    payoutId: row.payout_id == null ? null : String(row.payout_id),
    refundRequestId: String(row.refund_request_id),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "MWK"),
    reason: String(row.reason ?? ""),
    status: String(row.status ?? "due") as EventRefundStatus,
    dueAt: String(row.due_at),
    recoveryReference: row.recovery_reference == null ? null : String(row.recovery_reference),
    recoveryNote: row.recovery_note == null ? null : String(row.recovery_note),
    recoveredBy: row.recovered_by == null ? null : String(row.recovered_by),
    recoveredAt: row.recovered_at == null ? null : String(row.recovered_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function resolveEventRefundContext(
  orderId: string,
  client: DbExecutor,
): Promise<{
  eventId: string;
  eventCreatorUid: string;
  currency: string;
  payoutId: string | null;
}> {
  const orderResult = await client.query<{
    seller_id: string | null;
    items: string | null;
    total_currency: string | null;
  }>(
    "SELECT seller_id, items, total_currency FROM orders WHERE id = $1 LIMIT 1",
    [orderId],
  );
  const order = orderResult.rows[0];
  if (!order) throw new Error("Order not found");

  const eventIds = resolveEventIds(order.items);
  if (eventIds.length === 0) throw new Error("The order is not an event-ticket order");
  if (hasNonEventItems(order.items)) {
    throw new Error("An event refund cannot be attached to a mixed event/listing order");
  }
  if (eventIds.length > 1) {
    throw new Error("An event refund cannot span multiple events");
  }

  const eventResult = await client.query<{
    creator_uid: string | null;
  }>(
    "SELECT creator_uid FROM events WHERE id = $1 LIMIT 1",
    [Number(eventIds[0])],
  );
  const event = eventResult.rows[0];
  if (!event?.creator_uid) throw new Error("Event creator not found");
  if (order.seller_id !== event.creator_uid) {
    throw new Error("Event creator does not match the order owner");
  }

  const payoutResult = await client.query<{
    id: string;
    status: string;
  }>(
    `SELECT id, status
       FROM payouts
      WHERE order_id = $1
        AND (owner_type = 'event_creator' OR event_id IS NOT NULL)
      ORDER BY created_at DESC
      LIMIT 1`,
    [orderId],
  );

  return {
    eventId: eventIds[0]!,
    eventCreatorUid: event.creator_uid,
    currency: String(order.total_currency ?? "MWK").toUpperCase(),
    payoutId: payoutResult.rows[0]?.id ? String(payoutResult.rows[0].id) : null,
  };
}

export async function validateEventRefundRequest(
  client: DbExecutor,
  input: {
    orderId: string;
    ticketId?: string | null;
    amount: number;
  },
): Promise<{
  eventId: string;
  eventCreatorUid: string;
  currency: string;
  payoutId: string | null;
  ticketId: string | null;
}> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Event refund amount must be positive");
  }

  const context = await resolveEventRefundContext(input.orderId, client);
  const orderResult = await client.query<{
    total_amount: number | string | null;
    items: string | null;
  }>(
    "SELECT total_amount, items FROM orders WHERE id = $1 LIMIT 1",
    [input.orderId],
  );
  const totalAmount = Number(orderResult.rows[0]?.total_amount ?? 0);
  if (!(totalAmount > 0) || input.amount > totalAmount) {
    throw new Error("Event refund amount cannot exceed the order total");
  }

  let ticketId: string | null = null;
  if (input.ticketId) {
    const ticketResult = await client.query<{ id: string; event_id: number }>(
      `SELECT id, event_id
         FROM event_tickets
        WHERE (id = $1 OR code = $1)
          AND order_id = $2
          AND event_id = $3
        LIMIT 1`,
      [input.ticketId, input.orderId, Number(context.eventId)],
    );
    if (!ticketResult.rows[0]) throw new Error("Event refund ticket does not belong to the order");
    ticketId = String(ticketResult.rows[0].id);
    const eventResult = await client.query<{ ticket_price: number | string | null }>(
      "SELECT ticket_price FROM events WHERE id = $1 LIMIT 1",
      [Number(context.eventId)],
    );
    const fallbackTicketPrice = Number(eventResult.rows[0]?.ticket_price ?? NaN);
    const ticketValue = findTicketValue(
      orderResult.rows[0]?.items,
      context.eventId,
      input.orderId,
      ticketId,
      fallbackTicketPrice,
    );
    if (ticketValue == null) throw new Error("Unable to determine the value of the selected event ticket");
    if (input.amount > ticketValue + 0.000001) throw new Error("Event refund amount cannot exceed the selected ticket value");
  } else if (Math.abs(input.amount - totalAmount) > 0.000001) {
    throw new Error("Partial event refunds require a specific ticket");
  }

  return { ...context, ticketId };
}

export async function createEventRefundLiability(
  client: DbExecutor,
  input: {
    orderId: string;
    refundRequestId: string;
    ticketId?: string | null;
    amount: number;
    reason: string;
  },
): Promise<EventRefundLiability> {
  const validated = await validateEventRefundRequest(client, input);

  const existingResult = await client.query<Record<string, unknown>>(
    "SELECT * FROM event_refund_liabilities WHERE refund_request_id = $1 LIMIT 1 FOR UPDATE",
    [input.refundRequestId],
  );
  const existing = existingResult.rows[0];
  if (existing) {
    const liability = rowToLiability(existing);
    if (
      liability.orderId !== input.orderId ||
      liability.eventId !== validated.eventId ||
      liability.eventCreatorUid !== validated.eventCreatorUid ||
      liability.ticketId !== validated.ticketId ||
      Math.abs(liability.amount - input.amount) > 0.000001
    ) {
      throw new Error("Existing event refund liability does not match the refund request");
    }
    return liability;
  }

  const id = `event-liability-${randomUUID()}`;
  const now = new Date().toISOString();
  await client.query(
    `INSERT INTO event_refund_liabilities (
       id, event_id, event_creator_uid, order_id, ticket_id, payout_id,
       refund_request_id, amount, currency, reason, status, due_at, created_at, updated_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'due',$11,$11,$11
     )`,
    [
      id,
      Number(validated.eventId),
      validated.eventCreatorUid,
      input.orderId,
      validated.ticketId,
      validated.payoutId,
      input.refundRequestId,
      input.amount,
      validated.currency,
      input.reason,
      now,
    ],
  );

  const result = await client.query<Record<string, unknown>>(
    "SELECT * FROM event_refund_liabilities WHERE id = $1 LIMIT 1",
    [id],
  );
  if (!result.rows[0]) throw new Error("Failed to create event refund liability");
  return rowToLiability(result.rows[0]);
}

export async function recordEventRefundRecovery(
  client: DbExecutor,
  input: {
    liabilityId: string;
    actorId: string;
    transactionId: string;
    amount: number;
    refundMethod: string;
    refundDate: string;
    destination?: string | null;
    note: string;
    evidence?: string[];
  },
): Promise<{
  duplicate: boolean;
  liability: EventRefundLiability;
  refundTransactionId: string;
}> {
  const liabilityResult = await client.query<Record<string, unknown>>(
    "SELECT * FROM event_refund_liabilities WHERE id = $1 LIMIT 1 FOR UPDATE",
    [input.liabilityId],
  );
  const liabilityRow = liabilityResult.rows[0];
  if (!liabilityRow) throw new Error("Event refund liability not found");

  const liability = rowToLiability(liabilityRow);
  if (liability.status === "recovered") {
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM refund_transactions WHERE refund_request_id = $1 AND status = 'refunded' ORDER BY created_at DESC LIMIT 1",
      [liability.refundRequestId],
    );
    return {
      duplicate: true,
      liability,
      refundTransactionId: existing.rows[0]?.id ?? "",
    };
  }
  if (liability.status !== "due") throw new Error(`Event refund liability is ${liability.status}`);
  assertRefundTransition("owed", "refunded", "admin");
  if (!Number.isFinite(input.amount) || Math.abs(input.amount - liability.amount) > 0.000001) {
    throw new Error("Recovery amount must exactly match the outstanding event refund liability");
  }

  const duplicateTransaction = await client.query<Record<string, unknown>>(
    "SELECT id FROM refund_transactions WHERE transaction_id = $1 LIMIT 1 FOR UPDATE",
    [input.transactionId],
  );
  if (duplicateTransaction.rows[0]) {
    throw new Error("This refund transaction ID has already been recorded");
  }

  const now = new Date().toISOString();
  const refundTransactionId = `rft-${randomUUID()}`;
  const evidence = Array.isArray(input.evidence) ? input.evidence.filter(Boolean).slice(0, 20) : [];

  const payoutStatusResult = liability.payoutId
    ? await client.query<{ status: string }>(
        "SELECT status FROM payouts WHERE id = $1 LIMIT 1",
        [liability.payoutId],
      )
    : { rows: [] as Array<{ status: string }> };
  const payoutWasPaid = String(payoutStatusResult.rows[0]?.status ?? "").toLowerCase() === "paid";

  const financialDebit = payoutWasPaid
    ? await applySellerReversalDebit(client, {
        sellerUid: liability.eventCreatorUid,
        currency: liability.currency,
        amount: liability.amount,
        reason: `Post-payout event refund for liability ${liability.id}`,
        actorType: "admin",
        actorId: input.actorId,
        payoutId: liability.payoutId,
        refundLiabilityId: liability.id,
        reference: input.transactionId,
        idempotencyKey: `event-refund-liability:${liability.id}`,
        metadata: {
          refundRequestId: liability.refundRequestId,
          orderId: liability.orderId,
          eventId: liability.eventId,
        },
      })
    : null;

  await client.query(
    `INSERT INTO refund_transactions (
       id, refund_request_id, order_id, buyer_id, seller_id, amount, currency,
       destination, payment_method, provider, transaction_id, status, executed_by,
       executed_at, supporting_evidence, metadata, created_at, updated_at
     )
     SELECT $1, rr.id, rr.order_id, rr.buyer_id, rr.seller_id, $2, $3, $4, $5,
            'manual_event_refund', $6, 'refunded', $7, ($8::date)::timestamptz,
            $9, $10, $11, $11
       FROM refund_requests rr
      WHERE rr.id = $12`,
    [
      refundTransactionId,
      input.amount,
      liability.currency,
      input.destination?.trim() || null,
      input.refundMethod,
      input.transactionId,
      input.actorId,
      input.refundDate,
      JSON.stringify(evidence),
      JSON.stringify({
        source: "phase_11_admin_event_refund_recovery",
        liabilityId: liability.id,
        note: input.note,
      }),
      now,
      liability.refundRequestId,
    ],
  );

  const transactionCheck = await client.query("SELECT 1 FROM refund_transactions WHERE id = $1 LIMIT 1", [refundTransactionId]);
  if (!transactionCheck.rows[0]) throw new Error("Refund transaction could not be recorded");

  await client.query(
    `UPDATE event_refund_liabilities
        SET status = 'recovered',
            recovery_reference = $1,
            recovery_note = $2,
            recovered_by = $3,
            recovered_at = $4,
            updated_at = $4
      WHERE id = $5`,
    [input.transactionId, input.note, input.actorId, now, liability.id],
  );

  await client.query(
    `UPDATE refund_requests
        SET status = 'refunded',
            refund_transaction_id = $1,
            event_liability_id = $2,
            latest_status_at = $3,
            updated_at = $3
      WHERE id = $4`,
    [refundTransactionId, liability.id, now, liability.refundRequestId],
  );

  const attempt = await client.query<{ id: string }>(
    `SELECT id
       FROM dispute_attempts
      WHERE case_id = (
        SELECT dispute_case_id FROM refund_requests WHERE id = $1 LIMIT 1
      )
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE`,
    [liability.refundRequestId],
  );

  if (attempt.rows[0]) {
    await client.query(
      `UPDATE dispute_attempts
          SET status = 'resolved',
              decision = 'event_refund_recovered',
              resolution_note = $1,
              resolved_by = $2,
              resolved_at = $3,
              updated_at = $3
        WHERE id = $4`,
      [input.note, input.actorId, now, attempt.rows[0].id],
    );
  }

  await client.query(
    `UPDATE dispute_cases
        SET status = 'resolved',
            outcome = 'event_refund_recovered',
            resolved_by = $1,
            resolved_at = $2,
            updated_at = $2
      WHERE id = (
        SELECT dispute_case_id FROM refund_requests WHERE id = $3 LIMIT 1
      )
      AND status IN ('open','under_review')`,
    [input.actorId, now, liability.refundRequestId],
  );

  await client.query(
    `UPDATE disputes
        SET status='resolved',
            state='resolved',
            resolution=$1,
            resolved_by=$2,
            resolved_at=$3,
            updated_at=$3
      WHERE order_id=$4
        AND status IN ('open','under_review','awaiting_response')`,
    [input.note, input.actorId, now, liability.orderId],
  );

  if (liability.ticketId) {
    await client.query(
      `UPDATE event_tickets
          SET status = 'Refunded',
              updated_at = $1
        WHERE id = $2
          AND order_id = $3`,
      [now, liability.ticketId, liability.orderId],
    );
  } else {
    await client.query(
      `UPDATE event_tickets
          SET status = 'Refunded',
              updated_at = $1
        WHERE order_id = $2
          AND event_id = $3
          AND status <> 'Cancelled'`,
      [now, liability.orderId, Number(liability.eventId)],
    );
  }

  const remainingTickets = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM event_tickets
      WHERE order_id = $1
        AND status NOT IN ('Cancelled','Refunded')`,
    [liability.orderId],
  );

  if (Number(remainingTickets.rows[0]?.count ?? 0) === 0) {
    await client.query(
      "UPDATE orders SET status='refunded', updated_at=$1 WHERE id=$2",
      [now, liability.orderId],
    );
  }

  if (liability.payoutId) {
    await client.query(
      `INSERT INTO payout_events (
         payout_id, seller_id, event_type, actor_type, actor_id, note, payload, created_at
       ) VALUES (
         $1,$2,'event_refund_recovered','admin',$3,$4,$5,$6
       )`,
      [
        liability.payoutId,
        liability.eventCreatorUid,
        input.actorId,
        input.note,
        JSON.stringify({
          liabilityId: liability.id,
          refundRequestId: liability.refundRequestId,
          amount: liability.amount,
          transactionId: input.transactionId,
        }),
        now,
      ],
    );
  }

  await client.query(
    `INSERT INTO audit_events (
       id, entity_type, entity_id, event_type, performed_by, timestamp,
       previous_state, new_state, metadata
     ) VALUES (
       $1,'event_refund_liability',$2,'event_refund_recovered',$3,$4,'due','recovered',$5
     )`,
    [
      `aud_${randomUUID()}`,
      liability.id,
      input.actorId,
      now,
      JSON.stringify({
        orderId: liability.orderId,
        eventId: liability.eventId,
        ticketId: liability.ticketId,
        payoutId: liability.payoutId,
        refundRequestId: liability.refundRequestId,
        amount: liability.amount,
        transactionId: input.transactionId,
        refundMethod: input.refundMethod,
        refundDate: input.refundDate,
        payoutWasPaid,
        financialReserveUsed: financialDebit?.reserveUsed ?? 0,
        financialNegativeCreated: financialDebit?.negativeCreated ?? 0,
      }),
    ],
  );

  const refreshed = await client.query<Record<string, unknown>>(
    "SELECT * FROM event_refund_liabilities WHERE id = $1 LIMIT 1",
    [liability.id],
  );

  return {
    duplicate: false,
    liability: rowToLiability(refreshed.rows[0] ?? { ...liabilityRow, status: "recovered", recovered_by: input.actorId, recovery_reference: input.transactionId }),
    refundTransactionId,
  };
}

export async function listEventRefundLiabilities(
  client: DbExecutor,
  filters: { status?: EventRefundStatus; eventId?: string | null } = {},
): Promise<EventRefundLiability[]> {
  const clauses = ["1 = 1"];
  const params: unknown[] = [];
  if (filters.status) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }
  if (filters.eventId) {
    params.push(Number(filters.eventId));
    clauses.push(`event_id = $${params.length}`);
  }

  const result = await client.query<Record<string, unknown>>(
    `SELECT *
       FROM event_refund_liabilities
      WHERE ${clauses.join(" AND ")}
      ORDER BY created_at DESC`,
    params,
  );
  return result.rows.map(rowToLiability);
}

import express, { type RequestHandler } from 'express';
import { query } from '../postgres.js';
import { orderRepository, type StoredOrder } from '../modules/orders/order.repository.js';
import { paymentRepository, type StoredPayment } from '../modules/payments/payment.repository.js';
import { escrowRepository, type StoredEscrow } from '../modules/escrow/escrow.repository.js';
import { getPaymentDb } from "../postgresCompat.js";
import { createTicketCredential } from "../modules/events/ticketCredential.js";

function jsonError(error: unknown, fallback: string): { error: string } {
  return { error: error instanceof Error ? error.message : fallback };
}

type OrderLookupResult = {
  order: StoredOrder;
  payment: StoredPayment | null;
  escrow: StoredEscrow | null;
  dispute: Record<string, unknown> | null;
  ticketCredentials?: Record<string, string>;
};

async function findOrderByParam(param: string) {
  const byId = await orderRepository.findByIdAsync(param);
  if (byId) return byId;
  return orderRepository.findByPaymentReferenceAsync(param);
}

async function buildEventTicketCredentials(order: StoredOrder): Promise<Record<string, string>> {
  if (order.source !== "event") return {};

  const db = getPaymentDb();
  const rows = db.prepare(`
    SELECT id, code, event_id
    FROM event_tickets
    WHERE order_id = ?
    ORDER BY id ASC
  `).all(order.id) as Array<{ id?: unknown; code?: unknown; event_id?: unknown }>;

  const credentials: Record<string, string> = {};
  for (const row of rows) {
    const ticketId = String(row.code ?? row.id ?? "").trim();
    const eventId = String(row.event_id ?? "").trim();
    if (!ticketId || !eventId) continue;
    try {
      credentials[ticketId] = createTicketCredential({
        ticketId,
        eventId,
        orderId: order.id,
        issuedAt: order.paidAt ? Math.floor(new Date(order.paidAt).getTime() / 1000) : undefined,
      });
      if (row.id && String(row.id) !== ticketId) credentials[String(row.id)] = credentials[ticketId]!;
    } catch (error) {
      console.warn("[ticket-credential] unable to issue credential for ticket", ticketId, error);
    }
  }

  return credentials;
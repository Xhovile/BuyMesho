import type { OrderState } from '../../../src/modules/orders/orderState.js';
import { getPaymentDb } from '../../postgresCompat.js';
import { projectEventTickets } from './eventTicketProjection.js';

export interface StoredOrder extends OrderState {
  paymentReference?: string | null;
  paymentCapturedAt?: string | null;
  capturedAt?: string | null;
  checkoutIdempotencyKey?: string | null;
  checkoutRequestHash?: string | null;
}

export class PostgresOrderRepository {
  private get db() {
    return getPaymentDb();
  }

  save(order: StoredOrder): StoredOrder {
    const now = new Date().toISOString();
    const paidAt = order.status === 'paid' ? (order.paidAt ?? now) : (order.paidAt ?? null);

    const stored: StoredOrder = {
      ...order,
      paidAt,
    };

    this.db.prepare(`
      INSERT INTO orders (id, buyer_id, seller_id, source, status, currency, subtotal_amount, subtotal_currency, total_amount, total_currency, payment_provider, settlement_route, payment_reference, checkout_idempotency_key, checkout_request_hash, escrow_id, items, placed_at, paid_at, fulfilled_at, created_at, updated_at)
      VALUES (@id, @buyer_id, @seller_id, @source, @status, @currency, @subtotal_amount, @subtotal_currency, @total_amount, @total_currency, @payment_provider, @settlement_route, @payment_reference, @checkout_idempotency_key, @checkout_request_hash, @escrow_id, @items, @placed_at, @paid_at, @fulfilled_at, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        payment_provider = excluded.payment_provider,
        settlement_route = excluded.settlement_route,
        payment_reference = excluded.payment_reference,
        checkout_idempotency_key = excluded.checkout_idempotency_key,
        checkout_request_hash = excluded.checkout_request_hash,
        escrow_id = excluded.escrow_id,
        paid_at = excluded.paid_at,
        fulfilled_at = excluded.fulfilled_at,
        updated_at = excluded.updated_at,
        items = excluded.items
    `).run({
      id: stored.id,
      buyer_id: stored.buyerId,
      seller_id: stored.sellerId,
      source: stored.source,
      status: stored.status,
      currency: stored.currency,
      subtotal_amount: stored.subtotal.amount,
      subtotal_currency: stored.subtotal.currency,
      total_amount: stored.total.amount,
      total_currency: stored.total.currency,
      payment_provider: stored.paymentProvider ?? null,
      settlement_route: stored.settlementRoute ?? null,
      payment_reference: stored.paymentReference ?? null,
      checkout_idempotency_key: stored.checkoutIdempotencyKey ?? null,
      checkout_request_hash: stored.checkoutRequestHash ?? null,
      escrow_id: stored.escrowId ?? null,
      items: JSON.stringify(stored.items),
      placed_at: stored.placedAt ?? null,
      paid_at: paidAt,
      fulfilled_at: stored.fulfilledAt ?? null,
      created_at: stored.createdAt,
      updated_at: stored.updatedAt ?? now,
    });

    projectEventTickets(stored);
    return stored;
  }

  findById(id: string): StoredOrder | undefined {
    const row = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.rowToOrder(row);
  }

  findByPaymentReference(reference: string): StoredOrder | undefined {
    const row = this.db.prepare('SELECT * FROM orders WHERE payment_reference = ?').get(reference) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.rowToOrder(row);
  }

  findByCheckoutIdempotencyKey(buyerId: string, key: string): StoredOrder | undefined {
    const row = this.db
      .prepare('SELECT * FROM orders WHERE buyer_id = ? AND checkout_idempotency_key = ? LIMIT 1')
      .get(buyerId, key) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.rowToOrder(row);
  }

  update(id: string, updater: (order: StoredOrder) => StoredOrder): StoredOrder | undefined {
    const current = this.findById(id);
    if (!current) return undefined;
    const next = updater(current);
    return this.save(next);
  }

  updateByPaymentReference(reference: string, updater: (order: StoredOrder) => StoredOrder): StoredOrder | undefined {
    const current = this.findByPaymentReference(reference);
    if (!current) return undefined;
    return this.save(updater(current));
  }

  clear(): void {
    this.db.prepare('DELETE FROM orders').run();
  }

  private rowToOrder(row: Record<string, unknown>): StoredOrder {
    let items: StoredOrder['items'];
    try {
      items = JSON.parse((row.items as string | null) ?? '[]') as StoredOrder['items'];
    } catch {
      items = [];
    }

    return {
      id: row.id as string,
      buyerId: row.buyer_id as string,
      sellerId: row.seller_id as string,
      source: row.source as StoredOrder['source'],
      status: row.status as StoredOrder['status'],
      currency: row.currency as string,
      subtotal: { amount: row.subtotal_amount as number, currency: row.subtotal_currency as string },
      total: { amount: row.total_amount as number, currency: row.total_currency as string },
      paymentProvider: (row.payment_provider as StoredOrder['paymentProvider']) ?? undefined,
      settlementRoute: (row.settlement_route as StoredOrder['settlementRoute']) ?? null,
      paymentReference: (row.payment_reference as string | null) ?? null,
      checkoutIdempotencyKey: (row.checkout_idempotency_key as string | null) ?? null,
      checkoutRequestHash: (row.checkout_request_hash as string | null) ?? null,
      paymentCapturedAt: (row.paid_at as string | null) ?? null,
      capturedAt: (row.paid_at as string | null) ?? null,
      escrowId: (row.escrow_id as string | null) ?? null,
      items,
      placedAt: (row.placed_at as string | null) ?? null,
      paidAt: (row.paid_at as string | null) ?? null,
      fulfilledAt: (row.fulfilled_at as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

export const orderRepository = new PostgresOrderRepository();
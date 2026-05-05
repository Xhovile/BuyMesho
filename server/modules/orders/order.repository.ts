import type { OrderState } from '../../../src/modules/orders/orderState.js';
import { getPaymentDb } from '../../sqlite.js';

export interface StoredOrder extends OrderState {
  paymentReference?: string | null;
}

export class SqliteOrderRepository {
  private get db() {
    return getPaymentDb();
  }

  save(order: StoredOrder): StoredOrder {
    this.db.prepare(`
      INSERT INTO orders (id, buyer_id, seller_id, source, status, currency, subtotal_amount, subtotal_currency, total_amount, total_currency, payment_provider, payment_reference, escrow_id, items, placed_at, paid_at, fulfilled_at, created_at, updated_at)
      VALUES (@id, @buyer_id, @seller_id, @source, @status, @currency, @subtotal_amount, @subtotal_currency, @total_amount, @total_currency, @payment_provider, @payment_reference, @escrow_id, @items, @placed_at, @paid_at, @fulfilled_at, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        payment_provider = excluded.payment_provider,
        payment_reference = excluded.payment_reference,
        escrow_id = excluded.escrow_id,
        paid_at = excluded.paid_at,
        fulfilled_at = excluded.fulfilled_at,
        updated_at = excluded.updated_at
    `).run({
      id: order.id,
      buyer_id: order.buyerId,
      seller_id: order.sellerId,
      source: order.source,
      status: order.status,
      currency: order.currency,
      subtotal_amount: order.subtotal.amount,
      subtotal_currency: order.subtotal.currency,
      total_amount: order.total.amount,
      total_currency: order.total.currency,
      payment_provider: order.paymentProvider ?? null,
      payment_reference: order.paymentReference ?? null,
      escrow_id: order.escrowId ?? null,
      items: JSON.stringify(order.items),
      placed_at: order.placedAt ?? null,
      paid_at: order.paidAt ?? null,
      fulfilled_at: order.fulfilledAt ?? null,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    });
    return order;
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

  update(id: string, updater: (order: StoredOrder) => StoredOrder): StoredOrder | undefined {
    const current = this.findById(id);
    if (!current) return undefined;
    const next = updater(current);
    return this.save(next);
  }

  async updateByPaymentReference(reference: string, updater: (order: StoredOrder) => StoredOrder, client?: Queryable): Promise<StoredOrder | undefined> {
    const current = await this.findByPaymentReference(reference, client);
    if (!current) return undefined;
    return this.save(updater(current), client);
  }

  clear(): void {
    this.orders.clear();
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
      paymentReference: (row.payment_reference as string | null) ?? null,
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

export const orderRepository = new SqliteOrderRepository();

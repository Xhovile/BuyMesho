import type { PoolClient } from 'pg';
import { query } from '../../db';
import type { OrderState } from '../../../src/modules/orders/orderState';

export interface StoredOrder extends OrderState {
  paymentReference?: string | null;
}

type Queryable = Pick<PoolClient, 'query'>;

function toStoredOrder(row: Record<string, any>): StoredOrder {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    source: row.source,
    status: row.status,
    currency: row.currency,
    subtotal: { amount: row.subtotal_amount, currency: row.subtotal_currency },
    fees: row.fees_amount == null ? undefined : { amount: row.fees_amount, currency: row.fees_currency },
    total: { amount: row.total_amount, currency: row.total_currency },
    paymentProvider: row.payment_provider,
    paymentReference: row.payment_reference,
    escrowId: row.escrow_id,
    items: JSON.parse(row.items),
    placedAt: row.placed_at,
    paidAt: row.paid_at,
    fulfilledAt: row.fulfilled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class OrderRepository {
  async save(order: StoredOrder, client?: Queryable): Promise<StoredOrder> {
    const runner = client ?? { query };
    const result = await runner.query(
      `INSERT INTO orders (
        id,buyer_id,seller_id,source,status,currency,
        subtotal_amount,subtotal_currency,fees_amount,fees_currency,
        total_amount,total_currency,payment_provider,payment_reference,
        escrow_id,items,placed_at,paid_at,fulfilled_at,raw_metadata,created_at,updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,
        $11,$12,$13,$14,
        $15,$16,$17,$18,$19,$20,$21,$22
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        payment_provider = EXCLUDED.payment_provider,
        payment_reference = EXCLUDED.payment_reference,
        escrow_id = EXCLUDED.escrow_id,
        paid_at = EXCLUDED.paid_at,
        fulfilled_at = EXCLUDED.fulfilled_at,
        updated_at = EXCLUDED.updated_at
      RETURNING *`,
      [
        order.id,
        order.buyerId,
        order.sellerId,
        order.source,
        order.status,
        order.currency,
        order.subtotal.amount,
        order.subtotal.currency,
        order.fees?.amount ?? null,
        order.fees?.currency ?? null,
        order.total.amount,
        order.total.currency,
        order.paymentProvider ?? null,
        order.paymentReference ?? null,
        order.escrowId ?? null,
        JSON.stringify(order.items),
        order.placedAt ?? null,
        order.paidAt ?? null,
        order.fulfilledAt ?? null,
        null,
        order.createdAt,
        order.updatedAt,
      ],
    );
    return toStoredOrder(result.rows[0]);
  }

  async findById(id: string, client?: Queryable): Promise<StoredOrder | undefined> {
    const runner = client ?? { query };
    const result = await runner.query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [id]);
    return result.rows[0] ? toStoredOrder(result.rows[0]) : undefined;
  }

  async findByPaymentReference(reference: string, client?: Queryable): Promise<StoredOrder | undefined> {
    const runner = client ?? { query };
    const result = await runner.query('SELECT * FROM orders WHERE payment_reference = $1 ORDER BY updated_at DESC LIMIT 1', [reference]);
    return result.rows[0] ? toStoredOrder(result.rows[0]) : undefined;
  }

  async update(id: string, updater: (order: StoredOrder) => StoredOrder, client?: Queryable): Promise<StoredOrder | undefined> {
    const current = await this.findById(id, client);
    if (!current) return undefined;
    return this.save(updater(current), client);
  }

  async updateByPaymentReference(reference: string, updater: (order: StoredOrder) => StoredOrder, client?: Queryable): Promise<StoredOrder | undefined> {
    const current = await this.findByPaymentReference(reference, client);
    if (!current) return undefined;
    return this.save(updater(current), client);
  }
}

export const orderRepository = new OrderRepository();

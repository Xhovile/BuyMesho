import type { OrderState } from '../../../src/modules/orders/orderState.js';
import { getPaymentDb } from '../../postgresCompat.js';
import { query, withTransaction } from '../../postgres.js';
import type { PoolClient } from 'pg';
import { projectEventTickets } from './eventTicketProjection.js';

export interface StoredOrder extends OrderState {
  paymentReference?: string | null;
  paymentCapturedAt?: string | null;
  capturedAt?: string | null;
  checkoutIdempotencyKey?: string | null;
  checkoutRequestHash?: string | null;
}

type DbExecutor = Pick<PoolClient, 'query'>;

function rowToOrder(row: Record<string, unknown>): StoredOrder {
  let items: StoredOrder['items'];
  try { items = typeof row.items === 'string' ? JSON.parse(row.items) as StoredOrder['items'] : (row.items as StoredOrder['items'] ?? []); } catch { items = []; }
  let buyerDetails: StoredOrder['buyerDetails'] = null;
  try { buyerDetails = row.buyer_details ? typeof row.buyer_details === 'string' ? JSON.parse(row.buyer_details) as StoredOrder['buyerDetails'] : row.buyer_details as StoredOrder['buyerDetails'] : null; } catch { buyerDetails = null; }
  const status = row.status as StoredOrder['status'];
  const deliveryStatus = status === 'fulfilled' || status === 'closed' ? 'delivered' : ((row.delivery_status as StoredOrder['deliveryStatus']) ?? 'action_required');
  return {
    id: row.id as string, buyerId: row.buyer_id as string, sellerId: row.seller_id as string,
    source: row.source as StoredOrder['source'], status, deliveryStatus, currency: row.currency as string,
    subtotal: { amount: Number(row.subtotal_amount ?? 0), currency: row.subtotal_currency as string },
    total: { amount: Number(row.total_amount ?? 0), currency: row.total_currency as string },
    paymentProvider: (row.payment_provider as StoredOrder['paymentProvider']) ?? undefined,
    settlementRoute: (row.settlement_route as StoredOrder['settlementRoute']) ?? null,
    paymentReference: (row.payment_reference as string | null) ?? null,
    checkoutIdempotencyKey: (row.checkout_idempotency_key as string | null) ?? null,
    checkoutRequestHash: (row.checkout_request_hash as string | null) ?? null,
    paymentCapturedAt: (row.paid_at as string | null) ?? null, capturedAt: (row.paid_at as string | null) ?? null,
    escrowId: (row.escrow_id as string | null) ?? null, items, buyerDetails,
    placedAt: (row.placed_at as string | null) ?? null, paidAt: (row.paid_at as string | null) ?? null,
    fulfilledAt: (row.fulfilled_at as string | null) ?? null, createdAt: row.created_at as string, updatedAt: row.updated_at as string,
  };
}

export class PostgresOrderRepository {
  private get db() { return getPaymentDb(); }

  save(order: StoredOrder): StoredOrder {
    const now = new Date().toISOString();
    const paidAt = order.status === 'paid' ? (order.paidAt ?? now) : (order.paidAt ?? null);
    const fulfilledAt = order.status === 'fulfilled' ? (order.fulfilledAt ?? now) : (order.fulfilledAt ?? null);
    const stored: StoredOrder = { ...order, deliveryStatus: order.status === 'fulfilled' || order.status === 'closed' ? 'delivered' : order.deliveryStatus ?? 'action_required', paidAt, fulfilledAt };
    this.db.prepare(`INSERT INTO orders (id,buyer_id,seller_id,source,status,delivery_status,currency,subtotal_amount,subtotal_currency,total_amount,total_currency,payment_provider,settlement_route,payment_reference,checkout_idempotency_key,checkout_request_hash,escrow_id,items,buyer_details,placed_at,paid_at,fulfilled_at,created_at,updated_at)
      VALUES (@id,@buyer_id,@seller_id,@source,@status,@delivery_status,@currency,@subtotal_amount,@subtotal_currency,@total_amount,@total_currency,@payment_provider,@settlement_route,@payment_reference,@checkout_idempotency_key,@checkout_request_hash,@escrow_id,@items,@buyer_details,@placed_at,@paid_at,@fulfilled_at,@created_at,@updated_at)
      ON CONFLICT(id) DO UPDATE SET status=excluded.status,delivery_status=excluded.delivery_status,payment_provider=excluded.payment_provider,settlement_route=excluded.settlement_route,payment_reference=excluded.payment_reference,checkout_idempotency_key=excluded.checkout_idempotency_key,checkout_request_hash=excluded.checkout_request_hash,escrow_id=excluded.escrow_id,paid_at=excluded.paid_at,fulfilled_at=excluded.fulfilled_at,updated_at=excluded.updated_at,items=excluded.items,buyer_details=excluded.buyer_details`).run({
      id:stored.id,buyer_id:stored.buyerId,seller_id:stored.sellerId,source:stored.source,status:stored.status,delivery_status:stored.deliveryStatus,
      currency:stored.currency,subtotal_amount:stored.subtotal.amount,subtotal_currency:stored.subtotal.currency,total_amount:stored.total.amount,total_currency:stored.total.currency,
      payment_provider:stored.paymentProvider ?? null,settlement_route:stored.settlementRoute ?? null,payment_reference:stored.paymentReference ?? null,
      checkout_idempotency_key:stored.checkoutIdempotencyKey ?? null,checkout_request_hash:stored.checkoutRequestHash ?? null,escrow_id:stored.escrowId ?? null,
      items:JSON.stringify(stored.items),buyer_details:stored.buyerDetails ? JSON.stringify(stored.buyerDetails) : null,placed_at:stored.placedAt ?? null,paid_at:paidAt,fulfilled_at:fulfilledAt,created_at:stored.createdAt,updated_at:stored.updatedAt ?? now,
    });
    projectEventTickets(stored);
    return stored;
  }

  findById(id: string): StoredOrder | undefined { const row=this.db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined; return row ? rowToOrder(row) : undefined; }
  findByPaymentReference(reference: string): StoredOrder | undefined { const row=this.db.prepare('SELECT * FROM orders WHERE payment_reference = ?').get(reference) as Record<string, unknown> | undefined; return row ? rowToOrder(row) : undefined; }
  findByCheckoutIdempotencyKey(buyerId: string, key: string): StoredOrder | undefined { const row=this.db.prepare('SELECT * FROM orders WHERE buyer_id = ? AND checkout_idempotency_key = ? LIMIT 1').get(buyerId,key) as Record<string, unknown> | undefined; return row ? rowToOrder(row) : undefined; }
  update(id: string, updater: (order: StoredOrder) => StoredOrder): StoredOrder | undefined { const current=this.findById(id); if(!current)return undefined; return this.save(updater(current)); }
  updateByPaymentReference(reference: string, updater: (order: StoredOrder) => StoredOrder): StoredOrder | undefined { const current=this.findByPaymentReference(reference); if(!current)return undefined; return this.save(updater(current)); }
  clear(): void { this.db.prepare('DELETE FROM orders').run(); }

  private async saveAsyncOnExecutor(order: StoredOrder, executor: DbExecutor): Promise<StoredOrder> {
    const now = new Date().toISOString();
    const paidAt = order.status === 'paid' ? (order.paidAt ?? now) : (order.paidAt ?? null);
    const fulfilledAt = order.status === 'fulfilled' ? (order.fulfilledAt ?? now) : (order.fulfilledAt ?? null);
    const stored: StoredOrder = { ...order, deliveryStatus: order.status === 'fulfilled' || order.status === 'closed' ? 'delivered' : order.deliveryStatus ?? 'action_required', paidAt, fulfilledAt };
    await executor.query(`INSERT INTO orders (id,buyer_id,seller_id,source,status,delivery_status,currency,subtotal_amount,subtotal_currency,total_amount,total_currency,payment_provider,settlement_route,payment_reference,checkout_idempotency_key,checkout_request_hash,escrow_id,items,buyer_details,placed_at,paid_at,fulfilled_at,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      ON CONFLICT(id) DO UPDATE SET status=excluded.status,delivery_status=excluded.delivery_status,payment_provider=excluded.payment_provider,settlement_route=excluded.settlement_route,payment_reference=excluded.payment_reference,checkout_idempotency_key=excluded.checkout_idempotency_key,checkout_request_hash=excluded.checkout_request_hash,escrow_id=excluded.escrow_id,paid_at=excluded.paid_at,fulfilled_at=excluded.fulfilled_at,updated_at=excluded.updated_at,items=excluded.items,buyer_details=excluded.buyer_details`,[
      stored.id,stored.buyerId,stored.sellerId,stored.source,stored.status,stored.deliveryStatus,stored.currency,stored.subtotal.amount,stored.subtotal.currency,stored.total.amount,stored.total.currency,
      stored.paymentProvider ?? null,stored.settlementRoute ?? null,stored.paymentReference ?? null,stored.checkoutIdempotencyKey ?? null,stored.checkoutRequestHash ?? null,stored.escrowId ?? null,
      JSON.stringify(stored.items),stored.buyerDetails ? JSON.stringify(stored.buyerDetails) : null,stored.placedAt ?? null,paidAt,fulfilledAt,stored.createdAt,stored.updatedAt ?? now,
    ]);
    return stored;
  }

  async saveAsync(order: StoredOrder, executor?: DbExecutor): Promise<StoredOrder> {
    const run = (client: DbExecutor) => this.saveAsyncOnExecutor(order, client);
    const stored = executor ? await run(executor) : await withTransaction(run);
    return stored;
  }

  async findByIdAsync(id: string, executor: DbExecutor = { query }): Promise<StoredOrder | undefined> { const result=await executor.query<Record<string, unknown>>('SELECT * FROM orders WHERE id = $1',[id]); return result.rows[0] ? rowToOrder(result.rows[0]) : undefined; }
  async findByPaymentReferenceAsync(reference: string, executor: DbExecutor = { query }): Promise<StoredOrder | undefined> { const result=await executor.query<Record<string, unknown>>('SELECT * FROM orders WHERE payment_reference = $1',[reference]); return result.rows[0] ? rowToOrder(result.rows[0]) : undefined; }
  async findByCheckoutIdempotencyKeyAsync(buyerId: string, key: string, executor: DbExecutor = { query }): Promise<StoredOrder | undefined> { const result=await executor.query<Record<string, unknown>>('SELECT * FROM orders WHERE buyer_id = $1 AND checkout_idempotency_key = $2 LIMIT 1',[buyerId,key]); return result.rows[0] ? rowToOrder(result.rows[0]) : undefined; }

  async updateAsync(id: string, updater: (order: StoredOrder) => StoredOrder, executor?: DbExecutor): Promise<StoredOrder | undefined> {
    const run = async (client: DbExecutor) => { const current=await this.findByIdAsync(id,client); return current ? this.saveAsyncOnExecutor(updater(current),client) : undefined; };
    return executor ? run(executor) : withTransaction(run);
  }

  async updateByPaymentReferenceAsync(reference: string, updater: (order: StoredOrder) => StoredOrder, executor?: DbExecutor): Promise<StoredOrder | undefined> {
    const run = async (client: DbExecutor) => { const current=await this.findByPaymentReferenceAsync(reference,client); return current ? this.saveAsyncOnExecutor(updater(current),client) : undefined; };
    return executor ? run(executor) : withTransaction(run);
  }
}

export const orderRepository = new PostgresOrderRepository();

import { randomUUID } from 'crypto';
import { getPaymentDb } from '../../sqlite.js';
import type { EscrowState } from '../../../src/shared/types/payment.js';

export interface EscrowEntry {
  id: string;
  escrowId: string;
  entryType: 'credit' | 'debit' | 'hold' | 'release' | 'refund';
  amount: number;
  currency: string;
  balanceAfter: number;
  note?: string;
  createdAt: string;
}

export interface StoredEscrow {
  id: string;
  orderId: string;
  state: EscrowState;
  currency: string;
  balanceAmount: number;
  balanceCurrency: string;
  entries: EscrowEntry[];
  createdAt: string;
  updatedAt: string;
}

export class EscrowRepository {
  private get db() {
    return getPaymentDb();
  }

  create(orderId: string, currency: string, amount: number): StoredEscrow {
    const now = new Date().toISOString();
    const id = randomUUID();
    const entry: EscrowEntry = {
      id: randomUUID(),
      escrowId: id,
      entryType: 'credit',
      amount,
      currency,
      balanceAfter: amount,
      note: 'Payment received — funds held in escrow',
      createdAt: now,
    };
    const escrow: StoredEscrow = {
      id,
      orderId,
      state: 'funded',
      currency,
      balanceAmount: amount,
      balanceCurrency: currency,
      entries: [entry],
      createdAt: now,
      updatedAt: now,
    };
    this.db
      .prepare(
        `INSERT INTO escrows (id, order_id, state, currency, balance_amount, balance_currency, entries, created_at, updated_at)
         VALUES (@id, @order_id, @state, @currency, @balance_amount, @balance_currency, @entries, @created_at, @updated_at)
         ON CONFLICT(order_id) DO UPDATE SET
           state = excluded.state,
           balance_amount = excluded.balance_amount,
           balance_currency = excluded.balance_currency,
           entries = excluded.entries,
           updated_at = excluded.updated_at`,
      )
      .run({
        id: escrow.id,
        order_id: escrow.orderId,
        state: escrow.state,
        currency: escrow.currency,
        balance_amount: escrow.balanceAmount,
        balance_currency: escrow.balanceCurrency,
        entries: JSON.stringify(escrow.entries),
        created_at: escrow.createdAt,
        updated_at: escrow.updatedAt,
      });
    return escrow;
  }

  findByOrderId(orderId: string): StoredEscrow | undefined {
    const row = this.db
      .prepare('SELECT * FROM escrows WHERE order_id = ?')
      .get(orderId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.rowToEscrow(row);
  }

  findById(id: string): StoredEscrow | undefined {
    const row = this.db
      .prepare('SELECT * FROM escrows WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.rowToEscrow(row);
  }

  updateState(orderId: string, state: EscrowState): StoredEscrow | undefined {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE escrows SET state = @state, updated_at = @updated_at WHERE order_id = @order_id')
      .run({ state, updated_at: now, order_id: orderId });
    return this.findByOrderId(orderId);
  }

  private rowToEscrow(row: Record<string, unknown>): StoredEscrow {
    let entries: EscrowEntry[] = [];
    try {
      entries = JSON.parse(row.entries as string) as EscrowEntry[];
    } catch {
      entries = [];
    }
    return {
      id: row.id as string,
      orderId: row.order_id as string,
      state: row.state as EscrowState,
      currency: row.currency as string,
      balanceAmount: row.balance_amount as number,
      balanceCurrency: row.balance_currency as string,
      entries,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

export const escrowRepository = new EscrowRepository();

import { randomUUID } from 'crypto';
import './escrow.schema.js';
import { query, withTransaction } from '../../postgres.js';
import type { PoolClient } from 'pg';
import type { EscrowState } from '../../../src/shared/types/payment.js';

export interface EscrowEntry {
  id: string;
  escrowId: string;
  entryType: 'credit' | 'debit' | 'hold' | 'release' | 'refund';
  amount: number;
  currency: string;
  balanceAfter: number;
  note?: string;
  actorId?: string;
  reference?: string;
  createdAt: string;
}

export interface ReleaseToSellerEarningsInput {
  orderId: string;
  releasedBy: string;
  reference?: string;
}

export interface ReleaseToSellerEarningsResult {
  escrow: StoredEscrow;
  releaseEntry: EscrowEntry;
}

export interface RefundHeldBalanceInput {
  orderId: string;
  refundedBy: string;
  reference?: string;
  note?: string;
}

export interface RefundHeldBalanceResult {
  escrow: StoredEscrow;
  refundEntry: EscrowEntry;
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

const ESCROW_ALLOWED_TRANSITIONS: Readonly<Record<EscrowState, readonly EscrowState[]>> = {
  initiated: ['initiated', 'funded', 'closed'],
  funded: ['funded', 'held', 'released', 'refunded', 'disputed'],
  held: ['held', 'released', 'refunded', 'disputed'],
  released: ['released', 'closed'],
  refunded: ['refunded'],
  disputed: ['disputed', 'refunded', 'released', 'closed'],
  closed: ['closed'],
} as const;

function assertEscrowStateTransition(from: EscrowState, to: EscrowState): void {
  if (ESCROW_ALLOWED_TRANSITIONS[from].includes(to)) return;
  throw new Error(`Illegal escrow state transition: ${from} -> ${to}`);
}

type EscrowRow = Record<string, unknown>;
type EscrowExecutor = Pick<PoolClient, 'query'>;

function parseEntries(value: unknown): EscrowEntry[] {
  if (Array.isArray(value)) return value as EscrowEntry[];
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as EscrowEntry[];
    } catch {
      return [];
    }
  }
  return [];
}

function rowToEscrow(row: EscrowRow): StoredEscrow {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    state: row.state as EscrowState,
    currency: row.currency as string,
    balanceAmount: Number(row.balance_amount ?? 0),
    balanceCurrency: row.balance_currency as string,
    entries: parseEntries(row.entries),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

async function findByOrderIdWith(executor: EscrowExecutor, orderId: string): Promise<StoredEscrow | undefined> {
  const result = await executor.query<EscrowRow>('SELECT * FROM escrows WHERE order_id = $1', [orderId]);
  const row = result.rows[0];
  return row ? rowToEscrow(row) : undefined;
}

async function findByIdWith(executor: EscrowExecutor, id: string): Promise<StoredEscrow | undefined> {
  const result = await executor.query<EscrowRow>('SELECT * FROM escrows WHERE id = $1', [id]);
  const row = result.rows[0];
  return row ? rowToEscrow(row) : undefined;
}

export class EscrowRepository {
  async create(orderId: string, currency: string, amount: number): Promise<StoredEscrow> {
    const existing = await this.findByOrderId(orderId);
    if (existing) return existing;

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

    await query(
      `INSERT INTO escrows
        (id, order_id, state, currency, balance_amount, balance_currency, entries, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(order_id) DO NOTHING`,
      [id, orderId, 'funded', currency, amount, currency, JSON.stringify([entry]), now, now],
    );

    const stored = await this.findByOrderId(orderId);
    if (!stored) throw new Error('Failed to create or retrieve escrow');
    return stored;
  }

  findByOrderId(orderId: string): Promise<StoredEscrow | undefined> {
    return findByOrderIdWith({ query }, orderId);
  }

  findById(id: string): Promise<StoredEscrow | undefined> {
    return findByIdWith({ query }, id);
  }

  async updateState(orderId: string, state: EscrowState): Promise<StoredEscrow | undefined> {
    const current = await this.findByOrderId(orderId);
    if (!current) return undefined;
    assertEscrowStateTransition(current.state, state);

    const now = new Date().toISOString();
    await query(
      'UPDATE escrows SET state = $1, updated_at = $2 WHERE order_id = $3',
      [state, now, orderId],
    );
    return this.findByOrderId(orderId);
  }

  async releaseToSellerEarnings(input: ReleaseToSellerEarningsInput): Promise<ReleaseToSellerEarningsResult | undefined> {
    return withTransaction(async (client) => {
      const current = await findByOrderIdWith(client, input.orderId);
      if (!current) return undefined;

      if (current.entries.some((entry) => entry.entryType === 'release')) {
        throw new Error('Escrow is already released');
      }

      if (current.state === 'released' || current.state === 'refunded' || current.state === 'closed') {
        throw new Error(`Escrow is already ${current.state}`);
      }

      if (current.state !== 'funded' && current.state !== 'held') {
        throw new Error(`Escrow cannot be released from ${current.state} state`);
      }

      if (current.balanceAmount <= 0) {
        throw new Error('Escrow has no held balance to release');
      }

      const now = new Date().toISOString();
      const releaseEntry: EscrowEntry = {
        id: randomUUID(),
        escrowId: current.id,
        entryType: 'release',
        amount: current.balanceAmount,
        currency: current.balanceCurrency,
        balanceAfter: 0,
        note: 'Escrow released to seller earnings',
        actorId: input.releasedBy,
        reference: input.reference,
        createdAt: now,
      };
      const entries = [...current.entries, releaseEntry];

      await client.query(
        `UPDATE escrows
         SET state = 'released', balance_amount = 0, entries = $1, updated_at = $2
         WHERE order_id = $3`,
        [JSON.stringify(entries), now, input.orderId],
      );

      const escrow = await findByOrderIdWith(client, input.orderId);
      if (!escrow) throw new Error('Escrow not found after release');
      return { escrow, releaseEntry };
    });
  }

  async refundHeldBalance(input: RefundHeldBalanceInput): Promise<RefundHeldBalanceResult | undefined> {
    return withTransaction(async (client) => {
      const current = await findByOrderIdWith(client, input.orderId);
      if (!current) return undefined;

      if (current.entries.some((entry) => entry.entryType === 'refund')) {
        throw new Error('Escrow is already refunded');
      }

      if (current.entries.some((entry) => entry.entryType === 'release')) {
        throw new Error('Escrow is already released');
      }

      if (current.state === 'released' || current.state === 'refunded' || current.state === 'closed') {
        throw new Error(`Escrow is already ${current.state}`);
      }

      if (current.state !== 'funded' && current.state !== 'held') {
        throw new Error(`Escrow cannot be refunded from ${current.state} state`);
      }

      if (current.balanceAmount <= 0) {
        throw new Error('Escrow has no held balance to refund');
      }

      const now = new Date().toISOString();
      const refundEntry: EscrowEntry = {
        id: randomUUID(),
        escrowId: current.id,
        entryType: 'refund',
        amount: current.balanceAmount,
        currency: current.balanceCurrency,
        balanceAfter: 0,
        note: input.note || 'Escrow refunded to buyer',
        actorId: input.refundedBy,
        reference: input.reference,
        createdAt: now,
      };
      const entries = [...current.entries, refundEntry];

      await client.query(
        `UPDATE escrows
         SET state = 'refunded', balance_amount = 0, entries = $1, updated_at = $2
         WHERE order_id = $3`,
        [JSON.stringify(entries), now, input.orderId],
      );

      const escrow = await findByOrderIdWith(client, input.orderId);
      if (!escrow) throw new Error('Escrow not found after refund');
      return { escrow, refundEntry };
    });
  }
}

export const escrowRepository = new EscrowRepository();

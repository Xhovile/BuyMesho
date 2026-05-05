import type { PoolClient } from 'pg';
import { query } from '../../db.js';
import type { PaymentResult, PaymentVerificationResult } from '../../../src/modules/payments/types.js';

export interface StoredPayment extends PaymentResult {
  verified?: boolean;
  verification?: PaymentVerificationResult;
}

type Queryable = Pick<PoolClient, 'query'>;

function toStoredPayment(row: Record<string, any>): StoredPayment {
  return {
    id: row.id,
    orderId: row.order_id,
    provider: row.provider,
    method: row.method,
    status: row.status,
    amount: { amount: Number(row.amount), currency: row.currency },
    reference: row.reference,
    providerReference: row.provider_reference,
    checkoutUrl: row.checkout_url,
    paidAt: row.paid_at,
    rawResponse: row.raw_response ? JSON.parse(row.raw_response) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    verified: Boolean(row.verified),
    verification: row.verification ? JSON.parse(row.verification) : undefined,
  };
}

export class PaymentRepository {
  async save(payment: StoredPayment, client?: Queryable): Promise<StoredPayment> {
    const runner = client ?? { query };
    const result = await runner.query(
      `INSERT INTO payments (
        id, order_id, provider, method, status, reference, provider_reference,
        currency, amount, checkout_url, paid_at, verified, verification,
        raw_metadata, raw_response, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17
      )
      ON CONFLICT (reference) DO UPDATE SET
        status = EXCLUDED.status,
        provider_reference = EXCLUDED.provider_reference,
        checkout_url = EXCLUDED.checkout_url,
        paid_at = EXCLUDED.paid_at,
        verified = EXCLUDED.verified,
        verification = EXCLUDED.verification,
        raw_metadata = EXCLUDED.raw_metadata,
        raw_response = EXCLUDED.raw_response,
        updated_at = EXCLUDED.updated_at
      RETURNING *`,
      [
        payment.id,
        payment.orderId,
        payment.provider,
        payment.method,
        payment.status,
        payment.reference,
        payment.providerReference ?? null,
        payment.amount.currency,
        payment.amount.amount,
        payment.checkoutUrl ?? null,
        payment.paidAt ?? null,
        payment.verified ? 1 : 0,
        payment.verification ? JSON.stringify(payment.verification) : null,
        null,
        payment.rawResponse ? JSON.stringify(payment.rawResponse) : null,
        payment.createdAt,
        payment.updatedAt,
      ],
    );
    return toStoredPayment(result.rows[0]);
  }

  async findByReference(reference: string, client?: Queryable): Promise<StoredPayment | undefined> {
    const runner = client ?? { query };
    const result = await runner.query('SELECT * FROM payments WHERE reference = $1 LIMIT 1', [reference]);
    return result.rows[0] ? toStoredPayment(result.rows[0]) : undefined;
  }

  async updateByReference(reference: string, updater: (payment: StoredPayment) => StoredPayment, client?: Queryable): Promise<StoredPayment | undefined> {
    const current = await this.findByReference(reference, client);
    if (!current) return undefined;
    const next = updater(current);
    return this.save(next, client);
  }

  async clear(client?: Queryable): Promise<void> {
    const runner = client ?? { query };
    await runner.query('DELETE FROM payments');
  }
}

export const paymentRepository = new PaymentRepository();

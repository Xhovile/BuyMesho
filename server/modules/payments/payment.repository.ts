import type { PaymentResult, PaymentVerificationResult } from '../../../src/modules/payments/types.js';
import { getPaymentDb } from '../../sqlite.js';

export interface StoredPayment extends PaymentResult {
  verified?: boolean;
  verification?: PaymentVerificationResult;
}

export class SqlitePaymentRepository {
  private get db() {
    return getPaymentDb();
  }

  save(payment: StoredPayment): StoredPayment {
    this.db.prepare(`
      INSERT INTO payments (id, order_id, provider, method, status, reference, provider_reference, checkout_url, paid_at, raw_response, verified, verification, created_at, updated_at)
      VALUES (@id, @order_id, @provider, @method, @status, @reference, @provider_reference, @checkout_url, @paid_at, @raw_response, @verified, @verification, @created_at, @updated_at)
      ON CONFLICT(reference) DO UPDATE SET
        status = excluded.status,
        provider_reference = excluded.provider_reference,
        checkout_url = excluded.checkout_url,
        paid_at = excluded.paid_at,
        raw_response = excluded.raw_response,
        verified = excluded.verified,
        verification = excluded.verification,
        updated_at = excluded.updated_at
    `).run({
      id: payment.id,
      order_id: payment.orderId,
      provider: payment.provider,
      method: payment.method,
      status: payment.status,
      reference: payment.reference,
      provider_reference: payment.providerReference ?? null,
      checkout_url: payment.checkoutUrl ?? null,
      paid_at: payment.paidAt ?? null,
      raw_response: payment.rawResponse ? JSON.stringify(payment.rawResponse) : null,
      verified: payment.verified ? 1 : 0,
      verification: payment.verification ? JSON.stringify(payment.verification) : null,
      created_at: payment.createdAt,
      updated_at: payment.updatedAt,
    });
    return payment;
  }

  findByReference(reference: string): StoredPayment | undefined {
    const row = this.db.prepare('SELECT * FROM payments WHERE reference = ?').get(reference) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.rowToPayment(row);
  }

  updateByReference(reference: string, updater: (payment: StoredPayment) => StoredPayment): StoredPayment | undefined {
    const current = this.findByReference(reference);
    if (!current) return undefined;
    const next = updater(current);
    return this.save(next);
  }

  private rowToPayment(row: Record<string, unknown>): StoredPayment {
    let rawResponse: Record<string, unknown> | undefined;
    try {
      rawResponse = row.raw_response ? JSON.parse(row.raw_response as string) as Record<string, unknown> : undefined;
    } catch {
      rawResponse = undefined;
    }

    let verification: PaymentVerificationResult | undefined;
    try {
      verification = row.verification ? JSON.parse(row.verification as string) as PaymentVerificationResult : undefined;
    } catch {
      verification = undefined;
    }

    return {
      id: row.id as string,
      orderId: row.order_id as string,
      provider: row.provider as StoredPayment['provider'],
      method: row.method as StoredPayment['method'],
      status: row.status as StoredPayment['status'],
      reference: row.reference as string,
      providerReference: (row.provider_reference as string | null) ?? null,
      checkoutUrl: (row.checkout_url as string | null) ?? null,
      paidAt: (row.paid_at as string | null) ?? null,
      rawResponse,
      verified: row.verified === 1,
      verification,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

export const paymentRepository = new SqlitePaymentRepository();

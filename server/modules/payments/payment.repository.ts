import type { PaymentResult, PaymentVerificationResult } from '../../../src/modules/payments/types.js';
import { getPaymentDb } from '../../postgresCompat.js';

export interface StoredPayment extends PaymentResult {
  verified?: boolean;
  verification?: PaymentVerificationResult;
}

export class PostgresPaymentRepository {
  private get db() {
    return getPaymentDb();
  }

  save(payment: StoredPayment): StoredPayment {
  const updateStmt = this.db.prepare(`
    UPDATE payments SET
      id = @id,
      order_id = @order_id,
      provider = @provider,
      method = @method,
      status = @status,
      provider_reference = @provider_reference,
      currency = @currency,
      amount = @amount,
      checkout_url = @checkout_url,
      paid_at = @paid_at,
      raw_response = @raw_response,
      verified = @verified,
      verification = @verification,
      updated_at = @updated_at
    WHERE reference = @reference
  `);

  const insertStmt = this.db.prepare(`
    INSERT INTO payments (
      id, order_id, provider, method, status, reference, provider_reference,
      currency, amount, checkout_url, paid_at, raw_response, verified,
      verification, created_at, updated_at
    ) VALUES (
      @id, @order_id, @provider, @method, @status, @reference, @provider_reference,
      @currency, @amount, @checkout_url, @paid_at, @raw_response, @verified,
      @verification, @created_at, @updated_at
    )
  `);

  this.db.transaction((p: StoredPayment) => {
    const updateResult = updateStmt.run({
      id: p.id,
      order_id: p.orderId,
      provider: p.provider,
      method: p.method,
      status: p.status,
      reference: p.reference,
      provider_reference: p.providerReference ?? null,
      currency: p.amount.currency,
      amount: p.amount.amount,
      checkout_url: p.checkoutUrl ?? null,
      paid_at: p.paidAt ?? null,
      raw_response: p.rawResponse ? JSON.stringify(p.rawResponse) : null,
      verified: p.verified ? 1 : 0,
      verification: p.verification ? JSON.stringify(p.verification) : null,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    });

    if (updateResult.changes === 0) {
      insertStmt.run({
        id: p.id,
        order_id: p.orderId,
        provider: p.provider,
        method: p.method,
        status: p.status,
        reference: p.reference,
        provider_reference: p.providerReference ?? null,
        currency: p.amount.currency,
        amount: p.amount.amount,
        checkout_url: p.checkoutUrl ?? null,
        paid_at: p.paidAt ?? null,
        raw_response: p.rawResponse ? JSON.stringify(p.rawResponse) : null,
        verified: p.verified ? 1 : 0,
        verification: p.verification ? JSON.stringify(p.verification) : null,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      });
    }
  })(payment);

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

  clear(): void {
    this.db.prepare('DELETE FROM payment_webhook_events').run();
    this.db.prepare('DELETE FROM payments').run();
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
      amount: {
        amount: Number(row.amount ?? 0),
        currency: String(row.currency ?? 'MWK'),
      },
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

export const paymentRepository = new PostgresPaymentRepository();

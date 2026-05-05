import type { PaymentResult, PaymentVerificationResult } from '../../../src/modules/payments/types';

export interface StoredPayment extends PaymentResult {
  verified?: boolean;
  verification?: PaymentVerificationResult;
}

export class InMemoryPaymentRepository {
  private readonly payments = new Map<string, StoredPayment>();

  save(payment: StoredPayment): StoredPayment {
    this.payments.set(payment.reference, payment);
    return payment;
  }

  findByReference(reference: string): StoredPayment | undefined {
    return this.payments.get(reference);
  }

  updateByReference(reference: string, updater: (payment: StoredPayment) => StoredPayment): StoredPayment | undefined {
    const current = this.payments.get(reference);
    if (!current) return undefined;
    const next = updater(current);
    this.payments.set(reference, next);
    return next;
  }

  clear(): void {
    this.payments.clear();
  }
}

export const paymentRepository = new InMemoryPaymentRepository();

import type { PaymentResult, PaymentVerificationResult } from '../../../src/modules/payments/types.js';
import { pool } from '../../db.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/order.repository.js';
import { serverOrderService } from '../orders/order.service.js';

export interface ApplyPayChanguResult {
  payment?: PaymentResult;
  order?: Awaited<ReturnType<typeof orderRepository.findByPaymentReference>>;
  verification: PaymentVerificationResult;
}

export async function applyVerifiedPayChanguPayment(verification: PaymentVerificationResult): Promise<ApplyPayChanguResult> {
  const reference = verification.reference ?? verification.txRef;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const payment = await paymentRepository.updateByReference(reference, (current) => ({
      ...current,
      verified: verification.verified,
      verification,
      status: verification.verified ? 'captured' : current.status,
      paidAt: verification.verified ? new Date().toISOString() : current.paidAt,
      updatedAt: new Date().toISOString(),
    }), client);

    const order = verification.verified && reference
      ? await serverOrderService.confirmByPaymentReference(reference, client)
      : await orderRepository.findByPaymentReference(reference, client);

    await client.query('COMMIT');

    return {
      payment,
      order,
      verification,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function seedDemoPayChanguPayment(payment: PaymentResult): Promise<PaymentResult> {
  return paymentRepository.save({
    ...payment,
    verified: false,
  });
}

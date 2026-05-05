import type { PaymentResult, PaymentVerificationResult } from '../../../src/modules/payments/types';
import { pool } from '../../db';
import { paymentRepository } from './payment.repository';
import { orderRepository } from '../orders/order.repository';
import { serverOrderService } from '../orders/order.service';

export interface ApplyPayChanguResult {
  payment?: PaymentResult;
  order?: ReturnType<typeof orderRepository.findByPaymentReference>;
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

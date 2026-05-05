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

const CAPTURED_STATUSES = new Set(['successful', 'success', 'completed', 'captured']);

export function applyVerifiedPayChanguPayment(verification: PaymentVerificationResult): ApplyPayChanguResult {
  const reference = verification.reference ?? verification.txRef;
  const shouldCapture = verification.verified &&
    CAPTURED_STATUSES.has(String(verification.status ?? '').toLowerCase());

  const payment = paymentRepository.updateByReference(reference, (current) => ({
    ...current,
    verified: verification.verified,
    verification,
    status: shouldCapture ? 'captured' : current.status,
    paidAt: shouldCapture ? new Date().toISOString() : current.paidAt,
    updatedAt: new Date().toISOString(),
  }));

  const order = shouldCapture && reference
    ? serverOrderService.confirmByPaymentReference(reference)
    : orderRepository.findByPaymentReference(reference);

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

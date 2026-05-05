import type { PaymentResult, PaymentVerificationResult } from '../../../src/modules/payments/types';
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

  return {
    payment,
    order,
    verification,
  };
}

export function seedDemoPayChanguPayment(payment: PaymentResult): PaymentResult {
  return paymentRepository.save({
    ...payment,
    verified: false,
  });
}

import type { PaymentResult, PaymentVerificationResult } from '../../../src/modules/payments/types.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/order.repository.js';
import { serverOrderService } from '../orders/order.service.js';
import { escrowRepository } from '../escrow/escrow.repository.js';

export interface ApplyPayChanguResult {
  payment?: ReturnType<typeof paymentRepository.findByReference>;
  order?: ReturnType<typeof orderRepository.findByPaymentReference>;
  verification: PaymentVerificationResult;
}

const CAPTURED_STATUSES = new Set(['successful', 'success', 'completed', 'captured']);

function emitOrderPaidNotification(buyerId: string, sellerId: string, orderId: string): void {
  const payload = { orderId, buyerId, sellerId, event: 'order_paid', emittedAt: new Date().toISOString() };
  console.log('[notification] order_paid', JSON.stringify(payload));
}

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

  let order = shouldCapture && reference
    ? serverOrderService.confirmByPaymentReference(reference)
    : orderRepository.findByPaymentReference(reference);

  if (shouldCapture && order) {
    const escrowAmount = verification.amount?.amount ?? order.total.amount;
    const currency = verification.currency ?? order.currency ?? 'MWK';

    if (!escrowRepository.findByOrderId(order.id)) {
      escrowRepository.create(order.id, currency, escrowAmount);
    }

    order = serverOrderService.setStatus(order.id, 'in_escrow') ?? order;

    emitOrderPaidNotification(order.buyerId, order.sellerId, order.id);
  }

  return {
    payment,
    order,
    verification,
  };
}

export function seedDemoPayChanguPayment(payment: PaymentResult): ReturnType<typeof paymentRepository.save> {
  return paymentRepository.save({
    ...payment,
    verified: false,
  });
}

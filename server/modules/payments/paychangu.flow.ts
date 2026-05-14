import type { PaymentResult, PaymentVerificationResult } from '../../../src/modules/payments/types.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/order.repository.js';
import { serverOrderService } from '../orders/order.service.js';
import { escrowRepository } from '../escrow/escrow.repository.js';
import { isPaychanguSuccessStatus } from './paychangu.provider.js';

export interface ApplyPayChanguResult {
  payment?: ReturnType<typeof paymentRepository.findByReference>;
  order?: ReturnType<typeof orderRepository.findByPaymentReference>;
  verification: PaymentVerificationResult;
}

function normalizeReference(value: string | undefined | null): string {
  return String(value ?? '').trim();
}

function stripPayChanguPrefix(value: string): string {
  return value.replace(/^PAYCHANGU-/i, '');
}

function uniqueReferences(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const references: string[] = [];

  for (const value of values) {
    const reference = normalizeReference(value);
    if (!reference || seen.has(reference)) continue;
    seen.add(reference);
    references.push(reference);
  }

  return references;
}

function resolveReferenceCandidates(verification: PaymentVerificationResult): string[] {
  const exactReferences = uniqueReferences([verification.reference, verification.txRef]);
  return uniqueReferences([
    ...exactReferences,
    ...exactReferences.map(stripPayChanguPrefix),
  ]);
}

function emitOrderPaidNotification(buyerId: string, sellerId: string, orderId: string): void {
  const payload = {
    orderId,
    buyerId,
    sellerId,
    event: 'order_paid',
    emittedAt: new Date().toISOString(),
  };

  console.log('[notification] order_paid', JSON.stringify(payload));
}

function isCaptured(verification: PaymentVerificationResult): boolean {
  return Boolean(
    verification.verified &&
      isPaychanguSuccessStatus(String(verification.status ?? '')),
  );
}

function resolveOrderByReferences(references: string[]) {
  for (const reference of references) {
    const order = orderRepository.findByPaymentReference(reference);
    if (order) return order;
  }

  return undefined;
}

function updatePaymentByReferences(
  references: string[],
  updater: Parameters<typeof paymentRepository.updateByReference>[1],
) {
  for (const reference of references) {
    const payment = paymentRepository.updateByReference(reference, updater);
    if (payment) return payment;
  }

  return undefined;
}

function confirmOrderByReferences(references: string[]) {
  for (const reference of references) {
    const order = serverOrderService.confirmByPaymentReference(reference);
    if (order) return order;
  }

  return undefined;
}

export function applyVerifiedPayChanguPayment(
  verification: PaymentVerificationResult,
): ApplyPayChanguResult {
  const referenceCandidates = resolveReferenceCandidates(verification);
  const reference = referenceCandidates[0];
  if (!reference) {
    throw new Error('Missing PayChangu reference');
  }

  if (!isCaptured(verification)) {
    throw new Error(
      `applyVerifiedPayChanguPayment only accepts verified paid/captured statuses for ${reference}`,
    );
  }

  const payment = updatePaymentByReferences(referenceCandidates, (current) => ({
    ...current,
    verified: true,
    verification,
    status: 'captured',
    paidAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  let order = resolveOrderByReferences(referenceCandidates);
  if (!order && payment) {
    order = orderRepository.findById(payment.orderId);
  }

  if (!order) {
    return {
      payment,
      verification,
    };
  }

  const confirmedOrder =
    confirmOrderByReferences(referenceCandidates) ??
    serverOrderService.setStatus(order.id, 'paid') ??
    order;

  const activeOrder = confirmedOrder ?? order;
  const escrowAmount = verification.amount?.amount ?? activeOrder.total.amount;
  const currency = String(verification.currency ?? activeOrder.currency ?? 'MWK').toUpperCase();

  if (!escrowRepository.findByOrderId(activeOrder.id)) {
    escrowRepository.create(activeOrder.id, currency, escrowAmount);
  }

  const escrowedOrder = serverOrderService.setStatus(activeOrder.id, 'in_escrow') ?? activeOrder;

  if (escrowedOrder.status === 'in_escrow' && order.status !== 'in_escrow') {
    emitOrderPaidNotification(
      escrowedOrder.buyerId,
      escrowedOrder.sellerId,
      escrowedOrder.id,
    );
  }

  return {
    payment,
    order: escrowedOrder,
    verification,
  };
}

export function seedDemoPayChanguPayment(
  payment: PaymentResult,
): ReturnType<typeof paymentRepository.save> {
  return paymentRepository.save({
    ...payment,
    verified: false,
  });
}

import type { PaymentResult, PaymentVerificationResult } from '../../../src/modules/payments/types.js';
import '../payouts/payout.schema.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/order.repository.js';
import { serverOrderService } from '../orders/order.service.js';
import { escrowRepository } from '../escrow/escrow.repository.js';
import { isPaychanguSuccessStatus } from './paychangu.provider.js';
import { getPaymentDb } from '../../sqlite.js';
import { calculatePayoutFormula } from '../payouts/payout.policy.js';

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

export function buildPayChanguPayoutChargeId(payoutId: string, attemptNo: number): string {
  const safeAttemptNo = Number.isFinite(attemptNo) && attemptNo > 0 ? Math.trunc(attemptNo) : 1;
  return `BM-PO-${payoutId}-A${String(safeAttemptNo).padStart(2, '0')}`;
}


function findActiveVerifiedDestination(sellerId: string): { id: string; destination_type: string | null } | undefined {
  return getPaymentDb()
    .prepare(
      `SELECT id, destination_type
       FROM seller_payout_accounts
       WHERE seller_uid = ?
         AND is_active = 1
         AND verification_status = 'verified'
       ORDER BY is_default DESC, verified_at DESC, created_at DESC
       LIMIT 1`,
    )
    .get(sellerId) as { id: string; destination_type: string | null } | undefined;
}

function normalizePayoutMethod(destinationType: string | null | undefined): Parameters<typeof calculatePayoutFormula>[0]['payoutMethod'] {
  if (destinationType === 'airtel_money' || destinationType === 'tnm_mpamba' || destinationType === 'bank_transfer') {
    return destinationType;
  }
  return null;
}

function emitSellerPayoutQueuedNotification(sellerId: string, orderId: string, payoutId: string): void {
  const payload = {
    orderId,
    payoutId,
    sellerId,
    event: 'seller_payout_queued',
    emittedAt: new Date().toISOString(),
  };

  console.log('[notification] seller_payout_queued', JSON.stringify(payload));
}

function queueConnectPayout(order: NonNullable<ReturnType<typeof orderRepository.findById>>, verification: PaymentVerificationResult): void {
  const db = getPaymentDb();
  const existing = db
    .prepare('SELECT id FROM payouts WHERE order_id = ? AND escrow_id IS NULL LIMIT 1')
    .get(order.id) as { id: string } | undefined;
  if (existing) return;

  const destination = findActiveVerifiedDestination(order.sellerId);
  const grossAmount = verification.amount?.amount ?? order.total.amount;
  const currency = String(verification.currency ?? order.currency ?? 'MWK').toUpperCase();
  const formula = calculatePayoutFormula({
    grossAmount,
    currency,
    payoutMethod: normalizePayoutMethod(destination?.destination_type),
  });
  const now = new Date().toISOString();
  const payoutId = `connect_${order.id}`;
  const snapshot = {
    settlementRoute: 'connect',
    payoutFormula: formula,
    paymentReference: order.paymentReference ?? verification.reference ?? verification.txRef ?? null,
  };

  db.prepare(
    `INSERT OR IGNORE INTO payouts (
      id,
      seller_id,
      order_id,
      escrow_id,
      release_entry_id,
      destination_account_id,
      amount,
      gross_amount,
      platform_fee_amount,
      processing_fee_amount,
      reserve_amount,
      reserve_cap_amount,
      manual_adjustment_amount,
      payout_fee_amount,
      seller_receives_amount,
      net_amount,
      formula_snapshot,
      currency,
      status,
      provider,
      provider_charge_id,
      requested_by,
      requested_at,
      raw_request,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 'paychangu', NULL, 'system', ?, ?, ?, ?)`,
  ).run(
    payoutId,
    order.sellerId,
    order.id,
    destination?.id ?? null,
    formula.netAmount,
    formula.grossAmount,
    formula.platformFeeAmount,
    formula.processingFeeAmount,
    formula.reserveAmount,
    formula.reserveCapAmount,
    formula.manualAdjustmentAmount,
    formula.payoutFeeAmount,
    formula.sellerReceivesAmount,
    formula.netAmount,
    JSON.stringify(formula),
    currency,
    now,
    JSON.stringify(snapshot),
    now,
    now,
  );

  const created = db.prepare('SELECT id FROM payouts WHERE id = ?').get(payoutId) as { id: string } | undefined;
  if (!created) return;

  db.prepare(
    `INSERT INTO payout_events (
      payout_id, seller_id, event_type, actor_type, actor_id, note, payload, created_at
    ) VALUES (?, ?, 'connect_payout_queued', 'system', NULL, ?, ?, ?)`,
  ).run(
    payoutId,
    order.sellerId,
    'Connect payout queued after captured PayChangu payment',
    JSON.stringify(snapshot),
    now,
  );
  emitSellerPayoutQueuedNotification(order.sellerId, order.id, payoutId);
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

  if (activeOrder.settlementRoute === 'connect') {
    queueConnectPayout(activeOrder, verification);
    return {
      payment,
      order: activeOrder,
      verification,
    };
  }

  const escrowAmount = verification.amount?.amount ?? activeOrder.total.amount;
  const currency = String(verification.currency ?? activeOrder.currency ?? 'MWK').toUpperCase();

  let escrow = escrowRepository.findByOrderId(activeOrder.id);

  if (!escrow) {
    escrow = escrowRepository.create(activeOrder.id, currency, escrowAmount);
  }

  const escrowedOrder =
    serverOrderService.markInEscrow(activeOrder.id, escrow.id) ??
    activeOrder;

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

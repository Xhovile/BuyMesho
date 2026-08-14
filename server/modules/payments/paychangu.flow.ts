import type { PaymentResult, PaymentVerificationResult } from '../../../src/modules/payments/types.js';
import '../payouts/payout.schema.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/order.repository.js';
import { serverOrderService } from '../orders/order.service.js';
import { escrowRepository } from '../escrow/escrow.repository.js';
import { payoutRepository, payoutService } from '../payouts/payout.service.js';
import { getConnectAccount } from '../connect/connect.service.js';
import { calculatePayoutFormula } from '../payouts/payout.policy.js';
import { getPaymentDb } from '../../postgresCompat.js';
import { isPaychanguSuccessStatus } from './paychangu.provider.js';
import { notifyOrderPaid } from '../notifications/order-paid.notification.js';

export interface ApplyPayChanguResult {
  payment?: ReturnType<typeof paymentRepository.findByReference>;
  order?: ReturnType<typeof orderRepository.findByPaymentReference>;
  verification: PaymentVerificationResult;
}

interface SellerPayoutDestination {
  id: string;
  destination_type?: string | null;
  provider_ref_id?: string | null;
  provider_name?: string | null;
}

type ConnectPayoutMethod = 'airtel_money' | 'tnm_mpamba' | 'bank_transfer' | null;

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

function emitOrderPaidNotification(order: ReturnType<typeof orderRepository.findByPaymentReference>): void {
  if (!order) return;
  void notifyOrderPaid(order).catch((error) => {
    console.warn('[notification] order_paid email delivery failed', error);
  });
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

function findSellerDefaultPayoutDestination(sellerId: string): SellerPayoutDestination | undefined {
  return getPaymentDb().prepare(
    `SELECT id, destination_type, provider_ref_id, provider_name
     FROM seller_payout_accounts
     WHERE seller_uid = ?
       AND is_active = 1
       AND verification_status = 'verified'
     ORDER BY is_default DESC, updated_at DESC
     LIMIT 1`,
  ).get(sellerId) as unknown as SellerPayoutDestination | undefined;
}

function derivePayoutMethod(destination: SellerPayoutDestination | undefined): ConnectPayoutMethod {
  if (destination?.destination_type === 'bank') {
    return 'bank_transfer';
  }

  const providerReference = `${destination?.provider_ref_id ?? ''} ${destination?.provider_name ?? ''}`;
  if (/tnm|mpamba/i.test(providerReference)) {
    return 'tnm_mpamba';
  }

  if (/airtel/i.test(providerReference)) {
    return 'airtel_money';
  }

  return null;
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

  const order = resolveOrderByReferences(referenceCandidates);

  if (!order) {
    const payment = referenceCandidates
      .map((candidate) => paymentRepository.findByReference(candidate))
      .find(Boolean);

    return {
      payment,
      verification,
    };
  }

  if (['refunded', 'closed', 'disputed'].includes(order.status)) {
    const payment = referenceCandidates
      .map((candidate) => paymentRepository.findByReference(candidate))
      .find(Boolean);

    return {
      payment,
      order,
      verification,
    };
  }

  const settlement = getPaymentDb().transaction(() => {
    const existingPayment = referenceCandidates
      .map((candidate) => paymentRepository.findByReference(candidate))
      .find(Boolean);

    if (existingPayment?.status === 'refunded') {
      return {
        payment: existingPayment,
        order,
        verification,
        sellerPayoutQueued: false,
        payoutId: null,
        orderEnteredEscrow: false,
      };
    }

    const payment = updatePaymentByReferences(referenceCandidates, (current) => ({
      ...current,
      verified: true,
      verification,
      status: 'captured',
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const confirmedOrder =
      confirmOrderByReferences(referenceCandidates) ??
      serverOrderService.setStatus(order.id, 'paid') ??
      order;

    const activeOrder = confirmedOrder ?? order;

    if (activeOrder.settlementRoute === 'connect') {
      const connectAccount = getConnectAccount(activeOrder.sellerId);
      if (!connectAccount || connectAccount.status !== 'connected') {
        return {
          payment,
          order: activeOrder,
          verification,
          sellerPayoutQueued: false,
          payoutId: null,
          orderEnteredEscrow: false,
        };
      }

      const destination = findSellerDefaultPayoutDestination(activeOrder.sellerId);
      const payoutMethod = derivePayoutMethod(destination);
      const grossAmount = activeOrder.total.amount;
      const currency = normalizeReference(activeOrder.currency).toUpperCase();
      const payoutFormula = calculatePayoutFormula({
        grossAmount,
        currency,
        payoutMethod,
      });

      const { payout, created } = payoutService.createConnectPayoutCandidate({
        sellerId: activeOrder.sellerId,
        orderId: activeOrder.id,
        amount: payoutFormula.sellerReceivesAmount,
        grossAmount: payoutFormula.grossAmount,
        platformFeeAmount: payoutFormula.platformFeeAmount,
        processingFeeAmount: payoutFormula.processingFeeAmount,
        reserveAmount: payoutFormula.reserveAmount,
        reserveCapAmount: payoutFormula.reserveCapAmount,
        manualAdjustmentAmount: payoutFormula.manualAdjustmentAmount,
        payoutFeeAmount: payoutFormula.payoutFeeAmount,
        sellerReceivesAmount: payoutFormula.sellerReceivesAmount,
        netAmount: payoutFormula.netAmount,
        formulaSnapshot: payoutFormula,
        currency,
        requestedBy: 'system',
        destinationAccountId: destination?.id ?? null,
        snapshot: {
          payoutFormula,
          settlementRoute: activeOrder.settlementRoute,
          paymentReference: reference,
          payChanguVerificationReference: verification.reference ?? verification.txRef ?? null,
          connectAccountId: connectAccount.id,
          connectStatus: connectAccount.status,
          connectMode: connectAccount.mode,
        },
      });

      if (created) {
        payoutRepository.addEvent({
          payoutId: payout.id,
          sellerId: activeOrder.sellerId,
          eventType: 'connect_payout_queued',
          actorType: 'system',
          note: 'Connect payment created seller payout candidate',
          payload: {
            settlementRoute: activeOrder.settlementRoute,
            payoutFormula,
            destinationAccountId: destination?.id ?? null,
            connectAccountId: connectAccount.id,
            connectStatus: connectAccount.status,
            connectMode: connectAccount.mode,
            payChanguVerificationReference: verification.reference ?? verification.txRef ?? null,
          },
        });
      }

      return {
        payment,
        order: activeOrder,
        verification,
        sellerPayoutQueued: created,
        payoutId: payout.id,
        orderEnteredEscrow: false,
      };
    }

    const escrowAmount = activeOrder.total.amount;
    const currency = normalizeReference(activeOrder.currency).toUpperCase();

    const escrow = escrowRepository.create(activeOrder.id, currency, escrowAmount);
    const escrowedOrder =
      serverOrderService.markInEscrow(activeOrder.id, escrow.id) ??
      activeOrder;

    return {
      payment,
      order: escrowedOrder,
      verification,
      sellerPayoutQueued: false,
      payoutId: null,
      orderEnteredEscrow: escrowedOrder.status === 'in_escrow' && order.status !== 'in_escrow',
    };
  })();

  if (settlement.sellerPayoutQueued && settlement.payoutId) {
    emitSellerPayoutQueuedNotification(
      settlement.order.sellerId,
      settlement.order.id,
      settlement.payoutId,
    );
  }

  if (settlement.orderEnteredEscrow) {
    emitOrderPaidNotification(settlement.order);
  } else if (settlement.order?.status === 'paid') {
    emitOrderPaidNotification(settlement.order);
  }

  return {
    payment: settlement.payment,
    order: settlement.order,
    verification: settlement.verification,
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

import type { PaymentResult, PaymentVerificationResult } from '../../../src/modules/payments/types.js';
import type { OrderState } from '../../../src/modules/orders/orderState.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/order.repository.js';
import { serverOrderService } from '../orders/order.service.js';
import { applyVerifiedPayChanguPayment } from './paychangu.flow.js';

export interface PayChanguFlowHarnessResult {
  orderBefore: OrderState;
  payment: PaymentResult;
  verification: PaymentVerificationResult;
  applied: Awaited<ReturnType<typeof applyVerifiedPayChanguPayment>>;
  orderAfter: Awaited<ReturnType<typeof orderRepository.findById>>;
}

function buildSeedOrder(reference: string): OrderState {
  const now = new Date().toISOString();

  return {
    id: 'order_demo_001',
    buyerId: 'buyer_demo_001',
    sellerId: 'seller_demo_001',
    source: 'listing',
    status: 'draft',
    currency: 'MWK',
    subtotal: { amount: 50000, currency: 'MWK' },
    total: { amount: 50000, currency: 'MWK' },
    items: [
      {
        listingId: 'listing_demo_001',
        title: 'Demo item',
        quantity: 1,
        unitPrice: { amount: 50000, currency: 'MWK' },
      },
    ],
    createdAt: now,
    updatedAt: now,
    paymentReference: reference,
    escrowId: 'escrow_demo_001',
  };
}

async function seedDemoPayment(order: OrderState): Promise<PaymentResult> {
  const now = new Date().toISOString();

  return paymentRepository.save({
    id: 'payment_demo_001',
    orderId: order.id,
    provider: 'paychangu',
    method: 'mobile_money',
    status: 'pending',
    amount: order.total,
    reference: order.paymentReference ?? order.id,
    providerReference: 'paychangu_demo_001',
    checkoutUrl: 'https://example.com/checkout',
    paidAt: null,
    rawResponse: {},
    createdAt: now,
    updatedAt: now,
    verified: false,
  });
}

export async function runPayChanguFlowHarness(txRef: string): Promise<PayChanguFlowHarnessResult> {
  const orderBefore = buildSeedOrder(txRef);
  await serverOrderService.create(orderBefore);
  const created = await seedDemoPayment(orderBefore);

  const verification: PaymentVerificationResult = {
    verified: true,
    provider: 'paychangu',
    txRef,
    reference: created.reference,
    status: 'captured',
    currency: created.amount.currency,
    amount: created.amount,
    checkoutUrl: created.checkoutUrl ?? null,
    rawResponse: created.rawResponse,
  };

  const applied = await applyVerifiedPayChanguPayment(verification);

  return {
    orderBefore,
    payment: created,
    verification,
    applied,
    orderAfter: await orderRepository.findById(orderBefore.id),
  };
}

export function getStoredDemoPayment(reference: string) {
  return paymentRepository.findByReference(reference);
}

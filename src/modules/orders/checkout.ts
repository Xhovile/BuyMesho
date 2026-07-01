import type { CreatePaymentRequest } from '../payments/types.js';
import type { OrderState, OrderStatus } from './orderState.js';
import type { CheckoutSettlementRoute, PaymentMethod, PaymentProviderKey } from '../../shared/types/payment.js';
import type { MoneyValue } from '../../shared/types/common.js';
import type { PaymentCustomer } from '../payments/types.js';

export interface CheckoutRequest {
  order: OrderState;
  provider: PaymentProviderKey;
  method: PaymentMethod;
  settlementRoute?: CheckoutSettlementRoute;
  customer?: Partial<PaymentCustomer>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutPlan {
  orderId: string;
  paymentRequest: CreatePaymentRequest;
  nextStatus: OrderStatus;
}

export function buildCheckoutPlan(request: CheckoutRequest): CheckoutPlan {
  const settlementRoute = request.settlementRoute ?? request.order.settlementRoute ?? 'escrow';

  const paymentRequest: CreatePaymentRequest = {
    orderId: request.order.id,
    provider: request.provider,
    method: request.method,
    settlementRoute,
    amount: request.order.total as MoneyValue,
    customer: {
      id: request.order.buyerId,
      name: request.customer?.name || request.customer?.email || request.order.buyerId,
      email: request.customer?.email,
      phoneNumber: request.customer?.phoneNumber,
    },
    returnUrl: request.returnUrl,
    cancelUrl: request.cancelUrl,
    metadata: {
      orderSource: request.order.source,
      sellerId: request.order.sellerId,
      escrowId: request.order.escrowId,
      settlementRoute,
    },
  };

  return {
    orderId: request.order.id,
    paymentRequest,
    nextStatus: 'pending_payment',
  };
}

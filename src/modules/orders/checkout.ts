import type { CreatePaymentRequest } from '../payments/types';
import type { OrderState, OrderStatus } from './orderState';
import type { PaymentMethod, PaymentProviderKey } from '../../shared/types/payment';
import type { MoneyValue } from '../../shared/types/common';

export interface CheckoutRequest {
  order: OrderState;
  provider: PaymentProviderKey;
  method: PaymentMethod;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutPlan {
  orderId: string;
  paymentRequest: CreatePaymentRequest;
  nextStatus: OrderStatus;
}

export function buildCheckoutPlan(request: CheckoutRequest): CheckoutPlan {
  const paymentRequest: CreatePaymentRequest = {
    orderId: request.order.id,
    provider: request.provider,
    method: request.method,
    amount: request.order.total as MoneyValue,
    customer: {
      id: request.order.buyerId,
      name: request.order.buyerId,
    },
    returnUrl: request.returnUrl,
    cancelUrl: request.cancelUrl,
    metadata: {
      orderSource: request.order.source,
      sellerId: request.order.sellerId,
      escrowId: request.order.escrowId,
    },
  };

  return {
    orderId: request.order.id,
    paymentRequest,
    nextStatus: 'pending_payment',
  };
}

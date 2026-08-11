import { buildCheckoutPlan, type CheckoutRequest, type CheckoutPlan } from './checkout.js';
import type { OrderState, OrderStatus, OrderStateTransition } from './orderState.js';

export interface CreateOrderResult {
  order: OrderState;
  checkout?: CheckoutPlan;
}

export interface ConfirmPaymentResult {
  order: OrderState;
  verification: { verified: boolean; reference?: string; txRef?: string };
}

export interface TransitionOrderRequest {
  order: OrderState;
  to: OrderStatus;
  reason: string;
}

export class OrderService {
  createCheckout(order: OrderState, request: Omit<CheckoutRequest, 'order'>): CheckoutPlan {
    return buildCheckoutPlan({ order, ...request });
  }

  transition(request: TransitionOrderRequest): { order: OrderState; transition: OrderStateTransition } {
    return {
      order: {
        ...request.order,
        status: request.to,
      },
      transition: {
        from: request.order.status,
        to: request.to,
        reason: request.reason,
      },
    };
  }
}

export const orderService = new OrderService();

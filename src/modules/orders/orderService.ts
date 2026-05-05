import { buildCheckoutPlan, type CheckoutRequest, type CheckoutPlan } from './checkout.js';
import type { OrderState, OrderStatus, OrderStateTransition } from './orderState.js';
import { escrowService, type EscrowRecord } from '../escrow/escrowService.js';
import { paymentService } from '../payments/services/paymentService.js';
import type { PaymentResult, PaymentVerificationResult } from '../payments/types.js';

export interface CreateOrderResult {
  order: OrderState;
  checkout?: CheckoutPlan;
  payment?: PaymentResult;
  escrow?: EscrowRecord;
}

export interface ConfirmPaymentResult {
  order: OrderState;
  verification: PaymentVerificationResult;
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

  async startPayment(order: OrderState, request: Omit<CheckoutRequest, 'order'>): Promise<CreateOrderResult> {
    const checkout = this.createCheckout(order, request);
    const payment = await paymentService.createPayment(checkout.paymentRequest);
    const escrow = escrowService.createEscrow({
      escrowId: order.escrowId ?? order.id,
      orderId: order.id,
      currency: order.currency,
    });

    return {
      order: {
        ...order,
        status: 'pending_payment',
        paymentProvider: request.provider,
        paymentReference: payment.reference,
        escrowId: escrow.id,
      },
      checkout,
      payment,
      escrow,
    };
  }

  async confirmPaychanguPayment(order: OrderState, txRef: string): Promise<ConfirmPaymentResult> {
    const verification = await paymentService.verifyPaychanguPayment(txRef);

    if (!verification.verified) {
      return {
        order: {
          ...order,
          status: 'pending_payment',
          paymentReference: verification.reference ?? txRef,
          paymentProvider: 'paychangu',
        },
        verification,
      };
    }

    return {
      order: {
        ...order,
        status: 'paid',
        paymentReference: verification.reference ?? txRef,
        paymentProvider: 'paychangu',
      },
      verification,
    };
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

import type { OrderState, OrderStatus } from '../../../src/modules/orders/orderState.js';
import { assertAllowedOrderTransition } from '../../../src/modules/orders/orderState.js';
import { orderRepository, type StoredOrder } from './order.repository.js';

function transitionOrder(current: StoredOrder, status: OrderStatus): StoredOrder {
  assertAllowedOrderTransition(current.status, status);
  return orderRepository.save({
    ...current,
    status,
    deliveryStatus:
      status === 'fulfilled' || status === 'closed'
        ? 'delivered'
        : current.deliveryStatus ?? 'action_required',
    paymentReference: current.paymentReference ?? null,
    updatedAt: new Date().toISOString(),
  });
}

export class ServerOrderService {
  create(order: OrderState): StoredOrder {
    const stored: StoredOrder = {
      ...order,
      status: 'pending_payment',
      deliveryStatus: 'action_required',
      paymentReference: order.paymentReference ?? null,
    };
    return orderRepository.save(stored);
  }

  markPaid(order: OrderState): StoredOrder {
    const current = orderRepository.findById(order.id);
    if (!current) {
      throw new Error(`Order ${order.id} not found`);
    }
    return transitionOrder(current, 'paid');
  }

  confirmByPaymentReference(reference: string): StoredOrder | undefined {
    const current = orderRepository.findByPaymentReference(reference);
    if (!current) return undefined;
    return transitionOrder(current, 'paid');
  }

  complete(order: OrderState): StoredOrder {
    const current = orderRepository.findById(order.id);
    if (!current) {
      throw new Error(`Order ${order.id} not found`);
    }
    return transitionOrder(current, 'closed');
  }

  setStatus(orderId: string, status: OrderStatus): StoredOrder | undefined {
    const current = orderRepository.findById(orderId);
    if (!current) return undefined;
    return transitionOrder(current, status);
  }

  markInEscrow(orderId: string, escrowId: string): StoredOrder | undefined {
    const current = orderRepository.findById(orderId);
    if (!current) return undefined;
    assertAllowedOrderTransition(current.status, 'in_escrow');
    return orderRepository.save({
      ...current,
      escrowId,
      status: 'in_escrow',
      deliveryStatus: current.deliveryStatus ?? 'action_required',
      updatedAt: new Date().toISOString(),
    });
  }

  markPendingDelivery(orderId: string): StoredOrder | undefined {
    const current = orderRepository.findById(orderId);
    if (!current) return undefined;
    if (!['paid', 'in_escrow', 'disputed'].includes(current.status)) {
      throw new Error(`Order ${orderId} is not ready for seller delivery`);
    }
    if (current.deliveryStatus === 'delivered') {
      throw new Error(`Order ${orderId} has already been delivered`);
    }
    return orderRepository.save({
      ...current,
      deliveryStatus: 'pending_delivery',
      updatedAt: new Date().toISOString(),
    });
  }
}

export const serverOrderService = new ServerOrderService();
import type { OrderState, OrderStatus } from '../../../src/modules/orders/orderState.js';
import { assertAllowedOrderTransition } from '../../../src/modules/orders/orderState.js';
import { orderRepository, type StoredOrder } from './order.repository.js';

function transitionOrder(current: StoredOrder, status: OrderStatus): StoredOrder {
  assertAllowedOrderTransition(current.status, status);
  return orderRepository.save({
    ...current,
    status,
    paymentReference: current.paymentReference ?? null,
    updatedAt: new Date().toISOString(),
  });
}

export class ServerOrderService {
  create(order: OrderState): StoredOrder {
    const stored: StoredOrder = {
      ...order,
      status: 'pending_payment',
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
      updatedAt: new Date().toISOString(),
    });
  }
}

export const serverOrderService = new ServerOrderService();

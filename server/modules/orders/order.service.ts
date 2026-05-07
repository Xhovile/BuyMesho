import type { OrderState, OrderStatus } from '../../../src/modules/orders/orderState.js';
import { orderRepository, type StoredOrder } from './order.repository.js';

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
    return orderRepository.save({
      ...order,
      status: 'paid',
      paymentReference: order.paymentReference ?? null,
    });
  }

  confirmByPaymentReference(reference: string): StoredOrder | undefined {
    return orderRepository.updateByPaymentReference(reference, (current) => ({
      ...current,
      status: 'paid',
    }));
  }

  complete(order: OrderState): StoredOrder {
    return orderRepository.save({
      ...order,
      status: 'closed',
      paymentReference: order.paymentReference ?? null,
    });
  }

  setStatus(orderId: string, status: OrderStatus): StoredOrder | undefined {
    return orderRepository.update(orderId, (current) => ({
      ...current,
      status,
      updatedAt: new Date().toISOString(),
    }));
  }
}

export const serverOrderService = new ServerOrderService();

import type { OrderState } from '../../../src/modules/orders/orderState';
import { orderRepository, type StoredOrder } from './order.repository';

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
}

export const serverOrderService = new ServerOrderService();

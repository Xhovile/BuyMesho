import type { OrderState } from '../../../src/modules/orders/orderState.js';
import type { PoolClient } from 'pg';
import { orderRepository, type StoredOrder } from './order.repository.js';

export class ServerOrderService {
  create(order: OrderState): Promise<StoredOrder> {
    const stored: StoredOrder = {
      ...order,
      status: 'pending_payment',
      paymentReference: order.paymentReference ?? null,
    };
    return orderRepository.save(stored);
  }

  markPaid(order: OrderState): Promise<StoredOrder> {
    return orderRepository.save({
      ...order,
      status: 'paid',
      paymentReference: order.paymentReference ?? null,
    });
  }

  confirmByPaymentReference(reference: string, client?: Pick<PoolClient, 'query'>): Promise<StoredOrder | undefined> {
    return orderRepository.updateByPaymentReference(reference, (current) => ({
      ...current,
      status: 'paid',
    }), client);
  }

  complete(order: OrderState): Promise<StoredOrder> {
    return orderRepository.save({
      ...order,
      status: 'closed',
      paymentReference: order.paymentReference ?? null,
    });
  }
}

export const serverOrderService = new ServerOrderService();

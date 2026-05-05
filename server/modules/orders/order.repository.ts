import type { OrderState } from '../../../src/modules/orders/orderState';

export interface StoredOrder extends OrderState {
  paymentReference?: string | null;
}

export class InMemoryOrderRepository {
  private readonly orders = new Map<string, StoredOrder>();

  save(order: StoredOrder): StoredOrder {
    this.orders.set(order.id, order);
    return order;
  }

  findById(id: string): StoredOrder | undefined {
    return this.orders.get(id);
  }

  findByPaymentReference(reference: string): StoredOrder | undefined {
    return [...this.orders.values()].find((order) => order.paymentReference === reference);
  }

  update(id: string, updater: (order: StoredOrder) => StoredOrder): StoredOrder | undefined {
    const current = this.orders.get(id);
    if (!current) return undefined;
    const next = updater(current);
    this.orders.set(id, next);
    return next;
  }
}

export const orderRepository = new InMemoryOrderRepository();

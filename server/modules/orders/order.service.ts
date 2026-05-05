import type { OrderState } from '../../../src/modules/orders/orderState';

export class ServerOrderService {
  create(order: OrderState): OrderState {
    return {
      ...order,
      status: 'pending_payment',
    };
  }

  markPaid(order: OrderState): OrderState {
    return {
      ...order,
      status: 'paid',
    };
  }

  complete(order: OrderState): OrderState {
    return {
      ...order,
      status: 'closed',
    };
  }
}

export const serverOrderService = new ServerOrderService();

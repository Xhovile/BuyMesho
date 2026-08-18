import type { OrderState, OrderStatus } from '../../../src/modules/orders/orderState.js';
import { assertAllowedOrderTransition } from '../../../src/modules/orders/orderState.js';
import { orderRepository, type StoredOrder } from './order.repository.js';
import type { PoolClient } from 'pg';

type DbExecutor = Pick<PoolClient, 'query'>;

function transitionOrder(current: StoredOrder, status: OrderStatus): StoredOrder {
  assertAllowedOrderTransition(current.status, status);
  return orderRepository.save({
    ...current, status,
    deliveryStatus: status === 'fulfilled' || status === 'closed' ? 'delivered' : current.deliveryStatus ?? 'action_required',
    paymentReference: current.paymentReference ?? null, updatedAt: new Date().toISOString(),
  });
}

export class ServerOrderService {
  create(order: OrderState): StoredOrder { return orderRepository.save({ ...order, status:'pending_payment', deliveryStatus:'action_required', paymentReference:order.paymentReference ?? null }); }
  markPaid(order: OrderState): StoredOrder { const current=orderRepository.findById(order.id); if(!current)throw new Error(`Order ${order.id} not found`); return transitionOrder(current,'paid'); }
  confirmByPaymentReference(reference:string):StoredOrder|undefined{const current=orderRepository.findByPaymentReference(reference);return current?transitionOrder(current,'paid'):undefined;}
  complete(order:OrderState):StoredOrder{const current=orderRepository.findById(order.id);if(!current)throw new Error(`Order ${order.id} not found`);return transitionOrder(current,'closed');}
  setStatus(orderId:string,status:OrderStatus):StoredOrder|undefined{const current=orderRepository.findById(orderId);return current?transitionOrder(current,status):undefined;}
  markInEscrow(orderId:string,escrowId:string):StoredOrder|undefined{const current=orderRepository.findById(orderId);if(!current)return undefined;assertAllowedOrderTransition(current.status,'in_escrow');return orderRepository.save({...current,escrowId,status:'in_escrow',deliveryStatus:current.deliveryStatus??'action_required',updatedAt:new Date().toISOString()});}
  markPendingDelivery(orderId:string):StoredOrder|undefined{const current=orderRepository.findById(orderId);if(!current)return undefined;if(!['paid','in_escrow','disputed'].includes(current.status))throw new Error(`Order ${orderId} is not ready for seller delivery`);if(current.deliveryStatus==='delivered')throw new Error(`Order ${orderId} has already been delivered`);return orderRepository.save({...current,deliveryStatus:'pending_delivery',updatedAt:new Date().toISOString()});}

  async confirmByPaymentReferenceAsync(reference:string,executor?:DbExecutor):Promise<StoredOrder|undefined>{
    const current=await orderRepository.findByPaymentReferenceAsync(reference,executor); if(!current)return undefined;
    assertAllowedOrderTransition(current.status,'paid');
    return orderRepository.saveAsync({...current,status:'paid',deliveryStatus:'action_required',paymentReference:current.paymentReference??null,updatedAt:new Date().toISOString()},executor);
  }

  async setStatusAsync(orderId:string,status:OrderStatus,executor?:DbExecutor):Promise<StoredOrder|undefined>{
    const current=await orderRepository.findByIdAsync(orderId,executor); if(!current)return undefined;
    assertAllowedOrderTransition(current.status,status);
    return orderRepository.saveAsync({...current,status,deliveryStatus:status==='fulfilled'||status==='closed'?'delivered':current.deliveryStatus??'action_required',paymentReference:current.paymentReference??null,updatedAt:new Date().toISOString()},executor);
  }

  async markInEscrowAsync(orderId:string,escrowId:string,executor?:DbExecutor):Promise<StoredOrder|undefined>{
    const current=await orderRepository.findByIdAsync(orderId,executor); if(!current)return undefined;
    assertAllowedOrderTransition(current.status,'in_escrow');
    return orderRepository.saveAsync({...current,escrowId,status:'in_escrow',deliveryStatus:current.deliveryStatus??'action_required',updatedAt:new Date().toISOString()},executor);
  }
}

export const serverOrderService = new ServerOrderService();

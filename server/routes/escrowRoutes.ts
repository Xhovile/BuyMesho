import express, { type RequestHandler } from 'express';
import { createBuyerEscrowRouter } from './escrow/buyerEscrowRoutes.js';
import { createDisputeRouter } from './escrow/disputeRoutes.js';
import { createPayoutRouter } from './escrow/payoutRoutes.js';

export {
  createBuyerEscrowRouter,
  createDisputeRouter,
  createPayoutRouter,
};

function getRequestUser(req: Request): { uid: string; is_admin?: boolean } | null {
  if (!req.user?.uid) return null;
  return { uid: req.user.uid, is_admin: req.user.is_admin === true };
}

function canAccessOrder(req: Request, order: { buyerId: string; sellerId: string }): boolean {
  const user = getRequestUser(req);
  if (!user) return false;
  if (user.is_admin) return true;
  return user.uid === order.buyerId || user.uid === order.sellerId;
}

function assertOrderAccess(req: Request, orderId: string) {
  const order = orderRepository.findById(orderId);

  if (!order) {
    return { error: { status: 404, body: { error: 'Order not found' } } as const };
  }

  if (!canAccessOrder(req, order)) {
    return {
      error: {
        status: 403,
        body: { error: 'You are not allowed to access this order' },
      } as const,
    };
  }

  return { order };
}

export function createEscrowRouter(requireAuth: RequestHandler): express.Router {
  return createBuyerEscrowRouter(requireAuth);
}

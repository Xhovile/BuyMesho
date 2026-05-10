import type { Request } from 'express';
import rateLimit from 'express-rate-limit';

export const disputeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a moment.' },
});

export const payoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a moment.' },
});

export const escrowActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a moment.' },
});

export function jsonError(error: unknown, fallback: string): { error: string } {
  return { error: error instanceof Error ? error.message : fallback };
}

export function getRequestUser(req: Request): { uid: string; is_admin?: boolean } | null {
  if (!req.user?.uid) return null;
  return { uid: req.user.uid, is_admin: req.user.is_admin === true };
}

export function canAccessOrder(req: Request, order: { buyerId: string; sellerId: string }): boolean {
  const user = getRequestUser(req);
  if (!user) return false;
  if (user.is_admin) return true;
  return user.uid === order.buyerId || user.uid === order.sellerId;
}

export function assertOrderAccess(req: Request, orderId: string, orderRepository: { findById: (id: string) => any }) {
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

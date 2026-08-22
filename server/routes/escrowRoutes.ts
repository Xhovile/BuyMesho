import express, { type RequestHandler } from 'express';
import { createBuyerEscrowRouter } from './escrow/buyerEscrowRoutes.js';
import { createDisputeRouter } from './escrow/disputeRoutes.js';
import { createPayoutRouter } from './escrow/payoutRoutes.js';
import { createRefundRouter } from './escrow/refundRoutes.js';

export {
  createBuyerEscrowRouter,
  createDisputeRouter,
  createPayoutRouter,
  createRefundRouter,
};

export function createEscrowRouter(requireAuth: RequestHandler): express.Router {
  const router = createBuyerEscrowRouter(requireAuth);
  router.use(createRefundRouter(requireAuth));
  return router;
}

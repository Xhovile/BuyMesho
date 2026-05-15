import express, { type RequestHandler } from 'express';
import { escrowRepository } from '../../modules/escrow/escrow.repository.js';
import { serverOrderService } from '../../modules/orders/order.service.js';
import { orderRepository } from '../../modules/orders/order.repository.js';
import {
  assertEscrowReleaseAccess,
  assertOrderAccess,
  escrowActionLimiter,
  jsonError,
} from './shared.js';

export function createBuyerEscrowRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get('/:orderId', requireAuth, (req, res) => {
    try {
      const access = assertOrderAccess(req, req.params.orderId, orderRepository);

      if ('error' in access) {
        return res.status(access.error.status).json(access.error.body);
      }

      const escrow = escrowRepository.findByOrderId(req.params.orderId);

      if (!escrow) {
        return res.status(404).json({ error: 'Escrow not found for this order' });
      }

      return res.status(200).json(escrow);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch escrow'));
    }
  });

  router.post('/:orderId/release', escrowActionLimiter, requireAuth, (req, res) => {
    try {
      const access = assertEscrowReleaseAccess(req, req.params.orderId, orderRepository);

      if ('error' in access) {
        return res.status(access.error.status).json(access.error.body);
      }

      const { orderId } = req.params;
      const escrow = escrowRepository.findByOrderId(orderId);

      if (!escrow) {
        return res.status(404).json({ error: 'Escrow not found' });
      }

      if (
        escrow.state === 'released' ||
        escrow.state === 'refunded' ||
        escrow.state === 'closed'
      ) {
        return res.status(400).json({ error: `Escrow is already ${escrow.state}` });
      }

      const updated = escrowRepository.updateState(orderId, 'released');
      const orderUpdated = serverOrderService.setStatus(orderId, 'fulfilled');

      if (!orderUpdated) {
        console.warn(
          `[escrow] release: order ${orderId} not found when updating status to fulfilled`,
        );
      }

      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to release escrow'));
    }
  });

  router.post('/:orderId/refund', escrowActionLimiter, requireAuth, (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { orderId } = req.params;
      const escrow = escrowRepository.findByOrderId(orderId);

      if (!escrow) {
        return res.status(404).json({ error: 'Escrow not found' });
      }

      if (
        escrow.state === 'released' ||
        escrow.state === 'refunded' ||
        escrow.state === 'closed'
      ) {
        return res.status(400).json({ error: `Escrow is already ${escrow.state}` });
      }

      const updated = escrowRepository.updateState(orderId, 'refunded');
      const orderUpdated = serverOrderService.setStatus(orderId, 'refunded');

      if (!orderUpdated) {
        console.warn(
          `[escrow] refund: order ${orderId} not found when updating status to refunded`,
        );
      }

      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to refund escrow'));
    }
  });

  return router;
}

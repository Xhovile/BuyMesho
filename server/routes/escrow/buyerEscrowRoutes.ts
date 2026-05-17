import express, { type RequestHandler } from 'express';
import { escrowRepository } from '../../modules/escrow/escrow.repository.js';
import { serverOrderService } from '../../modules/orders/order.service.js';
import { orderRepository } from '../../modules/orders/order.repository.js';
import { payoutRepository, payoutService } from '../../modules/payouts/payout.service.js';
import { calculatePayoutFormula } from '../../modules/payouts/payout.policy.js';
import { assertEscrowReleaseReadiness } from '../../modules/escrow/escrow.rules.js';
import { getPaymentDb } from '../../sqlite.js';
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

      const releaseReadiness = assertEscrowReleaseReadiness({
        orderStatus: access.order.status,
        escrowState: escrow.state,
        balanceAmount: escrow.balanceAmount,
        paymentCaptured:
          access.order.status === 'paid' ||
          access.order.status === 'in_escrow' ||
          access.order.status === 'fulfilled',
        disputeOpened: access.order.status === 'disputed',
      });

      if (!releaseReadiness.releasable) {
        return res.status(400).json({ error: releaseReadiness.reason });
      }

      const requesterId = req.user?.uid;
      if (!requesterId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const releaseReference =
        typeof req.body?.reference === 'string' && req.body.reference.trim()
          ? req.body.reference.trim()
          : `escrow-release:${orderId}`;

      const result = getPaymentDb().transaction(() => {
        const released = escrowRepository.releaseToSellerEarnings({
          orderId,
          releasedBy: requesterId,
          reference: releaseReference,
        });

        if (!released) {
          return undefined;
        }

        if (!releaseReadiness.payoutEligible) {
          throw new Error('Escrow release succeeded but payout is not eligible');
        }

        const db = getPaymentDb();
        const destination = db.prepare(
          `SELECT id
           FROM seller_payout_accounts
           WHERE seller_uid = ?
             AND is_active = 1
             AND verification_status = 'verified'
           ORDER BY is_default DESC, updated_at DESC
           LIMIT 1`,
        ).get(access.order.sellerId) as { id: string } | undefined;

        const payoutFormula = calculatePayoutFormula({
          grossAmount: released.releaseEntry.amount,
          currency: released.releaseEntry.currency,
        });

        const payout = payoutService.createEligiblePayoutCandidate({
          sellerId: access.order.sellerId,
          orderId,
          escrowId: released.escrow.id,
          releaseEntryId: released.releaseEntry.id,
          amount: payoutFormula.netAmount,
          currency: released.releaseEntry.currency,
          requestedBy: requesterId,
          requestedAt: released.releaseEntry.createdAt,
          destinationAccountId: destination?.id ?? null,
          snapshot: {
            payoutFormula,
            releaseAmount: released.releaseEntry.amount,
            releaseEntryId: released.releaseEntry.id,
          },
        });

        payoutRepository.addEvent({
          payoutId: payout.id,
          sellerId: access.order.sellerId,
          eventType: 'payout_released',
          actorType: requesterId === access.order.buyerId ? 'buyer' : req.user?.is_admin ? 'admin' : 'system',
          actorId: requesterId,
          note: 'Escrow release created payout candidate',
          payload: {
            escrowId: released.escrow.id,
            releaseEntryId: released.releaseEntry.id,
            payoutStatus: payout.status,
            payoutAmount: payout.amount,
            payoutFormula,
          },
        });

        const orderUpdated = serverOrderService.setStatus(orderId, 'fulfilled');

        if (!orderUpdated) {
          console.warn(
            `[escrow] release: order ${orderId} not found when updating status to fulfilled`,
          );
        }

        return {
          escrow: released.escrow,
          payout,
          payoutEligibility: {
            eligible: true,
            reason: releaseReadiness.reason,
          },
        };
      })();

      if (!result) {
        return res.status(404).json({ error: 'Escrow not found' });
      }

      return res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (
        message.startsWith('Escrow is already') ||
        message.startsWith('Escrow cannot') ||
        message.startsWith('Escrow has no') ||
        message.includes('not ready') ||
        message.includes('under dispute')
      ) {
        return res.status(400).json({ error: message });
      }

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

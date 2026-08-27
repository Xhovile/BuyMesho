import express, { type RequestHandler } from 'express';
import { escrowRepository } from '../../modules/escrow/escrow.repository.js';
import { serverOrderService } from '../../modules/orders/order.service.js';
import { orderRepository } from '../../modules/orders/order.repository.js';
import { notifyOrderFulfilled } from '../../modules/notifications/order-fulfilled.notification.js';
import { payoutService } from '../../modules/payouts/payout.service.js';
import { calculatePayoutFormula } from '../../modules/payouts/payout.policy.js';
import { assertEscrowReleaseReadiness } from '../../modules/escrow/escrow.rules.js';
import { getPaymentDb } from '../../postgresCompat.js';
import { withTransaction } from '../../postgres.js';
import { assertEscrowReleaseAccess, assertOrderAccess, escrowActionLimiter, jsonError } from './shared.js';

type VerifiedPayoutDestination = {
  id: string;
  destination_type?: string | null;
  provider_ref_id?: string | null;
  provider_name?: string | null;
};

function resolveVerifiedPayoutDestination(sellerId: string, client?: { query: Function }): Promise<VerifiedPayoutDestination | undefined> | VerifiedPayoutDestination | undefined {
  if (client) {
    return client.query(
      `SELECT id, destination_type, provider_ref_id, provider_name
       FROM seller_payout_accounts
       WHERE seller_uid = $1
         AND is_active = 1
         AND verification_status = 'verified'
       ORDER BY is_default DESC, updated_at DESC
       LIMIT 1`,
      [sellerId],
    ).then((result: { rows: VerifiedPayoutDestination[] }) => result.rows[0]);
  }

  const db = getPaymentDb();
  return db
    .prepare(
      `SELECT id, destination_type, provider_ref_id, provider_name
       FROM seller_payout_accounts
       WHERE seller_uid = ?
         AND is_active = 1
         AND verification_status = 'verified'
       ORDER BY is_default DESC, updated_at DESC
       LIMIT 1`,
    )
    .get(sellerId) as VerifiedPayoutDestination | undefined;
}

function getRequestedDestinationAccountId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;

  const candidate =
    (body as { destinationAccountId?: unknown }).destinationAccountId ??
    (body as { destination_id?: unknown }).destination_id ??
    (body as { payoutDestinationId?: unknown }).payoutDestinationId;

  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function releaseDebug(stage: string, details?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== 'test') return;
  console.error(`[escrow-release-debug] ${stage}`, details ?? {});
}

export function createBuyerEscrowRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get('/me', requireAuth, (req, res) => {
    try {
      const sellerId = req.user!.uid;
      const db = getPaymentDb();
      const rows = db
        .prepare(
          `SELECT id
           FROM orders
           WHERE seller_id = ?
           ORDER BY created_at DESC, updated_at DESC`,
        )
        .all(sellerId) as Array<{ id: string }>;

      const escrows = rows
        .map((row) => escrowRepository.findByOrderId(row.id))
        .filter((entry): entry is NonNullable<ReturnType<typeof escrowRepository.findByOrderId>> => entry !== undefined);

      return res.status(200).json(escrows);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch seller escrows'));
    }
  });

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

  router.post('/:orderId/release', escrowActionLimiter, requireAuth, async (req, res) => {
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

      const requestedDestinationAccountId = getRequestedDestinationAccountId(req.body);
      releaseDebug('transaction:start', { orderId, requesterId, sellerId: access.order.sellerId });

      const result = await withTransaction(async (client) => {
        releaseDebug('transaction:begin');
        const released = await escrowRepository.releaseToSellerEarningsAsync(
          { orderId, releasedBy: requesterId, reference: releaseReference },
          client,
        );
        releaseDebug('releaseToSellerEarningsAsync:end', { released: Boolean(released) });

        if (!released) return undefined;

        if (!releaseReadiness.payoutEligible) {
          throw new Error('Escrow release succeeded but payout is not eligible');
        }

        const destination = await resolveVerifiedPayoutDestination(access.order.sellerId, client);
        releaseDebug('destinationLookup:end', { found: Boolean(destination), destinationId: destination?.id });
        if (!destination) {
          throw new Error('No verified active payout destination found for seller');
        }

        if (requestedDestinationAccountId && requestedDestinationAccountId !== destination.id) {
          throw new Error('Invalid payout destination for this seller');
        }

        const payoutMethod =
          destination.destination_type === 'bank'
            ? 'bank_transfer'
            : /tnm|mpamba/i.test(`${destination.provider_ref_id ?? ''} ${destination.provider_name ?? ''}`)
              ? 'tnm_mpamba'
              : /airtel/i.test(`${destination.provider_ref_id ?? ''} ${destination.provider_name ?? ''}`)
                ? 'airtel_money'
                : null;

        const payoutFormula = calculatePayoutFormula({
          grossAmount: released.releaseEntry.amount,
          payoutMethod,
          currency: released.releaseEntry.currency,
        });

        const payout = await payoutService.createEligiblePayoutCandidateAsync({
          sellerId: access.order.sellerId,
          orderId,
          escrowId: released.escrow.id,
          releaseEntryId: released.releaseEntry.id,
          amount: payoutFormula.sellerReceivesAmount,
          grossAmount: payoutFormula.grossAmount,
          platformFeeAmount: payoutFormula.platformFeeAmount,
          processingFeeAmount: payoutFormula.processingFeeAmount,
          reserveAmount: payoutFormula.reserveAmount,
          reserveCapAmount: payoutFormula.reserveCapAmount,
          manualAdjustmentAmount: payoutFormula.manualAdjustmentAmount,
          payoutFeeAmount: payoutFormula.payoutFeeAmount,
          sellerReceivesAmount: payoutFormula.sellerReceivesAmount,
          netAmount: payoutFormula.netAmount,
          formulaSnapshot: payoutFormula,
          currency: released.releaseEntry.currency,
          requestedBy: requesterId,
          requestedAt: released.releaseEntry.createdAt,
          destinationAccountId: destination.id,
          snapshot: {
            payoutFormula,
            releaseAmount: released.releaseEntry.amount,
            releaseEntryId: released.releaseEntry.id,
            destinationAccountId: destination.id,
            requestedDestinationAccountId,
            payoutRetryWindowStartedAt: released.releaseEntry.createdAt,
          },
        }, client);

        const orderUpdated = await serverOrderService.setStatusAsync(orderId, 'fulfilled', client);
        if (!orderUpdated) {
          console.warn(`[escrow] release: order ${orderId} not found when updating status to fulfilled`);
        }

        return {
          escrow: released.escrow,
          payout,
          destination,
          requestedDestinationAccountId,
          orderUpdated,
          payoutEligibility: {
            eligible: true,
            reason: releaseReadiness.reason,
          },
          payoutFormula,
          releaseEntryId: released.releaseEntry.id,
          releaseTimestamp: released.releaseEntry.createdAt,
        };
      });

      releaseDebug('transaction:commit:end', { result: Boolean(result) });

      if (!result) {
        return res.status(404).json({ error: 'Escrow not found' });
      }

      await payoutService.executePayout({
        payoutId: result.payout.id,
        actorType: req.user?.is_admin ? 'admin' : 'system',
        actorId: requesterId,
      });

      const finalPayout = payoutService.findById(result.payout.id) ?? result.payout;

      if (result.orderUpdated) {
        await notifyOrderFulfilled(result.orderUpdated);
      }

      await payoutService.addEventAsync({
        payoutId: finalPayout.id,
        sellerId: access.order.sellerId,
        eventType: 'payout_released',
        actorType: req.user?.is_admin ? 'admin' : 'buyer',
        actorId: requesterId,
        note: 'Escrow release created and immediately submitted payout candidate',
        payload: {
          escrowId: result.escrow.id,
          releaseEntryId: result.releaseEntryId,
          releaseTimestamp: result.releaseTimestamp,
          payoutStatus: finalPayout.status,
          payoutAmount: finalPayout.amount,
          payoutFormula: result.payoutFormula,
          destinationAccountId: result.destination.id,
          requestedDestinationAccountId: result.requestedDestinationAccountId,
          destinationValidated: true,
          automaticRetryWindowHours: 48,
          automaticRetryIntervalHours: 3,
        },
      });

      return res.status(200).json({
        escrow: result.escrow,
        payout: finalPayout,
        payoutEligibility: result.payoutEligibility,
        payoutDestination: {
          id: result.destination.id,
          destinationType: result.destination.destination_type ?? null,
          providerRefId: result.destination.provider_ref_id ?? null,
          providerName: result.destination.provider_name ?? null,
          requestedDestinationAccountId: result.requestedDestinationAccountId,
          matched: result.requestedDestinationAccountId ? result.requestedDestinationAccountId === result.destination.id : true,
          verified: true,
          active: true,
        },
      });
    } catch (error) {
      releaseDebug('route:error', { error: error instanceof Error ? error.message : String(error) });
      return res.status(500).json(jsonError(error, 'Failed to release escrow'));
    }
  });

  return router;
}

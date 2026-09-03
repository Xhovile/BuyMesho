import express, { type RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { query, withTransaction } from '../../postgres.js';
import { escrowRepository } from '../../modules/escrow/escrow.repository.js';
import { serverOrderService } from '../../modules/orders/order.service.js';
import { notifyOrderDisputed } from '../../modules/notifications/order-disputed.notification.js';
import { assertAllowedDisputeTransition, type DisputeStatus } from './disputeState.js';
import {
  assertOrderAccessAsync,
  disputeLimiter,
  jsonError,
} from './shared.js';

async function resolveTicketToOrder(ticketId: string): Promise<{ ticketId: string; orderId: string } | null> {
  const result = await query<{ id?: string; order_id?: string }>(
    `SELECT id, order_id
     FROM event_tickets
     WHERE id = $1 OR code = $1
     LIMIT 1`,
    [ticketId],
  );

  const row = result.rows[0];
  if (!row?.id || !row.order_id) return null;
  return { ticketId: String(row.id), orderId: String(row.order_id) };
}

export function createDisputeRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.post('/', disputeLimiter, requireAuth, async (req, res) => {
    try {
      const { orderId: requestedOrderId, ticketId: requestedTicketId, reason } = req.body as {
        orderId?: string;
        ticketId?: string;
        reason?: string;
      };

      const orderId = requestedOrderId?.trim() || '';
      const ticketIdInput = requestedTicketId?.trim() || '';
      if ((!orderId && !ticketIdInput) || !reason?.trim()) {
        return res.status(400).json({ error: 'ticketId or orderId, and reason are required' });
      }

      let resolvedTicketId: string | null = null;
      let resolvedOrderId = orderId;

      if (ticketIdInput) {
        const resolved = await resolveTicketToOrder(ticketIdInput);
        if (!resolved) return res.status(404).json({ error: 'Event ticket not found' });
        resolvedTicketId = resolved.ticketId;
        resolvedOrderId = resolved.orderId;
      }

      if (!resolvedOrderId) {
        return res.status(400).json({ error: 'A valid order or ticket is required' });
      }

      const access = await assertOrderAccessAsync(req, resolvedOrderId);
      if ('error' in access) return res.status(access.error.status).json(access.error.body);

      const openedBy = req.user!.uid;
      const now = new Date().toISOString();

      const result = await withTransaction(async (client) => {
        const existingResult = await client.query<Record<string, unknown>>(
          resolvedTicketId
            ? `SELECT * FROM disputes
               WHERE ticket_id = $1 AND status = 'open'
               ORDER BY created_at ASC LIMIT 1`
            : `SELECT * FROM disputes
               WHERE order_id = $1 AND status = 'open'
               ORDER BY created_at ASC LIMIT 1`,
          [resolvedTicketId ?? resolvedOrderId],
        );

        const existing = existingResult.rows[0];
        if (existing) return { created: false, dispute: existing };

        const id = randomUUID();
        const escrow = await escrowRepository.findByOrderIdAsync(resolvedOrderId, client);

        await client.query(
          `INSERT INTO disputes (
            id, order_id, ticket_id, escrow_id, opened_by, reason, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8)`,
          [id, resolvedOrderId, resolvedTicketId, escrow?.id ?? null, openedBy, reason.trim(), now, now],
        );

        if (escrow) {
          await escrowRepository.updateStateAsync(resolvedOrderId, 'disputed', client);
          const updatedOrder = await serverOrderService.setStatusAsync(resolvedOrderId, 'disputed', client);
          if (!updatedOrder) throw new Error('Order not found while opening dispute');
        }

        const createdResult = await client.query<Record<string, unknown>>(
          'SELECT * FROM disputes WHERE id = $1 LIMIT 1',
          [id],
        );
        const created = createdResult.rows[0];
        if (!created) throw new Error('Failed to create dispute');

        return { created: true, dispute: created };
      });

      if (result.created) {
        try {
          const orderResult = await query<{ buyer_id?: string; seller_id?: string }>(
            'SELECT buyer_id, seller_id FROM orders WHERE id = $1 LIMIT 1',
            [resolvedOrderId],
          );
          const order = orderResult.rows[0];
          if (order?.buyer_id && order.seller_id) {
            await notifyOrderDisputed({
              orderId: resolvedOrderId,
              disputeId: String(result.dispute.id),
              buyerId: String(order.buyer_id),
              sellerId: String(order.seller_id),
              reason: String(result.dispute.reason ?? reason.trim()),
            });
          }
        } catch (emailError) {
          console.warn('Failed to send disputed-order notification:', emailError);
        }
      }

      return res.status(result.created ? 201 : 200).json({
        id: result.dispute.id,
        orderId: result.dispute.order_id,
        ticketId: result.dispute.ticket_id ?? null,
        openedBy: result.dispute.opened_by,
        reason: result.dispute.reason,
        status: result.dispute.status,
        createdAt: result.dispute.created_at,
        alreadyOpen: !result.created,
      });
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to open dispute'));
    }
  });

  router.get('/ticket/:ticketId', disputeLimiter, requireAuth, async (req, res) => {
    try {
      const ticket = await resolveTicketToOrder(String(req.params.ticketId ?? '').trim());
      if (!ticket) return res.status(404).json({ error: 'Event ticket not found' });

      const access = await assertOrderAccessAsync(req, ticket.orderId);
      if ('error' in access) return res.status(access.error.status).json(access.error.body);

      const result = await query<Record<string, unknown>>(
        `SELECT * FROM disputes
         WHERE ticket_id = $1
            OR (ticket_id IS NULL AND order_id = $2)
         ORDER BY CASE WHEN ticket_id = $1 THEN 0 ELSE 1 END, created_at DESC
         LIMIT 1`,
        [ticket.ticketId, ticket.orderId],
      );

      const dispute = result.rows[0];
      if (!dispute) return res.status(404).json({ error: 'No dispute found for this ticket' });
      return res.status(200).json(dispute);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch dispute for ticket'));
    }
  });

  router.get('/:orderId', disputeLimiter, requireAuth, async (req, res) => {
    try {
      const access = await assertOrderAccessAsync(req, req.params.orderId);
      if ('error' in access) return res.status(access.error.status).json(access.error.body);

      const result = await query<Record<string, unknown>>(
        'SELECT * FROM disputes WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
        [req.params.orderId],
      );

      const dispute = result.rows[0];
      if (!dispute) return res.status(404).json({ error: 'No dispute found for this order' });
      return res.status(200).json(dispute);
    } catch (error) {
      return res.status(500).json(jsonError(error, 'Failed to fetch dispute'));
    }
  });

  router.patch('/:id', disputeLimiter, requireAuth, async (req, res) => {
    try {
      if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin access required' });

      const { status, resolutionNote } = req.body as { status?: string; resolutionNote?: string };
      if (!status || !['resolved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'status must be "resolved" or "rejected"' });
      }

      const existingResult = await query<{ status?: string }>(
        'SELECT status FROM disputes WHERE id = $1',
        [req.params.id],
      );
      const existing = existingResult.rows[0];
      if (!existing) return res.status(404).json({ error: 'Dispute not found' });

      assertAllowedDisputeTransition(existing.status as DisputeStatus, status as DisputeStatus);

      const now = new Date().toISOString();
      await query(
        `UPDATE disputes
         SET status = $1, resolved_by = $2, resolution_note = $3, updated_at = $4
         WHERE id = $5`,
        [status, req.user.uid, resolutionNote ?? null, now, req.params.id],
      );

      const updatedResult = await query<Record<string, unknown>>(
        'SELECT * FROM disputes WHERE id = $1',
        [req.params.id],
      );

      return res.status(200).json(updatedResult.rows[0]);
    } catch (error) {
      return res.status(400).json(jsonError(error, 'Failed to resolve dispute'));
    }
  });

  return router;
}

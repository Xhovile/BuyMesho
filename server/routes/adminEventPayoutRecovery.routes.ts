import express, { type RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { query, withTransaction } from "../postgres.js";
import { payoutService } from "../modules/payouts/payout.service.js";
import { recordEventRefundRecovery, listEventRefundLiabilities } from "../modules/events/eventRefundLiability.js";
import { notifyDisputeWorkflowEvent } from "../modules/notifications/dispute-workflow.notification.js";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function requireAdmin(req: any): void {
  if (req.user?.is_admin !== true) throw new Error("Admin access required");
}

async function getEventPayout(payoutId: string) {
  const result = await query<Record<string, unknown>>(
    `SELECT p.*,
            e.event_title,
            e.event_date,
            e.creator_uid AS event_creator_uid_actual,
            ec.display_name AS event_creator_name,
            ec.organization_name AS event_organization_name
       FROM payouts p
       INNER JOIN events e ON e.id = p.event_id
       LEFT JOIN event_creators ec ON ec.uid = e.creator_uid
      WHERE p.id = $1
        AND (p.owner_type = 'event_creator' OR p.event_id IS NOT NULL)
      LIMIT 1`,
    [payoutId],
  );
  return result.rows[0] ?? null;
}

async function listEventPayments(search = "") {
  const normalized = clean(search).toLowerCase();
  const params: string[] = [];
  const conditions = ["et.id IS NOT NULL"];
  if (normalized) {
    params.push(`%${normalized}%`);
    const placeholder = `$${params.length}`;
    conditions.push(`(
      LOWER(CAST(p.id AS TEXT)) LIKE ${placeholder} OR
      LOWER(COALESCE(p.order_id, '')) LIKE ${placeholder} OR
      LOWER(COALESCE(p.reference, '')) LIKE ${placeholder} OR
      LOWER(COALESCE(p.provider_reference, '')) LIKE ${placeholder} OR
      LOWER(COALESCE(p.provider, '')) LIKE ${placeholder} OR
      LOWER(COALESCE(p.method, '')) LIKE ${placeholder} OR
      LOWER(COALESCE(p.status, '')) LIKE ${placeholder} OR
      LOWER(COALESCE(o.buyer_id, '')) LIKE ${placeholder} OR
      LOWER(COALESCE(e.creator_uid, '')) LIKE ${placeholder} OR
      LOWER(COALESCE(ec.uid, '')) LIKE ${placeholder} OR
      LOWER(COALESCE(ec.email, '')) LIKE ${placeholder} OR
      LOWER(COALESCE(e.event_title, '')) LIKE ${placeholder} OR
      LOWER(CAST(e.id AS TEXT)) LIKE ${placeholder} OR
      LOWER(COALESCE(et.holder_email, '')) LIKE ${placeholder} OR
      LOWER(COALESCE(et.holder_name, '')) LIKE ${placeholder} OR
      LOWER(COALESCE(et.id, '')) LIKE ${placeholder} OR
      LOWER(COALESCE(et.code, '')) LIKE ${placeholder}
    )`);
  }

  const result = await query<Record<string, unknown>>(
    `SELECT
        p.id,
        p.order_id,
        p.provider,
        p.method,
        p.status AS payment_status,
        p.reference,
        p.provider_reference,
        p.currency,
        p.amount,
        p.checkout_url,
        p.paid_at,
        p.verified,
        p.verification,
        p.raw_response,
        p.created_at,
        p.updated_at,
        o.buyer_id,
        o.status AS order_status,
        e.id AS event_id,
        e.event_title,
        e.event_date,
        e.creator_uid AS event_creator_uid,
        ec.email AS event_creator_email,
        ec.display_name AS event_creator_name,
        COALESCE(
          ARRAY_AGG(DISTINCT et.id ORDER BY et.id) FILTER (WHERE et.id IS NOT NULL),
          ARRAY[]::text[]
        ) AS ticket_ids,
        COALESCE(
          ARRAY_AGG(DISTINCT et.code ORDER BY et.code) FILTER (WHERE et.code IS NOT NULL AND et.code <> ''),
          ARRAY[]::text[]
        ) AS ticket_codes,
        COALESCE(
          ARRAY_AGG(DISTINCT NULLIF(LOWER(et.holder_email), '') ORDER BY NULLIF(LOWER(et.holder_email), '')) FILTER (WHERE NULLIF(LOWER(et.holder_email), '') IS NOT NULL),
          ARRAY[]::text[]
        ) AS buyer_emails
       FROM payments p
       INNER JOIN orders o ON o.id = p.order_id
       INNER JOIN event_tickets et ON et.order_id = o.id
       INNER JOIN events e ON e.id = et.event_id
       LEFT JOIN event_creators ec ON ec.uid = e.creator_uid
      WHERE ${conditions.join(" AND ")}
      GROUP BY p.id, o.buyer_id, o.status, e.id, e.event_title, e.event_date, e.creator_uid, ec.email, ec.display_name
      ORDER BY p.created_at DESC
      LIMIT 200`,
    params,
  );

  return result.rows;
}

async function getEventPaymentDiagnostics(paymentId: string) {
  const paymentResult = await query<Record<string, unknown>>(
    "SELECT * FROM payments WHERE id = $1 LIMIT 1",
    [paymentId],
  );
  const payment = paymentResult.rows[0];
  if (!payment) return null;

  const [orderResult, ticketResult, eventResult, creatorResult, payoutResult] = await Promise.all([
    query<Record<string, unknown>>("SELECT * FROM orders WHERE id = $1 LIMIT 1", [payment.order_id]),
    query<Record<string, unknown>>(
      `SELECT et.*
         FROM event_tickets et
        WHERE et.order_id = $1
        ORDER BY et.id ASC`,
      [payment.order_id],
    ),
    query<Record<string, unknown>>(
      `SELECT DISTINCT e.*
         FROM event_tickets et
         INNER JOIN events e ON e.id = et.event_id
        WHERE et.order_id = $1
        ORDER BY e.id ASC
        LIMIT 1`,
      [payment.order_id],
    ),
    query<Record<string, unknown>>(
      `SELECT DISTINCT ec.*
         FROM event_tickets et
         INNER JOIN events e ON e.id = et.event_id
         LEFT JOIN event_creators ec ON ec.uid = e.creator_uid
        WHERE et.order_id = $1
        LIMIT 1`,
      [payment.order_id],
    ),
    query<Record<string, unknown>>(
      `SELECT *
         FROM payouts
        WHERE order_id = $1
          AND (owner_type = 'event_creator' OR event_id IS NOT NULL)
        ORDER BY created_at DESC`,
      [payment.order_id],
    ),
  ]);

  const paymentReferences = [...new Set(
    [payment.reference, payment.provider_reference]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean),
  )];

  const webhookEvents = paymentReferences.length
    ? (await query<Record<string, unknown>>(
        `SELECT *
           FROM payment_webhook_events
          WHERE reference IN (${paymentReferences.map((_, index) => `$${index + 1}`).join(", ")})
             OR tx_ref IN (${paymentReferences.map((_, index) => `$${paymentReferences.length + index + 1}`).join(", ")})
          ORDER BY created_at DESC`,
        [...paymentReferences, ...paymentReferences],
      )).rows
    : [];

  const payoutIds = payoutResult.rows
    .map((row) => String(row.id ?? "").trim())
    .filter(Boolean);

  const [attemptsResult, payoutEventsResult, liabilitiesResult] = payoutIds.length
    ? await Promise.all([
        query<Record<string, unknown>>(
          `SELECT *
             FROM payout_attempts
            WHERE payout_id IN (${payoutIds.map((_, index) => `$${index + 1}`).join(", ")})
            ORDER BY payout_id, attempt_no ASC`,
          payoutIds,
        ),
        query<Record<string, unknown>>(
          `SELECT *
             FROM payout_events
            WHERE payout_id IN (${payoutIds.map((_, index) => `$${index + 1}`).join(", ")})
            ORDER BY payout_id, created_at ASC`,
          payoutIds,
        ),
        query<Record<string, unknown>>(
          `SELECT *
             FROM event_refund_liabilities
            WHERE payout_id IN (${payoutIds.map((_, index) => `$${index + 1}`).join(", ")})
            ORDER BY created_at ASC`,
          payoutIds,
        ),
      ])
    : [{ rows: [] as Record<string, unknown>[] }, { rows: [] as Record<string, unknown>[] }, { rows: [] as Record<string, unknown>[] }];

  return {
    payment,
    order: orderResult.rows[0] ?? null,
    event: eventResult.rows[0] ?? null,
    eventCreator: creatorResult.rows[0] ?? null,
    tickets: ticketResult.rows,
    webhooks: webhookEvents,
    payouts: payoutResult.rows,
    payoutAttempts: attemptsResult.rows,
    payoutEvents: payoutEventsResult.rows,
    refundLiabilities: liabilitiesResult.rows,
  };
}

function responseError(res: express.Response, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = /Admin access required/i.test(message)
    ? 403
    : /not found/i.test(message)
      ? 404
      : 409;
  return res.status(status).json({ error: message });
}

export function createAdminEventPayoutRecoveryRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get("/transactions", requireAuth, async (req: any, res) => {
    try {
      requireAdmin(req);
      const search = clean(req.query?.q);
      const transactions = await listEventPayments(search);
      return res.json({ transactions });
    } catch (error) {
      return responseError(res, error, "Failed to load event payment transactions");
    }
  });

  router.get("/transactions/:paymentId", requireAuth, async (req: any, res) => {
    try {
      requireAdmin(req);
      const paymentId = clean(req.params.paymentId);
      const rawData = await getEventPaymentDiagnostics(paymentId);
      if (!rawData) return res.status(404).json({ error: "Event payment not found" });

      const hasEventTicket = rawData.tickets.some((ticket) => ticket.event_id != null);
      if (!hasEventTicket) return res.status(404).json({ error: "Event payment not found" });

      return res.json({ rawData });
    } catch (error) {
      return responseError(res, error, "Failed to load event payment");
    }
  });

  router.get("/", requireAuth, async (req: any, res) => {
    try {
      requireAdmin(req);
      const status = clean(req.query?.status).toLowerCase();
      const search = clean(req.query?.q).toLowerCase();
      const params: string[] = [];
      const filters = ["(p.owner_type = 'event_creator' OR p.event_id IS NOT NULL)"];

      if (search) {
        params.push(`%${search}%`);
        const placeholder = `$${params.length}`;
        filters.push(`(
          LOWER(CAST(p.id AS TEXT)) LIKE ${placeholder} OR
          LOWER(COALESCE(p.order_id, '')) LIKE ${placeholder} OR
          LOWER(CAST(p.event_id AS TEXT)) LIKE ${placeholder} OR
          LOWER(COALESCE(e.event_title, '')) LIKE ${placeholder} OR
          LOWER(COALESCE(e.creator_uid, '')) LIKE ${placeholder} OR
          LOWER(COALESCE(ec.uid, '')) LIKE ${placeholder} OR
          LOWER(COALESCE(ec.email, '')) LIKE ${placeholder} OR
          LOWER(COALESCE(o.buyer_id, '')) LIKE ${placeholder} OR
          EXISTS (
            SELECT 1
              FROM event_tickets et_search
             WHERE et_search.order_id = p.order_id
               AND (
                 LOWER(COALESCE(et_search.id, '')) LIKE ${placeholder} OR
                 LOWER(COALESCE(et_search.code, '')) LIKE ${placeholder} OR
                 LOWER(COALESCE(et_search.holder_email, '')) LIKE ${placeholder} OR
                 LOWER(COALESCE(et_search.holder_name, '')) LIKE ${placeholder}
               )
          )
        )`);
      }

      if (["eligible", "pending_settlement", "ready_for_payout", "queued", "processing", "pending", "held", "paid", "failed", "cancelled"].includes(status)) {
        params.push(status);
        filters.push(`p.status = $${params.length}`);
      }

      const result = await query<Record<string, unknown>>(
        `SELECT p.id, p.event_id, p.event_creator_uid, p.order_id, p.destination_account_id,
                p.amount, p.gross_amount, p.platform_fee_amount, p.processing_fee_amount,
                p.reserve_amount, p.payout_fee_amount, p.net_amount, p.currency, p.status,
                p.provider, p.provider_status, p.failure_reason, p.manual_review_reason,
                p.provider_charge_id, p.provider_ref_id, p.provider_transaction_id,
                p.requested_by, p.requested_at, p.created_at, p.updated_at,
                e.event_title, e.event_date, e.creator_uid AS event_creator_uid_actual,
                ec.display_name AS event_creator_name, ec.organization_name AS event_organization_name,
                l.id AS liability_id, l.amount AS liability_amount, l.currency AS liability_currency,
                l.status AS liability_status, l.refund_request_id AS liability_refund_request_id,
                l.ticket_id AS liability_ticket_id, l.due_at AS liability_due_at
           FROM payouts p
           INNER JOIN events e ON e.id = p.event_id
           LEFT JOIN event_creators ec ON ec.uid = e.creator_uid
           LEFT JOIN orders o ON o.id = p.order_id
           LEFT JOIN LATERAL (
             SELECT *
               FROM event_refund_liabilities
              WHERE payout_id = p.id
              ORDER BY created_at DESC
              LIMIT 1
           ) l ON TRUE
          WHERE ${filters.join(" AND ")}
          ORDER BY p.created_at DESC`,
        params,
      );

      let liabilities;
      if (search) {
        const liabilityResult = await query<Record<string, unknown>>(
          `SELECT l.*
             FROM event_refund_liabilities l
             LEFT JOIN events e ON e.id = l.event_id
             LEFT JOIN event_creators ec ON ec.uid = l.event_creator_uid
             LEFT JOIN orders o ON o.id = l.order_id
            WHERE
              LOWER(CAST(l.id AS TEXT)) LIKE $1 OR
              LOWER(CAST(l.event_id AS TEXT)) LIKE $1 OR
              LOWER(COALESCE(l.event_creator_uid, '')) LIKE $1 OR
              LOWER(COALESCE(l.order_id, '')) LIKE $1 OR
              LOWER(COALESCE(l.ticket_id, '')) LIKE $1 OR
              LOWER(COALESCE(e.event_title, '')) LIKE $1 OR
              LOWER(COALESCE(ec.email, '')) LIKE $1 OR
              LOWER(COALESCE(o.buyer_id, '')) LIKE $1 OR
              EXISTS (
                SELECT 1
                  FROM event_tickets et_search
                 WHERE et_search.order_id = l.order_id
                   AND (
                     LOWER(COALESCE(et_search.id, '')) LIKE $1 OR
                     LOWER(COALESCE(et_search.code, '')) LIKE $1 OR
                     LOWER(COALESCE(et_search.holder_email, '')) LIKE $1 OR
                     LOWER(COALESCE(et_search.holder_name, '')) LIKE $1
                   )
              )
            ORDER BY l.created_at DESC`,
          [`%${search}%`],
        );
        liabilities = liabilityResult.rows;
      } else {
        liabilities = await listEventRefundLiabilities({ query } as any, status && ["due", "recovered", "waived"].includes(status)
          ? { status: status as "due" | "recovered" | "waived" }
          : {});
      }
      const eventPayments = await listEventPayments(search);\n      return res.json({ payouts: result.rows, refundLiabilities: liabilities, eventPayments });
    } catch (error) {
      return responseError(res, error, "Failed to load event payout recovery data");
    }
  });

  router.get("/refund-liabilities", requireAuth, async (req: any, res) => {
    try {
      requireAdmin(req);
      const status = clean(req.query?.status).toLowerCase();
      const eventId = clean(req.query?.eventId);
      if (status && !["due", "recovered", "waived"].includes(status)) {
        return res.status(400).json({ error: "Unsupported liability status" });
      }
      const liabilities = await listEventRefundLiabilities(
        { query } as any,
        {
          status: status ? status as "due" | "recovered" | "waived" : undefined,
          eventId: eventId || null,
        },
      );
      return res.json({ liabilities });
    } catch (error) {
      return responseError(res, error, "Failed to load event refund liabilities");
    }
  });

  router.get("/:payoutId", requireAuth, async (req: any, res) => {
    try {
      requireAdmin(req);
      const payoutId = clean(req.params.payoutId);
      const payout = await getEventPayout(payoutId);
      if (!payout) return res.status(404).json({ error: "Event payout not found" });

      const [attempts, liabilities, events, orderResult, eventResult, creatorResult, ticketResult, paymentResult] = await Promise.all([
        query<Record<string, unknown>>(
          "SELECT * FROM payout_attempts WHERE payout_id = $1 ORDER BY attempt_no ASC",
          [payoutId],
        ),
        query<Record<string, unknown>>(
          "SELECT * FROM event_refund_liabilities WHERE payout_id = $1 ORDER BY created_at ASC",
          [payoutId],
        ),
        query<Record<string, unknown>>(
          "SELECT * FROM payout_events WHERE payout_id = $1 ORDER BY created_at ASC",
          [payoutId],
        ),
        query<Record<string, unknown>>(
          "SELECT * FROM orders WHERE id = $1 LIMIT 1",
          [payout.order_id],
        ),
        query<Record<string, unknown>>(
          "SELECT * FROM events WHERE id = $1 LIMIT 1",
          [payout.event_id],
        ),
        query<Record<string, unknown>>(
          "SELECT * FROM event_creators WHERE uid = $1 LIMIT 1",
          [payout.event_creator_uid_actual ?? payout.event_creator_uid],
        ),
        query<Record<string, unknown>>(
          "SELECT * FROM event_tickets WHERE order_id = $1 AND event_id = $2 ORDER BY id ASC",
          [payout.order_id, payout.event_id],
        ),
        query<Record<string, unknown>>(
          "SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC",
          [payout.order_id],
        ),
      ]);

      const paymentReferences = [...new Set(
        paymentResult.rows
          .flatMap((row) => [row.reference, row.provider_reference])
          .map((value) => String(value ?? "").trim())
          .filter(Boolean),
      )];

      const webhookEvents = paymentReferences.length
        ? (await query<Record<string, unknown>>(
            `SELECT *
               FROM payment_webhook_events
              WHERE reference IN (${paymentReferences.map((_, index) => `$${index + 1}`).join(", ")})
                 OR tx_ref IN (${paymentReferences.map((_, index) => `$${paymentReferences.length + index + 1}`).join(", ")})
              ORDER BY created_at DESC`,
            [...paymentReferences, ...paymentReferences],
          )).rows
        : [];

      const buyerUid = String(orderResult.rows[0]?.buyer_id ?? "").trim();
      const buyerEmails = [...new Set(
        ticketResult.rows
          .map((row) => String(row.holder_email ?? "").trim().toLowerCase())
          .filter(Boolean),
      )];

      const rawData = {
        payout,
        event: eventResult.rows[0] ?? null,
        eventCreator: creatorResult.rows[0] ?? null,
        order: orderResult.rows[0] ?? null,
        buyer: {
          uid: buyerUid || null,
          emails: buyerEmails,
        },
        tickets: ticketResult.rows,
        payments: paymentResult.rows,
        paymentWebhookEvents: webhookEvents,
        payoutAttempts: attempts.rows,
        payoutEvents: events.rows,
        refundLiabilities: liabilities.rows,
      };

      return res.json({
        payout,
        attempts: attempts.rows,
        refundLiabilities: liabilities.rows,
        payoutEvents: events.rows,
        rawData,
      });
    } catch (error) {
      return responseError(res, error, "Failed to load event payout");
    }
  });

  router.post("/:payoutId/retry", requireAuth, async (req: any, res) => {
    try {
      requireAdmin(req);
      const payoutId = clean(req.params.payoutId);
      const payout = await getEventPayout(payoutId);
      if (!payout) return res.status(404).json({ error: "Event payout not found" });

      const payoutStatus = String(payout.status ?? "").toLowerCase();
      if (payoutStatus === "paid") return res.status(409).json({ error: "Paid event payouts cannot be retried." });
      if (payoutStatus === "cancelled") return res.status(409).json({ error: "Cancelled event payouts cannot be retried." });
      if (payoutStatus === "processing" || payoutStatus === "pending") {
        return res.status(409).json({ error: "Event payout is already in provider processing. Reconcile its provider status before retrying." });
      }

      const liability = await query<Record<string, unknown>>(
        `SELECT id, status
           FROM event_refund_liabilities
          WHERE payout_id = $1
            AND status = 'due'
          LIMIT 1`,
        [payoutId],
      );
      if (liability.rows[0]) {
        return res.status(409).json({ error: "This event payout has an outstanding refund liability and cannot be retried." });
      }

      const result = await payoutService.executePayout({
        payoutId,
        actorType: "admin",
        actorId: req.user.uid,
      });
      return res.json({ ...result, eventPayout: await getEventPayout(payoutId) });
    } catch (error) {
      return responseError(res, error, "Failed to retry event payout");
    }
  });

  router.post("/:payoutId/reconcile", requireAuth, async (req: any, res) => {
    try {
      requireAdmin(req);
      const payoutId = clean(req.params.payoutId);
      const payout = await getEventPayout(payoutId);
      if (!payout) return res.status(404).json({ error: "Event payout not found" });
      const result = await payoutService.reconcilePayoutStatus({
        payoutId,
        actorType: "admin",
        actorId: req.user.uid,
      });
      return res.json({ ...result, eventPayout: await getEventPayout(payoutId) });
    } catch (error) {
      return responseError(res, error, "Failed to reconcile event payout");
    }
  });

  router.post("/:payoutId/hold", requireAuth, async (req: any, res) => {
    try {
      requireAdmin(req);
      const payoutId = clean(req.params.payoutId);
      const reason = clean(req.body?.reason);
      if (!reason) return res.status(400).json({ error: "reason is required" });

      const payout = await getEventPayout(payoutId);
      if (!payout) return res.status(404).json({ error: "Event payout not found" });
      if (String(payout.status).toLowerCase() === "paid") return res.status(409).json({ error: "Paid event payouts cannot be held." });

      const updated = payoutService.markHeld(payoutId, req.user.uid, reason);
      if (!updated) return res.status(404).json({ error: "Event payout not found" });

      return res.json({ payout: updated });
    } catch (error) {
      return responseError(res, error, "Failed to hold event payout");
    }
  });

  router.post("/:payoutId/cancel", requireAuth, async (req: any, res) => {
    try {
      requireAdmin(req);
      const payoutId = clean(req.params.payoutId);
      const reason = clean(req.body?.reason);
      if (!reason) return res.status(400).json({ error: "reason is required" });

      const payout = await getEventPayout(payoutId);
      if (!payout) return res.status(404).json({ error: "Event payout not found" });
      const payoutStatus = String(payout.status).toLowerCase();
      if (payoutStatus === "paid") return res.status(409).json({ error: "Paid event payouts cannot be cancelled." });
      if (payoutStatus === "processing" || payoutStatus === "pending") {
        return res.status(409).json({ error: "Provider processing must be reconciled before an event payout can be cancelled." });
      }

      const updated = payoutService.applyAdminOverride({
        payoutId,
        action: "cancel",
        actorId: req.user.uid,
        reason,
      });
      if (!updated) return res.status(404).json({ error: "Event payout not found" });

      await query(
        `INSERT INTO audit_events
          (id,entity_type,entity_id,event_type,performed_by,timestamp,previous_state,new_state,metadata)
         VALUES ($1,'event_payout',$2,'admin_event_payout_cancelled',$3,$4,$5,'cancelled',$6)`,
        [
          `aud_${randomUUID()}`,
          payoutId,
          req.user.uid,
          new Date().toISOString(),
          payoutStatus,
          JSON.stringify({ reason }),
        ],
      );

      return res.json({ payout: updated });
    } catch (error) {
      return responseError(res, error, "Failed to cancel event payout");
    }
  });

  router.post("/refund-liabilities/:liabilityId/recover", requireAuth, async (req: any, res) => {
    try {
      requireAdmin(req);
      const liabilityId = clean(req.params.liabilityId);
      const transactionId = clean(req.body?.transactionId);
      const refundMethod = clean(req.body?.refundMethod).toLowerCase();
      const refundDate = clean(req.body?.refundDate);
      const destination = clean(req.body?.destination);
      const note = clean(req.body?.note);
      const amount = Number(req.body?.amount);
      const evidence = Array.isArray(req.body?.evidence)
        ? req.body.evidence
            .filter((item: unknown): item is string => typeof item === "string")
            .map((item: string) => item.trim())
            .filter(Boolean)
            .slice(0, 20)
        : [];

      if (!transactionId) return res.status(400).json({ error: "transactionId is required" });
      if (!["mobile_money", "bank_transfer", "cash", "other"].includes(refundMethod)) {
        return res.status(400).json({ error: "Unsupported refundMethod" });
      }
      if (!refundDate) return res.status(400).json({ error: "refundDate is required" });
      if (!note) return res.status(400).json({ error: "note is required" });
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "amount must be positive" });

      const result = await withTransaction(async (client) => {
        return recordEventRefundRecovery(client, {
          liabilityId,
          actorId: String(req.user.uid),
          transactionId,
          amount,
          refundMethod,
          refundDate,
          destination: destination || null,
          note,
          evidence,
        });
      });

      if (!result.duplicate) {
        const liability = result.liability;
        const caseResult = await query<Record<string, unknown>>(
          `SELECT rr.dispute_case_id, rr.order_id, rr.buyer_id, rr.seller_id
             FROM refund_requests rr
            WHERE rr.id = $1
            LIMIT 1`,
          [liability.refundRequestId],
        );
        const caseRow = caseResult.rows[0];
        if (caseRow?.dispute_case_id) {
          try {
            await notifyDisputeWorkflowEvent({
              caseId: String(caseRow.dispute_case_id),
              orderId: String(caseRow.order_id),
              buyerId: String(caseRow.buyer_id),
              sellerId: String(caseRow.seller_id),
              event: "refund_completed",
              note,
              amount,
              currency: liability.currency,
              transactionId,
              refundMethod,
              refundDate,
              destination,
              recipients: ["buyer"],
            });
          } catch (notificationError) {
            console.warn("Failed to send event refund recovery notification:", notificationError);
          }
        }
      }

      return res.status(result.duplicate ? 200 : 201).json({
        ...result,
        message: result.duplicate
          ? "This event refund liability was already recovered."
          : "Event refund liability recovered and recorded.",
      });
    } catch (error) {
      return responseError(res, error, "Failed to recover event refund liability");
    }
  });

  return router;
}

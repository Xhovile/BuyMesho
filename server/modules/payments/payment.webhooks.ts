import type { Request, Response } from "express";
import { createHash } from "crypto";
import { paymentRepository } from "./payment.repository.js";
import { orderRepository } from "../orders/order.repository.js";
import { serverOrderService } from "../orders/order.service.js";
import { escrowRepository } from "../escrow/escrow.repository.js";
import { applyVerifiedPayChanguPayment } from "./paychangu.flow.js";
import { isAcceptedPaychanguEventType, isPaychanguSuccessStatus, paychanguProvider } from "./paychangu.provider.js";
import { getPaymentDb } from "../../postgresCompat.js";
import { insertPaymentWebhookEvent, recordPaymentWebhookDuplicateAttempt, updatePaymentWebhookEventStatus } from "../../postgresCompat/webhooks.js";

type PayChanguWebhookContext = { signature?: string; payload: string | Buffer | Record<string, unknown> };
type ParsedWebhookPayload = { rawPayload: string; parsedPayload: Record<string, unknown> | null };
type PaymentWebhookResponse =
  | { ok: true; status: "processed" | "ignored" | "duplicate"; reference?: string | null }
  | { ok: false; error: string };

function getHeaderValue(req: Request, headerNames: string[]): string | undefined {
  for (const name of headerNames) {
    const value = req.headers[name.toLowerCase()];
    if (Array.isArray(value)) {
      const first = value[0];
      if (typeof first === 'string' && first.trim()) return first.trim();
    } else if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function bodyToRawString(payload: unknown): string {
  if (typeof payload === 'string') return payload;
  if (Buffer.isBuffer(payload)) return payload.toString('utf8');
  if (payload && typeof payload === 'object') return JSON.stringify(payload);
  return '';
}

function parseRawWebhookPayload(payload: string | Buffer | Record<string, unknown>): ParsedWebhookPayload {
  const rawPayload = bodyToRawString(payload);
  if (!rawPayload) return { rawPayload: '', parsedPayload: null };
  try {
    const parsed = JSON.parse(rawPayload) as unknown;
    return { rawPayload, parsedPayload: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null };
  } catch {
    return { rawPayload, parsedPayload: null };
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function extractNestedObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return '';
}

function normalizeCurrency(value: string | undefined | null): string {
  return String(value ?? '').trim().toUpperCase();
}

function normalizeReference(value: string | undefined | null): string {
  return String(value ?? '').trim();
}

function stripPayChanguPrefix(value: string): string {
  return value.replace(/^PAYCHANGU-/i, '');
}

function uniqueReferences(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const references: string[] = [];
  for (const value of values) {
    const reference = normalizeReference(value);
    if (!reference || seen.has(reference)) continue;
    seen.add(reference);
    references.push(reference);
  }
  return references;
}

function resolveReferenceCandidates(txRef: string, parsedPayload: Record<string, unknown>): string[] {
  const nestedData = extractNestedObject(parsedPayload.data);
  const candidates = uniqueReferences([
    txRef,
    readString(parsedPayload.reference, nestedData?.tx_ref, nestedData?.reference),
  ]);
  return uniqueReferences([...candidates, ...candidates.map(stripPayChanguPrefix)]);
}

async function findPaymentByReferenceCandidates(candidates: string[]) {
  for (const candidate of candidates) {
    const payment = await paymentRepository.findByReferenceAsync(candidate);
    if (payment) return payment;
  }
  return undefined;
}

function readAmountAndCurrency(payload: Record<string, unknown> | null): { amount?: { amount: number; currency: string }; currency: string } {
  const directAmount = payload?.amount;
  const nestedData = extractNestedObject(payload?.data);
  const nestedTransaction = extractNestedObject(nestedData?.transaction);
  const amountCandidate = (typeof directAmount === 'number' ? directAmount : Number(directAmount)) || Number(nestedTransaction?.amount ?? nestedData?.amount ?? payload?.amount ?? NaN);
  const currency = readString(nestedTransaction?.currency, nestedData?.currency, payload?.currency);
  return Number.isFinite(amountCandidate) && amountCandidate > 0 ? { amount: { amount: Math.round(amountCandidate), currency }, currency } : { currency };
}

function findExactWebhookDuplicate(providerEventId: string | null, reference: string | null, eventType: string | null, payloadHash: string): { id: number } | null {
  const db = getPaymentDb();
  if (providerEventId) {
    const row = db.prepare(`SELECT id FROM payment_webhook_events WHERE provider='paychangu' AND provider_event_id=? LIMIT 1`).get(providerEventId) as { id?: number } | undefined;
    if (row?.id) return { id: Number(row.id) };
  }
  if (reference && eventType) {
    const row = db.prepare(`SELECT id FROM payment_webhook_events WHERE provider='paychangu' AND reference=? AND event_type=? AND payload_hash=? LIMIT 1`).get(reference, eventType, payloadHash) as { id?: number } | undefined;
    if (row?.id) return { id: Number(row.id) };
  }
  return null;
}

async function handlePayChanguWebhookInternal(context: PayChanguWebhookContext): Promise<PaymentWebhookResponse> {
  const { rawPayload, parsedPayload } = parseRawWebhookPayload(context.payload);
  const payloadHash = sha256(rawPayload);
  const now = new Date().toISOString();

  if (!parsedPayload) {
    const audit = insertPaymentWebhookEvent({ provider: 'paychangu', providerEventId: null, reference: null, txRef: null, eventType: null, payloadHash, processingStatus: 'failed', signatureValid: false, payload: rawPayload, error: 'Malformed webhook payload: invalid JSON', createdAt: now });
    if (audit.inserted) updatePaymentWebhookEventStatus(audit.id, 'failed', { processedAt: now, error: 'Malformed webhook payload: invalid JSON', signatureValid: false });
    return { ok: false, error: 'Malformed webhook payload: invalid JSON' };
  }

  const eventType = readString(parsedPayload.event_type, parsedPayload.event);
  const eventId = readString(parsedPayload.event_id, parsedPayload.eventId);
  const txRef = readString(parsedPayload.tx_ref, parsedPayload.reference, extractNestedObject(parsedPayload.data)?.tx_ref, extractNestedObject(parsedPayload.data)?.reference);
  const referenceCandidates = resolveReferenceCandidates(txRef, parsedPayload);
  const verified = await paychanguProvider.verifyWebhook(context.signature, rawPayload, { paychanguWebhookSecret: process.env.PAYCHANGU_WEBHOOK_SECRET });

  if (!verified.valid) {
    const audit = insertPaymentWebhookEvent({ provider: 'paychangu', providerEventId: eventId || null, reference: txRef || null, txRef: txRef || null, eventType: eventType || null, payloadHash, processingStatus: 'rejected', signatureValid: false, payload: rawPayload, error: 'Invalid PayChangu webhook signature', createdAt: now });
    if (audit.inserted === false) recordPaymentWebhookDuplicateAttempt({ provider: 'paychangu', providerEventId: eventId || null, reference: txRef || null, txRef: txRef || null, eventType: eventType || null, payloadHash }, audit.existingId);
    return { ok: false, error: 'Invalid PayChangu webhook signature' };
  }

  const duplicate = findExactWebhookDuplicate(eventId || null, txRef || null, eventType || null, payloadHash);
  if (duplicate) {
    recordPaymentWebhookDuplicateAttempt({ provider: 'paychangu', providerEventId: eventId || null, reference: txRef || null, txRef: txRef || null, eventType: eventType || null, payloadHash }, duplicate.id);
    return { ok: true, status: 'duplicate', reference: txRef || null };
  }

  const inserted = insertPaymentWebhookEvent({ provider: 'paychangu', providerEventId: eventId || null, reference: txRef || null, txRef: txRef || null, eventType: eventType || null, payloadHash, processingStatus: 'received', signatureValid: true, payload: rawPayload, createdAt: now });
  if (inserted.inserted === false) {
    recordPaymentWebhookDuplicateAttempt({ provider: 'paychangu', providerEventId: eventId || null, reference: txRef || null, txRef: txRef || null, eventType: eventType || null, payloadHash }, inserted.existingId);
    return { ok: true, status: 'duplicate', reference: txRef || null };
  }

  if (!eventType || !txRef || !isAcceptedPaychanguEventType(eventType)) {
    updatePaymentWebhookEventStatus(inserted.id, 'ignored', { processedAt: now, error: !eventType ? 'Missing PayChangu webhook event type' : `Unhandled PayChangu webhook event type: ${eventType}`, signatureValid: true });
    return { ok: true, status: 'ignored', reference: txRef || null };
  }

  const status = readString(extractNestedObject(parsedPayload.data)?.status, extractNestedObject(extractNestedObject(parsedPayload.data)?.transaction)?.status, parsedPayload.status) || 'unknown';
  const payment = await findPaymentByReferenceCandidates(referenceCandidates);
  if (!payment) {
    updatePaymentWebhookEventStatus(inserted.id, 'ignored', { processedAt: now, error: `No stored payment found for reference ${txRef}`, signatureValid: true });
    return { ok: true, status: 'ignored', reference: txRef };
  }
  const resolvedReference = payment.reference;

  const { amount, currency } = readAmountAndCurrency(parsedPayload);
  if (isPaychanguSuccessStatus(status)) {
    const order = await orderRepository.findByIdAsync(payment.orderId);
    const expectedCurrency = normalizeCurrency(order?.currency);
    const receivedCurrency = normalizeCurrency(amount?.currency ?? currency);
    const receivedAmount = amount?.amount;
    if (!order) {
      updatePaymentWebhookEventStatus(inserted.id, 'ignored', { processedAt: now, error: `Associated order not found for payment ${resolvedReference}`, signatureValid: true });
      return { ok: true, status: 'ignored', reference: txRef };
    }
    if (receivedAmount === undefined || receivedAmount !== order.total.amount || !receivedCurrency || receivedCurrency !== expectedCurrency) {
      updatePaymentWebhookEventStatus(inserted.id, 'ignored', { processedAt: now, error: `Payment amount or currency does not exactly match order total for ${order.id}`, signatureValid: true });
      return { ok: true, status: 'ignored', reference: txRef };
    }
    await applyVerifiedPayChanguPayment({ verified: true, provider: 'paychangu', txRef: resolvedReference, reference: txRef, status, currency: receivedCurrency, amount: { amount: receivedAmount, currency: receivedCurrency }, checkoutUrl: null, rawResponse: parsedPayload });
    updatePaymentWebhookEventStatus(inserted.id, 'processed', { processedAt: now, signatureValid: true });
    return { ok: true, status: 'processed', reference: txRef };
  }

  const lowered = status.toLowerCase();
  if (['reversed', 'refunded', 'chargeback', 'charged_back'].includes(lowered)) {
    try {
      await paymentRepository.updateByReferenceAsync(resolvedReference, current => ({ ...current, status: 'refunded', verified: false, verification: { verified: false, provider: 'paychangu', txRef: resolvedReference, reference: txRef, status, currency, amount, checkoutUrl: null, rawResponse: parsedPayload, failureReason: `PayChangu webhook reported ${status}` }, updatedAt: now }));
      await serverOrderService.setStatusAsync(payment.orderId, 'refunded');
      const escrow = await escrowRepository.findByOrderIdAsync(payment.orderId);
      if (escrow && (escrow.state === 'funded' || escrow.state === 'held') && escrow.balanceAmount > 0) {
        await escrowRepository.refundHeldBalanceAsync({ orderId: payment.orderId, refundedBy: 'paychangu_webhook', reference: resolvedReference, note: `PayChangu webhook reported ${status}` });
      }
      updatePaymentWebhookEventStatus(inserted.id, 'processed', { processedAt: now, signatureValid: true });
      return { ok: true, status: 'processed', reference: txRef };
    } catch (error) {
      updatePaymentWebhookEventStatus(inserted.id, 'failed', { processedAt: now, error: error instanceof Error ? error.message : String(error), signatureValid: true });
      throw error;
    }
  }

  const nextStatus = ['failed', 'cancelled', 'canceled', 'expired', 'declined'].includes(lowered) ? 'failed' : payment.status;
  await paymentRepository.updateByReferenceAsync(resolvedReference, current => ({ ...current, verified: false, verification: { verified: false, provider: 'paychangu', txRef: resolvedReference, reference: txRef, status, currency, amount, checkoutUrl: null, rawResponse: parsedPayload, failureReason: `PayChangu webhook reported ${status}` }, status: nextStatus, updatedAt: now }));
  updatePaymentWebhookEventStatus(inserted.id, 'processed', { processedAt: now, signatureValid: true });
  return { ok: true, status: 'processed', reference: txRef };
}

async function paymentWebhookRouteHandler(req: Request, res: Response) {
  try {
    const signature = getHeaderValue(req, ['x-paychangu-signature', 'signature']);
    const result = await handlePayChanguWebhookInternal({ signature, payload: req.body as Buffer | string | Record<string, unknown> });
    if (result.ok === false) return res.status(400).json({ error: result.error });
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return res.status(500).json({ error: message });
  }
}

function handlePaychanguWebhook(contextOrSignature: PayChanguWebhookContext | string | undefined, payload?: PayChanguWebhookContext['payload']): Promise<PaymentWebhookResponse> {
  return typeof contextOrSignature !== 'object' ? handlePayChanguWebhookInternal({ signature: contextOrSignature, payload: payload ?? '' }) : handlePayChanguWebhookInternal(contextOrSignature);
}

export const paymentWebhookHandler = Object.assign(paymentWebhookRouteHandler, { handlePaychanguWebhook });

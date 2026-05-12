import { createHash } from 'crypto';
import type { WebhookVerificationResult } from '../../../src/modules/payments/types.js';
import { serverPaymentService } from './payment.service.js';
import { applyVerifiedPayChanguPayment } from './paychangu.flow.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/order.repository.js';
import { isAcceptedPaychanguEventType, normalizePaychanguStatus } from './paychangu.provider.js';
import { getPaymentDb } from '../../sqlite.js';

function asRecord(payload: unknown): Record<string, unknown> { if (typeof payload === 'string') { try { const p = JSON.parse(payload) as unknown; return typeof p === 'object' && p !== null ? p as Record<string, unknown> : {}; } catch { return {}; } } return typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {}; }
const asOptionalRecord = (v: unknown): Record<string, unknown> | undefined => typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : undefined;
const asTrimmedString = (v: unknown): string | undefined => { const s = String(v ?? '').trim(); return s || undefined; };
const asAmount = (v: unknown): number | undefined => typeof v === 'number' && Number.isFinite(v) ? v : (typeof v === 'string' && Number.isFinite(Number(v.trim())) ? Number(v.trim()) : undefined);

function getPayChanguEventDetails(payload: unknown) {
  const raw = asRecord(payload);
  const data = asOptionalRecord(raw.data) ?? raw;
  return {
    eventType: asTrimmedString(raw.event_type ?? raw.event),
    status: asTrimmedString(data.status),
    providerEventId: asTrimmedString(raw.id ?? raw.event_id ?? data.id ?? data.event_id),
    txRef: asTrimmedString(data.tx_ref ?? data.txRef ?? data.reference ?? raw.tx_ref ?? raw.txRef ?? raw.reference),
    data,
  };
}

function upsertWebhookEvent(params: { signatureValid: boolean; eventType?: string; reference?: string; providerEventId?: string; txRef?: string; payload: string; payloadHash: string; }): { id: number; inserted: boolean; processingStatus: string } {
  const db = getPaymentDb();
  const createdAt = new Date().toISOString();
  if (params.providerEventId) {
    const ins = db.prepare(`INSERT OR IGNORE INTO payment_webhook_events (provider, provider_event_id, reference, tx_ref, event_type, payload_hash, signature_valid, payload, processing_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'received', ?)`)
      .run('paychangu', params.providerEventId, params.reference ?? null, params.txRef ?? null, params.eventType ?? null, params.payloadHash, params.signatureValid ? 1 : 0, params.payload, createdAt);
    const row = db.prepare('SELECT id, processing_status FROM payment_webhook_events WHERE provider = ? AND provider_event_id = ?').get('paychangu', params.providerEventId) as { id: number; processing_status: string };
    return { id: row.id, inserted: ins.changes > 0, processingStatus: row.processing_status };
  }
  const ins = db.prepare(`INSERT OR IGNORE INTO payment_webhook_events (provider, reference, tx_ref, event_type, payload_hash, signature_valid, payload, processing_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'received', ?)`)
    .run('paychangu', params.reference ?? null, params.txRef ?? null, params.eventType ?? null, params.payloadHash, params.signatureValid ? 1 : 0, params.payload, createdAt);
  const row = db.prepare('SELECT id, processing_status FROM payment_webhook_events WHERE provider = ? AND tx_ref IS ? AND event_type IS ? AND payload_hash = ? ORDER BY id DESC LIMIT 1').get('paychangu', params.txRef ?? null, params.eventType ?? null, params.payloadHash) as { id: number; processing_status: string };
  return { id: row.id, inserted: ins.changes > 0, processingStatus: row.processing_status };
}

export class PaymentWebhookHandler {
  async handlePaychanguWebhook(signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> {
    const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
    const details = getPayChanguEventDetails(rawPayload);
    const eventType = details.eventType?.toLowerCase();
    const payloadHash = createHash('sha256').update(rawPayload).digest('hex');
    const webhookEvent = upsertWebhookEvent({ signatureValid: false, eventType, reference: details.txRef, providerEventId: details.providerEventId, txRef: details.txRef, payload: rawPayload, payloadHash });
    if (!webhookEvent.inserted && webhookEvent.processingStatus === 'processed') {
      return { valid: true, provider: 'paychangu', signature, payload: asRecord(rawPayload), eventType, reference: details.txRef };
    }

    const result = await serverPaymentService.verifyWebhook('paychangu', signature, rawPayload);
    getPaymentDb().prepare('UPDATE payment_webhook_events SET signature_valid = ?, processing_status = ?, error = NULL WHERE id = ?').run(result.valid ? 1 : 0, result.valid ? 'processing' : 'failed', webhookEvent.id);
    if (!result.valid) throw new Error('Invalid PayChangu webhook signature');

    try {
      if (eventType && !isAcceptedPaychanguEventType(eventType)) return result;

      const txRef = details.txRef ?? result.reference ?? '';
      const state = normalizePaychanguStatus(details.status);
      const payment = txRef ? paymentRepository.findByReference(txRef) : undefined;

      if (txRef && payment && state !== 'unknown') {
        if (state === 'paid') {
          const order = orderRepository.findByPaymentReference(txRef) ?? orderRepository.findById(payment.orderId);
          if (!order) throw new Error(`No stored order found for PayChangu payment reference: ${txRef}`);
          const amount = asAmount(details.data?.amount);
          const currency = String(details.data?.currency ?? order.currency ?? 'MWK');
          applyVerifiedPayChanguPayment({ verified: true, provider: 'paychangu', txRef, reference: txRef, status: String(details.status ?? 'captured'), currency, amount: typeof amount === 'number' ? { amount, currency } : undefined, rawResponse: asRecord(rawPayload) });
        } else {
          paymentRepository.updateByReference(txRef, (current) => ({ ...current, status: state === 'pending' ? 'pending' : state === 'failed' ? 'failed' : 'refunded', verified: false, verification: { verified: false, provider: 'paychangu', txRef, reference: txRef, status: String(details.status ?? state), currency: current.amount.currency, amount: current.amount, rawResponse: asRecord(rawPayload) }, updatedAt: new Date().toISOString() }));
        }
      }

      getPaymentDb().prepare('UPDATE payment_webhook_events SET processing_status = ?, processed_at = ?, error = NULL WHERE id = ?').run('processed', new Date().toISOString(), webhookEvent.id);
      return result;
    } catch (error) {
      getPaymentDb().prepare('UPDATE payment_webhook_events SET processing_status = ?, error = ? WHERE id = ?').run('failed', error instanceof Error ? error.message : String(error), webhookEvent.id);
      throw error;
    }
  }

  verify(providerKey: Parameters<typeof serverPaymentService.verifyWebhook>[0], signature: string | undefined, payload: unknown): Promise<WebhookVerificationResult> { return serverPaymentService.verifyWebhook(providerKey, signature, payload as string); }
  parse(providerKey: Parameters<typeof serverPaymentService.parseWebhook>[0], payload: unknown): Promise<WebhookVerificationResult> { return serverPaymentService.parseWebhook(providerKey, payload); }
}
export const paymentWebhookHandler = new PaymentWebhookHandler();

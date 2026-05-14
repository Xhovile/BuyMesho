import { createHash } from "crypto";
import type { PaymentVerificationResult, WebhookVerificationResult } from "../../../src/modules/payments/types.js";
import { serverPaymentService } from "./payment.service.js";
import { applyVerifiedPayChanguPayment } from "./paychangu.flow.js";
import { paymentRepository } from "./payment.repository.js";
import { orderRepository } from "../orders/order.repository.js";
import { serverOrderService } from "../orders/order.service.js";
import { escrowRepository } from "../escrow/escrow.repository.js";
import {
  isAcceptedPaychanguEventType,
  normalizePaychanguPaymentStatus,
  type PayChanguPaymentStatus,
} from "./paychangu.provider.js";
import {
  insertPaymentWebhookEvent,
  recordPaymentWebhookDuplicateAttempt,
  updatePaymentWebhookEventStatus,
} from "../../sqlite.js";

type PlainRecord = Record<string, unknown>;

function asRecord(payload: unknown): PlainRecord {
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload) as unknown;
      return typeof parsed === "object" && parsed !== null
        ? (parsed as PlainRecord)
        : {};
    } catch {
      return {};
    }
  }

  return typeof payload === "object" && payload !== null
    ? (payload as PlainRecord)
    : {};
}

function asOptionalRecord(value: unknown): PlainRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as PlainRecord)
    : undefined;
}

function asTrimmedString(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text ? text : undefined;
}

function normalizeEventType(value: unknown): string | undefined {
  return asTrimmedString(value)?.toLowerCase();
}

function conciseErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 500 ? `${message.slice(0, 497)}...` : message;
}

function normalizeRawPayload(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (Buffer.isBuffer(payload)) {
    return payload.toString("utf8");
  }

  return "";
}

function getPayChanguEventDetails(payload: unknown): {
  eventType?: string;
  status?: string;
  txRef?: string;
  providerEventId?: string;
  data?: PlainRecord;
  raw: PlainRecord;
} {
  const raw = asRecord(payload);
  const data = asOptionalRecord(raw.data) ?? raw;

  return {
    eventType: asTrimmedString(
      raw.event_type ??
        raw.eventType ??
        raw.event ??
        raw.type ??
        raw.name ??
        data.event_type ??
        data.eventType ??
        data.event ??
        data.type ??
        data.name,
    ),
    status: asTrimmedString(data.status ?? raw.status),
    txRef: asTrimmedString(
      data.tx_ref ??
        data.txRef ??
        data.reference ??
        raw.tx_ref ??
        raw.txRef ??
        raw.reference,
    ),
    providerEventId: asTrimmedString(
      raw.event_id ??
        raw.eventId ??
        raw.provider_event_id ??
        raw.providerEventId ??
        raw.webhook_id ??
        raw.webhookId ??
        raw.notification_id ??
        raw.notificationId ??
        raw.id ??
        data.event_id ??
        data.eventId ??
        data.provider_event_id ??
        data.providerEventId ??
        data.webhook_id ??
        data.webhookId ??
        data.notification_id ??
        data.notificationId ??
        data.id,
    ),
    data,
    raw,
  };
}

function extractTxRef(payload: unknown, fallback?: string): string {
  const details = getPayChanguEventDetails(payload);
  return (details.txRef ?? fallback ?? "").trim();
}

function parseRawWebhookPayload(rawPayload: string): unknown {
  try {
    return JSON.parse(rawPayload) as unknown;
  } catch {
    throw new Error("Malformed webhook payload: invalid JSON");
  }
}

function hashPayload(rawPayload: string): string {
  return createHash("sha256").update(rawPayload).digest("hex");
}

function resolvePaychanguWebhookStatus(
  payloadStatus: string | undefined,
  verification?: PaymentVerificationResult,
): PayChanguPaymentStatus {
  const verifiedStatus = verification
    ? normalizePaychanguPaymentStatus(verification.status)
    : "unknown";

  if (verifiedStatus !== "unknown") {
    return verifiedStatus;
  }

  return normalizePaychanguPaymentStatus(payloadStatus);
}

function shouldVerifyPaychanguWebhook(status: PayChanguPaymentStatus): boolean {
  return status === "paid" || status === "unknown";
}

function isPaymentVerificationResult(
  value: PaymentVerificationResult | PlainRecord,
): value is PaymentVerificationResult {
  return "verified" in value && "provider" in value && "txRef" in value;
}

function mergePaymentRawResponse(
  verificationOrPayload: PaymentVerificationResult | PlainRecord,
): PlainRecord {
  if (isPaymentVerificationResult(verificationOrPayload)) {
    return verificationOrPayload.rawResponse ?? {};
  }

  return verificationOrPayload;
}

function markOrderPendingPaymentIfUnpaid(orderId: string): void {
  const order = orderRepository.findById(orderId);
  if (!order) return;

  if (order.status === "draft" || order.status === "pending_payment") {
    serverOrderService.setStatus(order.id, "pending_payment");
  }
}

function markPaymentPending(
  txRef: string,
  verificationOrPayload: PaymentVerificationResult | PlainRecord,
): void {
  paymentRepository.updateByReference(txRef, (current) => ({
    ...current,
    status: "pending",
    verified: false,
    verification: isPaymentVerificationResult(verificationOrPayload)
      ? verificationOrPayload
      : current.verification,
    rawResponse: mergePaymentRawResponse(verificationOrPayload),
    updatedAt: new Date().toISOString(),
  }));

  const payment = paymentRepository.findByReference(txRef);
  if (payment) {
    markOrderPendingPaymentIfUnpaid(payment.orderId);
  }
}

function markPaymentFailed(
  txRef: string,
  verificationOrPayload: PaymentVerificationResult | PlainRecord,
): void {
  paymentRepository.updateByReference(txRef, (current) => ({
    ...current,
    status: "failed",
    verified: false,
    verification: isPaymentVerificationResult(verificationOrPayload)
      ? verificationOrPayload
      : current.verification,
    rawResponse: mergePaymentRawResponse(verificationOrPayload),
    updatedAt: new Date().toISOString(),
  }));

  const payment = paymentRepository.findByReference(txRef);
  if (payment) {
    markOrderPendingPaymentIfUnpaid(payment.orderId);
  }
}

function markPaymentReversed(
  txRef: string,
  verificationOrPayload: PaymentVerificationResult | PlainRecord,
): void {
  const payment = paymentRepository.updateByReference(txRef, (current) => ({
    ...current,
    status: "refunded",
    verified: false,
    verification: isPaymentVerificationResult(verificationOrPayload)
      ? verificationOrPayload
      : current.verification,
    rawResponse: mergePaymentRawResponse(verificationOrPayload),
    updatedAt: new Date().toISOString(),
  }));

  if (!payment) return;

  const order =
    orderRepository.findByPaymentReference(txRef) ??
    orderRepository.findById(payment.orderId);

  if (!order) return;

  if (["paid", "in_escrow", "fulfilled", "disputed"].includes(order.status)) {
    serverOrderService.setStatus(order.id, "refunded");
  } else if (order.status === "draft" || order.status === "pending_payment") {
    serverOrderService.setStatus(order.id, "pending_payment");
  }

  const escrow = escrowRepository.findByOrderId(order.id);
  if (escrow && escrow.state !== "released" && escrow.state !== "closed") {
    escrowRepository.updateState(order.id, "refunded");
  }
}

export class PaymentWebhookHandler {
  async handlePaychanguWebhook(
    signature: string | undefined,
    payload: unknown,
  ): Promise<WebhookVerificationResult> {
    const rawPayload = normalizeRawPayload(payload);

    if (!rawPayload) {
      throw new Error("Missing raw webhook body");
    }

    const payloadHash = hashPayload(rawPayload);
    const createdAt = new Date().toISOString();
    let parsedPayload: unknown;
    let details: ReturnType<typeof getPayChanguEventDetails> | null = null;
    let eventType: string | undefined;
    let txRef: string | undefined;

    try {
      parsedPayload = parseRawWebhookPayload(rawPayload);
      details = getPayChanguEventDetails(parsedPayload);
      eventType = normalizeEventType(details.eventType);
      txRef = extractTxRef(parsedPayload);
    } catch {
      const malformedAuditEvent = {
        provider: "paychangu",
        providerEventId: null,
        reference: null,
        txRef: null,
        eventType: null,
        payloadHash,
        processingStatus: "received",
        signatureValid: false,
        payload: rawPayload,
        error: null,
        createdAt,
      };
      const malformedInsertResult = insertPaymentWebhookEvent(malformedAuditEvent);

      if ("inserted" in malformedInsertResult && malformedInsertResult.inserted) {
        updatePaymentWebhookEventStatus(malformedInsertResult.id, "failed", {
          processedAt: new Date().toISOString(),
          error: "Malformed webhook payload: invalid JSON",
          signatureValid: false,
        });
      }

      throw new Error("Malformed webhook payload: invalid JSON");
    }

    const auditEvent = {
      provider: "paychangu",
      providerEventId: details.providerEventId,
      reference: txRef || undefined,
      txRef: txRef || undefined,
      eventType,
      payloadHash,
      processingStatus: "received",
      signatureValid: false,
      payload: rawPayload,
      error: null,
      createdAt,
    };

    const insertResult = insertPaymentWebhookEvent(auditEvent);

    if ("duplicate" in insertResult) {
      recordPaymentWebhookDuplicateAttempt(auditEvent, insertResult.existingId);
      console.info("[webhook] ignoring duplicate PayChangu webhook event", {
        existingId: insertResult.existingId,
        providerEventId: details.providerEventId,
        txRef,
        eventType,
      });
      return {
        valid: true,
        provider: "paychangu",
        eventType,
        reference: txRef || undefined,
        signature,
        payload: parsedPayload,
      };
    }

    const eventId = insertResult.id;
    const result = await serverPaymentService.verifyWebhook(
      "paychangu",
      signature,
      rawPayload,
    );

    if (!result.valid) {
      updatePaymentWebhookEventStatus(eventId, "rejected", {
        processedAt: new Date().toISOString(),
        error: "Invalid PayChangu webhook signature",
        signatureValid: false,
      });
      throw new Error("Invalid PayChangu webhook signature");
    }

    const reference = txRef || result.reference || undefined;

    try {
      if (eventType && !isAcceptedPaychanguEventType(eventType)) {
        console.info(
          "[webhook] proceeding with PayChangu event that uses an unrecognized event type",
          {
            eventType,
            status: details.status ?? "unknown",
            reference: reference ?? "unknown",
          },
        );
      }

      if (!txRef) {
        throw new Error("Missing PayChangu tx_ref in webhook payload");
      }

      const payloadStatus = normalizePaychanguPaymentStatus(details.status);
      const verification = shouldVerifyPaychanguWebhook(payloadStatus)
        ? await serverPaymentService.verifyPaychanguPayment(txRef)
        : undefined;
      const normalizedStatus = resolvePaychanguWebhookStatus(
        details.status,
        verification,
      );

      if (normalizedStatus === "pending") {
        markPaymentPending(txRef, verification ?? asRecord(parsedPayload));
        updatePaymentWebhookEventStatus(eventId, "processed", {
          processedAt: new Date().toISOString(),
          signatureValid: true,
        });
        return result;
      }

      if (normalizedStatus === "failed") {
        markPaymentFailed(txRef, verification ?? asRecord(parsedPayload));
        updatePaymentWebhookEventStatus(eventId, "processed", {
          processedAt: new Date().toISOString(),
          signatureValid: true,
        });
        return result;
      }

      if (normalizedStatus === "reversed") {
        markPaymentReversed(txRef, verification ?? asRecord(parsedPayload));
        updatePaymentWebhookEventStatus(eventId, "processed", {
          processedAt: new Date().toISOString(),
          signatureValid: true,
        });
        return result;
      }

      if (normalizedStatus === "unknown") {
        updatePaymentWebhookEventStatus(eventId, "processed", {
          processedAt: new Date().toISOString(),
          error: verification?.status
            ? `Unrecognized PayChangu payment status: ${verification.status}`
            : details.status
              ? `Unrecognized PayChangu payment status: ${details.status}`
              : "Unrecognized PayChangu payment status",
          signatureValid: true,
        });
        return result;
      }

      if (!verification?.verified) {
        throw new Error(
          verification?.failureReason ??
            `PayChangu reported a paid status that could not be verified for ${txRef}`,
        );
      }

      const payment = paymentRepository.findByReference(txRef);
      if (!payment) {
        throw new Error(
          `No stored payment found for PayChangu reference: ${txRef}`,
        );
      }

      const order =
        orderRepository.findByPaymentReference(txRef) ??
        orderRepository.findById(payment.orderId);

      if (!order) {
        throw new Error(
          `No stored order found for PayChangu payment reference: ${txRef}`,
        );
      }

      if (order.paymentReference && order.paymentReference !== txRef) {
        throw new Error(
          `Webhook reference does not match the order payment reference for order ${order.id}`,
        );
      }

      applyVerifiedPayChanguPayment({
        ...verification,
        verified: true,
        provider: "paychangu",
        txRef,
        reference: txRef,
        status: verification.status ?? "captured",
        currency: verification.currency ?? order.currency ?? "MWK",
        amount: verification.amount ?? {
          amount: order.total.amount,
          currency: order.total.currency,
        },
        rawResponse: asRecord(parsedPayload),
      });

      updatePaymentWebhookEventStatus(eventId, "processed", {
        processedAt: new Date().toISOString(),
        signatureValid: true,
      });

      return result;
    } catch (error) {
      updatePaymentWebhookEventStatus(eventId, "failed", {
        processedAt: new Date().toISOString(),
        error: conciseErrorMessage(error),
        signatureValid: true,
      });
      throw error;
    }
  }

  verify(
    providerKey: Parameters<typeof serverPaymentService.verifyWebhook>[0],
    signature: string | undefined,
    payload: unknown,
  ): Promise<WebhookVerificationResult> {
    const rawPayload = normalizeRawPayload(payload);
    return serverPaymentService.verifyWebhook(
      providerKey,
      signature,
      rawPayload,
    );
  }

  parse(
    providerKey: Parameters<typeof serverPaymentService.parseWebhook>[0],
    payload: unknown,
  ): Promise<unknown> {
    return serverPaymentService.parseWebhook(providerKey, payload);
  }
}

export const paymentWebhookHandler = new PaymentWebhookHandler();

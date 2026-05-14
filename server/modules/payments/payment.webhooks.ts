import { createHash } from "crypto";
import type { WebhookVerificationResult } from "../../../src/modules/payments/types.js";
import { serverPaymentService } from "./payment.service.js";
import { applyVerifiedPayChanguPayment } from "./paychangu.flow.js";
import { paymentRepository } from "./payment.repository.js";
import { orderRepository } from "../orders/order.repository.js";
import { isAcceptedPaychanguEventType } from "./paychangu.provider.js";
import {
  insertPaymentWebhookEvent,
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
    eventType: asTrimmedString(raw.event_type ?? raw.event),
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
        raw.id ??
        data.event_id ??
        data.eventId ??
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

export class PaymentWebhookHandler {
  async handlePaychanguWebhook(
    signature: string | undefined,
    payload: unknown,
  ): Promise<WebhookVerificationResult> {
    const rawPayload = normalizeRawPayload(payload);

    if (!rawPayload) {
      throw new Error("Missing raw webhook body");
    }

    const result = await serverPaymentService.verifyWebhook(
      "paychangu",
      signature,
      rawPayload,
    );

    const parsedPayload = parseRawWebhookPayload(rawPayload);
    const details = getPayChanguEventDetails(parsedPayload);
    const eventType =
      details.eventType?.toLowerCase() ||
      result.eventType?.toLowerCase() ||
      undefined;
    const payloadHash = hashPayload(rawPayload);
    const reference = details.txRef ?? result.reference ?? undefined;
    const txRef = extractTxRef(parsedPayload, result.reference);

    const insertResult = insertPaymentWebhookEvent({
      provider: "paychangu",
      providerEventId: details.providerEventId,
      reference,
      txRef,
      eventType,
      payloadHash,
      processingStatus: result.valid ? "processing" : "signature_invalid",
      signatureValid: result.valid,
      payload: rawPayload,
      error: result.valid ? null : "Invalid PayChangu webhook signature",
      createdAt: new Date().toISOString(),
    });

    if (!result.valid) {
      if (insertResult.inserted) {
        updatePaymentWebhookEventStatus(insertResult.id, "signature_invalid", {
          processedAt: new Date().toISOString(),
          error: "Invalid PayChangu webhook signature",
        });
      }
      throw new Error("Invalid PayChangu webhook signature");
    }

    if ("duplicate" in insertResult) {
      console.info("[webhook] ignoring duplicate PayChangu webhook event", {
        existingId: insertResult.existingId,
        providerEventId: details.providerEventId,
        txRef,
        eventType,
      });
      return result;
    }

    const eventId = insertResult.id;

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

      const verification =
        await serverPaymentService.verifyPaychanguPayment(txRef);

      if (!verification.verified) {
        updatePaymentWebhookEventStatus(eventId, "ignored", {
          processedAt: new Date().toISOString(),
          error: verification.status
            ? `Payment verification status: ${verification.status}`
            : null,
        });
        return result;
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
      });

      return result;
    } catch (error) {
      updatePaymentWebhookEventStatus(eventId, "failed", {
        processedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
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

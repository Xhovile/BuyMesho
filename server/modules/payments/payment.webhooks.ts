import type { Request, Response } from "express";
import { createHash } from "crypto";
import { paymentRepository } from "./payment.repository.js";
import { applyVerifiedPayChanguPayment } from "./paychangu.flow.js";
import {
  isAcceptedPaychanguEventType,
  isPaychanguSuccessStatus,
  paychanguProvider,
} from "./paychangu.provider.js";
import {
  findPaymentWebhookDuplicate,
  insertPaymentWebhookEvent,
  recordPaymentWebhookDuplicateAttempt,
  updatePaymentWebhookEventStatus,
} from "../../postgresCompat/webhooks.js";

type PayChanguWebhookContext = {
  signature?: string | undefined;
  payload: string | Buffer | Record<string, unknown>;
};

type ParsedWebhookPayload = {
  rawPayload: string;
  parsedPayload: Record<string, unknown> | null;
};

type PaymentWebhookResponse =
  | { ok: true; status: "processed" | "ignored" | "duplicate"; reference?: string | null }
  | { ok: false; error: string };

function getHeaderValue(req: Request, headerNames: string[]): string | undefined {
  for (const name of headerNames) {
    const value = req.headers[name.toLowerCase()];
    if (Array.isArray(value)) {
      const first = value[0];
      if (typeof first === "string" && first.trim()) return first.trim();
    } else if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function bodyToRawString(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (Buffer.isBuffer(payload)) return payload.toString("utf8");
  if (payload && typeof payload === "object") return JSON.stringify(payload);
  return "";
}

function parseRawWebhookPayload(payload: string | Buffer | Record<string, unknown>): ParsedWebhookPayload {
  const rawPayload = bodyToRawString(payload);
  if (!rawPayload) {
    return { rawPayload: "", parsedPayload: null };
  }

  try {
    const parsed = JSON.parse(rawPayload) as unknown;
    return {
      rawPayload,
      parsedPayload: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null,
    };
  } catch {
    return { rawPayload, parsedPayload: null };
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function extractNestedObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return "";
}

function readAmountAndCurrency(payload: Record<string, unknown> | null): { amount?: { amount: number; currency: string }; currency: string } {
  const directAmount = payload?.amount;
  const nestedData = extractNestedObject(payload?.data);
  const nestedTransaction = extractNestedObject(nestedData?.transaction);

  const amountCandidate =
    (typeof directAmount === "number" ? directAmount : Number(directAmount)) ||
    Number(nestedTransaction?.amount ?? nestedData?.amount ?? payload?.amount ?? NaN);
  const currency = readString(
    nestedTransaction?.currency,
    nestedData?.currency,
    payload?.currency,
    "MWK",
  ) || "MWK";

  if (Number.isFinite(amountCandidate) && amountCandidate > 0) {
    return {
      amount: {
        amount: Math.round(amountCandidate),
        currency,
      },
      currency,
    };
  }

  return { currency };
}

async function handlePayChanguWebhookInternal(
  context: PayChanguWebhookContext,
): Promise<PaymentWebhookResponse> {
  const { rawPayload, parsedPayload } = parseRawWebhookPayload(context.payload);
  const payloadHash = sha256(rawPayload);

  if (!parsedPayload) {
    return { ok: false, error: "Invalid PayChangu webhook payload" };
  }

  const eventType = readString(parsedPayload.event_type, parsedPayload.event);
  const eventId = readString(parsedPayload.event_id, parsedPayload.eventId);
  const txRef = readString(
    parsedPayload.tx_ref,
    parsedPayload.reference,
    extractNestedObject(parsedPayload.data)?.tx_ref,
    extractNestedObject(parsedPayload.data)?.reference,
  );
  const providerSecret = process.env.PAYCHANGU_WEBHOOK_SECRET;

  const verified = await paychanguProvider.verifyWebhook(context.signature, rawPayload, {
    paychanguWebhookSecret: providerSecret,
  });

  const webhookInput = {
    provider: "paychangu",
    providerEventId: eventId || null,
    reference: txRef || null,
    txRef: txRef || null,
    eventType: eventType || null,
    payloadHash,
    processingStatus: "received",
    signatureValid: verified.valid,
    payload: rawPayload,
    createdAt: new Date().toISOString(),
  };

  if (!verified.valid) {
    const inserted = insertPaymentWebhookEvent({
      ...webhookInput,
      processingStatus: "rejected",
      error: "Invalid PayChangu webhook signature",
    });

    if (!inserted.inserted && inserted.duplicate) {
      recordPaymentWebhookDuplicateAttempt(webhookInput, inserted.existingId);
    }

    return { ok: false, error: "Invalid PayChangu webhook signature" };
  }

  const duplicate = findPaymentWebhookDuplicate(webhookInput);
  if (duplicate) {
    recordPaymentWebhookDuplicateAttempt(webhookInput, duplicate.id);
    return { ok: true, status: "duplicate", reference: txRef || null };
  }

  const inserted = insertPaymentWebhookEvent(webhookInput);
  if (!inserted.inserted) {
    recordPaymentWebhookDuplicateAttempt(webhookInput, inserted.existingId);
    return { ok: true, status: "duplicate", reference: txRef || null };
  }

  if (!eventType || !txRef || !isAcceptedPaychanguEventType(eventType)) {
    updatePaymentWebhookEventStatus(inserted.id, "ignored", {
      processedAt: new Date().toISOString(),
      error: !eventType
        ? "Missing PayChangu webhook event type"
        : `Unhandled PayChangu webhook event type: ${eventType}`,
      signatureValid: true,
    });
    return { ok: true, status: "ignored", reference: txRef || null };
  }

  const status = readString(
    extractNestedObject(parsedPayload.data)?.status,
    extractNestedObject(extractNestedObject(parsedPayload.data)?.transaction)?.status,
    parsedPayload.status,
  ) || "unknown";

  const payment = paymentRepository.findByReference(txRef);
  if (!payment) {
    updatePaymentWebhookEventStatus(inserted.id, "ignored", {
      processedAt: new Date().toISOString(),
      error: `No stored payment found for reference ${txRef}`,
      signatureValid: true,
    });
    return { ok: true, status: "ignored", reference: txRef };
  }

  const { amount, currency } = readAmountAndCurrency(parsedPayload);
  const now = new Date().toISOString();

  if (isPaychanguSuccessStatus(status)) {
    applyVerifiedPayChanguPayment({
      verified: true,
      provider: "paychangu",
      txRef,
      reference: txRef,
      status,
      currency,
      amount,
      checkoutUrl: null,
      rawResponse: parsedPayload,
    });

    updatePaymentWebhookEventStatus(inserted.id, "processed", {
      processedAt: now,
      signatureValid: true,
    });

    return { ok: true, status: "processed", reference: txRef };
  }

  paymentRepository.updateByReference(txRef, (current) => ({
    ...current,
    verified: false,
    verification: {
      verified: false,
      provider: "paychangu",
      txRef,
      reference: txRef,
      status,
      currency,
      amount,
      checkoutUrl: null,
      rawResponse: parsedPayload,
      failureReason: `PayChangu webhook reported ${status}`,
    },
    status: ["failed", "cancelled", "canceled", "expired", "declined"].includes(status.toLowerCase())
      ? "failed"
      : current.status,
    updatedAt: now,
  }));

  updatePaymentWebhookEventStatus(inserted.id, "processed", {
    processedAt: now,
    signatureValid: true,
  });

  return { ok: true, status: "processed", reference: txRef };
}

async function paymentWebhookRouteHandler(req: Request, res: Response) {
  try {
    const signature = getHeaderValue(req, ["x-paychangu-signature", "signature"]);
    const result = await handlePayChanguWebhookInternal({
      signature,
      payload: req.body as Buffer | string | Record<string, unknown>,
    });

    if (!result.ok) {
      return res.status(401).json({ error: result.error });
    }

    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return res.status(500).json({ error: message });
  }
}

export const paymentWebhookHandler = Object.assign(paymentWebhookRouteHandler, {
  handlePaychanguWebhook: handlePayChanguWebhookInternal,
});

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
} from "../../sqlite/webhooks.js";

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

// rest of file remains unchanged

import { rateLimit } from "@xhovile/platform/rate-limit/express";
import type { Request, RequestHandler } from "express";

function getRequestIdentity(request: Request): string {
  return (
    request.user?.uid ||
    String((request as any).userId ?? "").trim() ||
    String((request as any).uid ?? "").trim() ||
    (request.ip ? `ip:${request.ip}` : "anonymous")
  );
}

export const checkoutRateLimit: RequestHandler = rateLimit({
  name: "checkout",
  limit: 10,
  windowMs: 60_000,
  key: "ip",
  storeFailure: "fail-closed",
});

export const publicPaymentStatusRateLimit: RequestHandler = rateLimit({
  name: "payment-public-status",
  limit: 60,
  windowMs: 60_000,
  key: "ip",
  storeFailure: "fail-closed",
});

export const paymentWebhookRateLimit: RequestHandler = rateLimit({
  name: "payment-webhook",
  limit: 200,
  windowMs: 60_000,
  key: "ip",
  storeFailure: "fail-closed",
});

export const payoutWebhookRateLimit: RequestHandler = rateLimit({
  name: "payout-webhook",
  limit: 200,
  windowMs: 60_000,
  key: "ip",
  storeFailure: "fail-closed",
});

export const messageSendRateLimit: RequestHandler = rateLimit({
  name: "message-send",
  limit: 30,
  windowMs: 60_000,
  key: "user",
  getUserId: getRequestIdentity,
  storeFailure: "fail-closed",
});

export const messageReportRateLimit: RequestHandler = rateLimit({
  name: "message-report",
  limit: 10,
  windowMs: 60_000,
  key: "user",
  getUserId: getRequestIdentity,
  storeFailure: "fail-closed",
});

export const validatorRateLimit: RequestHandler = rateLimit({
  name: "validator",
  limit: 120,
  windowMs: 60_000,
  key: "ip",
  storeFailure: "fail-closed",
});

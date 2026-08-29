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

export const publicAiRateLimit: RequestHandler = rateLimit({
  name: "ai-public",
  limit: 10,
  windowMs: 60_000,
  key: "ip",
  storeFailure: "fail-closed",
});

export const authenticatedAiRateLimit: RequestHandler = rateLimit({
  name: "ai-authenticated",
  limit: 20,
  windowMs: 60_000,
  key: "user",
  getUserId: getRequestIdentity,
  storeFailure: "fail-closed",
});

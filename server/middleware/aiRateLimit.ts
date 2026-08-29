import { rateLimit } from "@xhovile/platform/rate-limit/express";
import type { RequestHandler } from "express";

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
  getUserId: (request) => request.user?.uid || (request as any).userId || (request as any).uid || (request.ip ? `ip:${request.ip}` : "anonymous"),
  storeFailure: "fail-closed",
});

import { rateLimit } from "@xhovile/platform/rate-limit/express";
import type { RequestHandler } from "express";

export const adminApiLimiter: RequestHandler = rateLimit({
  name: "admin-api",
  limit: 60,
  windowMs: 60_000,
  key: "ip",
  storeFailure: "fail-closed",
});

import type { Request } from "express";
import { rateLimit } from "@xhovile/platform/rate-limit/express";

export function platformIpRateLimit(name: string, limit: number, windowMs: number) {
  return rateLimit({ name, limit, windowMs, key: "ip", storeFailure: "fail-closed" });
}

export function platformUserRateLimit(name: string, limit: number, windowMs: number) {
  return rateLimit({
    name,
    limit,
    windowMs,
    key: "user",
    getUserId: (request: Request) => request.user?.uid || (request as any).userId || (request as any).uid || (request.ip ? `ip:${request.ip}` : "anonymous"),
    storeFailure: "fail-closed",
  });
}

export function platformIpUserRateLimit(name: string, limit: number, windowMs: number) {
  return rateLimit({
    name,
    limit,
    windowMs,
    key: "ip+user",
    getUserId: (request: Request) => request.user?.uid || (request as any).userId || (request as any).uid || (request.ip ? `ip:${request.ip}` : "anonymous"),
    storeFailure: "fail-closed",
  });
}

import type { Request } from "express";
import { rateLimit } from "@xhovile/platform/rate-limit/express";

function getRequestIdentity(request: Request): string {
  return (
    request.user?.uid ||
    String((request as any).userId ?? "").trim() ||
    String((request as any).uid ?? "").trim() ||
    (request.ip ? `ip:${request.ip}` : "anonymous")
  );
}

export function platformIpRateLimit(name: string, limit: number, windowMs: number) {
  return rateLimit({ name, limit, windowMs, key: "ip", storeFailure: "fail-closed" });
}

export function platformUserRateLimit(name: string, limit: number, windowMs: number) {
  return rateLimit({
    name,
    limit,
    windowMs,
    key: "user",
    getUserId: getRequestIdentity,
    storeFailure: "fail-closed",
  });
}

export function platformIpUserRateLimit(name: string, limit: number, windowMs: number) {
  return rateLimit({
    name,
    limit,
    windowMs,
    key: "ip+user",
    getUserId: getRequestIdentity,
    storeFailure: "fail-closed",
  });
}

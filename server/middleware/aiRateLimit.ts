import rateLimit, { type Options } from "express-rate-limit";
import type { RequestHandler } from "express";

function keyForRequest(req: Parameters<Options["keyGenerator"]>[0]): string {
  const uid = req.user?.uid;
  return uid ? `user:${uid}` : `ip:${req.ip}`;
}

function createLimiter(windowMs: number, limit: number, message: string): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: keyForRequest,
    handler: (_req, res) => {
      res.status(429).json({
        error: message,
        code: "AI_RATE_LIMITED",
      });
    },
  });
}

/**
 * Public Gemini-consuming endpoints. The key is a Firebase UID when available,
 * otherwise the request IP, so both authenticated and anonymous abuse are limited.
 */
export const publicAiRateLimit = createLimiter(
  60_000,
  10,
  "Too many AI requests. Please try again in a minute.",
);

/**
 * Authenticated seller/admin AI tooling. Slightly higher allowance, but still
 * bounded to prevent automated Gemini quota consumption.
 */
export const authenticatedAiRateLimit = createLimiter(
  60_000,
  20,
  "Too many AI requests. Please slow down and try again in a minute.",
);

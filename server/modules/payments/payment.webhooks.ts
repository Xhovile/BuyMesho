import type { Request, Response } from "express";

export async function paymentWebhookHandler(req: Request, res: Response) {
  // Compile-safe fallback. Full PayChangu webhook handling will be restored separately.
  void req;
  return res.status(501).json({ error: "Payment webhook handler is temporarily unavailable." });
}

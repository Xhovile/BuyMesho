import type { Request, Response } from "express";

export async function payoutWebhookHandler(req: Request, res: Response) {
  void req;
  return res.status(501).end();
}

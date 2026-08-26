import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyPayChanguWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined,
  webhookSecret: string | undefined,
): boolean {
  if (!webhookSecret || !signature || !rawBody.length) return false;

  const received = signature.trim();
  if (!/^[a-fA-F0-9]{64}$/.test(received)) return false;

  const expected = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest();
  const supplied = Buffer.from(received, "hex");

  return supplied.length === expected.length && timingSafeEqual(expected, supplied);
}

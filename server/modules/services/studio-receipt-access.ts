import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 24 * 60 * 60;

function getReceiptSecret(): string {
  const secret =
    process.env.XHOVILE_STUDIO_RECEIPT_SECRET?.trim() ||
    process.env.PAYCHANGU_WEBHOOK_SECRET?.trim() ||
    process.env.PAYCHANGU_SECRET_KEY?.trim();

  if (!secret) {
    throw new Error("Xhovile Studio receipt signing secret is not configured.");
  }

  return secret;
}

function sign(reference: string, expiresAt: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${reference}.${expiresAt}`)
    .digest("base64url");
}

export function createXhovileStudioReceiptAccessToken(
  reference: string,
  expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
): string {
  const normalizedReference = reference.trim();
  if (!normalizedReference) {
    throw new Error("Payment reference is required to create a receipt token.");
  }

  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new Error("Receipt token expiration must be in the future.");
  }

  const signature = sign(normalizedReference, expiresAt, getReceiptSecret());
  return `${expiresAt}.${signature}`;
}

export function verifyXhovileStudioReceiptAccessToken(
  reference: string,
  token: string | undefined | null,
): boolean {
  const normalizedReference = reference.trim();
  const normalizedToken = String(token ?? "").trim();

  if (!normalizedReference || !normalizedToken) return false;

  const separator = normalizedToken.indexOf(".");
  if (separator <= 0 || separator === normalizedToken.length - 1) return false;

  const expiresAt = Number(normalizedToken.slice(0, separator));
  const signature = normalizedToken.slice(separator + 1);
  const now = Math.floor(Date.now() / 1000);

  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;
  if (!/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;

  try {
    const expected = sign(normalizedReference, expiresAt, getReceiptSecret());
    const expectedBytes = Buffer.from(expected);
    const actualBytes = Buffer.from(signature);

    return (
      expectedBytes.length === actualBytes.length &&
      timingSafeEqual(expectedBytes, actualBytes)
    );
  } catch {
    return false;
  }
}

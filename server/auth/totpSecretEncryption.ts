import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;
const VERSION = "v1";
const KEY_SALT = "BuyMesho TOTP enrollment secret";

function requireEncryptionKey(): string {
  const value = process.env.TOTP_ENCRYPTION_KEY?.trim();
  if (!value) {
    throw new Error("TOTP_ENCRYPTION_KEY is not configured");
  }
  return value;
}

function getDerivedKey(): Buffer {
  return scryptSync(requireEncryptionKey(), KEY_SALT, KEY_BYTES);
}

export function isEncryptedTotpSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${VERSION}:`);
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getDerivedKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptTotpSecret(value: string): string {
  const parts = value.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Invalid encrypted TOTP secret format");
  }

  const iv = Buffer.from(parts[1], "base64url");
  const authTag = Buffer.from(parts[2], "base64url");
  const ciphertext = Buffer.from(parts[3], "base64url");

  if (iv.length !== IV_BYTES || authTag.length !== 16 || ciphertext.length === 0) {
    throw new Error("Invalid encrypted TOTP secret payload");
  }

  const decipher = createDecipheriv(ALGORITHM, getDerivedKey(), iv);
  decipher.setAuthTag(authTag);

  return `${decipher.update(ciphertext, undefined, "utf8")}${decipher.final("utf8")}`;
}

export function decryptOrMigrateTotpSecret(value: string): { secret: string; migrated: boolean; encryptedValue?: string } {
  if (isEncryptedTotpSecret(value)) {
    return { secret: decryptTotpSecret(value), migrated: false };
  }

  return {
    secret: value,
    migrated: true,
    encryptedValue: encryptTotpSecret(value),
  };
}

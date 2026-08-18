import { describe, expect, it, afterEach } from "vitest";
import {
  decryptOrMigrateTotpSecret,
  decryptTotpSecret,
  encryptTotpSecret,
  isEncryptedTotpSecret,
} from "./totpSecretEncryption.js";

const originalKey = process.env.TOTP_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.TOTP_ENCRYPTION_KEY;
  else process.env.TOTP_ENCRYPTION_KEY = originalKey;
});

describe("TOTP secret encryption", () => {
  it("round-trips secrets with authenticated encryption", () => {
    process.env.TOTP_ENCRYPTION_KEY = "test-only-totp-encryption-key-change-me";
    const encrypted = encryptTotpSecret("JBSWY3DPEHPK3PXP");

    expect(isEncryptedTotpSecret(encrypted)).toBe(true);
    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptTotpSecret(encrypted)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("migrates legacy plaintext values", () => {
    process.env.TOTP_ENCRYPTION_KEY = "test-only-totp-encryption-key-change-me";
    const migrated = decryptOrMigrateTotpSecret("LEGACY-TOTP-SECRET");

    expect(migrated.migrated).toBe(true);
    expect(migrated.secret).toBe("LEGACY-TOTP-SECRET");
    expect(migrated.encryptedValue).toBeTruthy();
    expect(migrated.encryptedValue).not.toContain("LEGACY-TOTP-SECRET");
    expect(decryptTotpSecret(migrated.encryptedValue!)).toBe("LEGACY-TOTP-SECRET");
  });

  it("fails closed when the encryption key is missing", () => {
    delete process.env.TOTP_ENCRYPTION_KEY;
    expect(() => encryptTotpSecret("secret")).toThrow("TOTP_ENCRYPTION_KEY is not configured");
  });
});

const TOTP_SESSION_TOKEN_KEY = "buymesho.totp.sessionToken";
const TOTP_SESSION_EXPIRES_AT_KEY = "buymesho.totp.sessionExpiresAt";

function safeStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function setTotpVerifiedSessionToken(token: string, expiresAt?: string | null): void {
  const storage = safeStorage();
  if (!storage) return;

  const trimmedToken = token.trim();
  if (!trimmedToken) return;

  storage.setItem(TOTP_SESSION_TOKEN_KEY, trimmedToken);
  if (expiresAt) {
    storage.setItem(TOTP_SESSION_EXPIRES_AT_KEY, expiresAt);
  } else {
    storage.removeItem(TOTP_SESSION_EXPIRES_AT_KEY);
  }
}

export function getTotpVerifiedSessionToken(): string | null {
  const storage = safeStorage();
  if (!storage) return null;

  const token = storage.getItem(TOTP_SESSION_TOKEN_KEY);
  if (!token) return null;

  const expiresAt = storage.getItem(TOTP_SESSION_EXPIRES_AT_KEY);
  if (expiresAt) {
    const expiresAtMs = Date.parse(expiresAt);
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) {
      clearTotpVerifiedSessionToken();
      return null;
    }
  }

  return token;
}

export function getTotpVerifiedSessionExpiry(): string | null {
  const storage = safeStorage();
  if (!storage) return null;
  return storage.getItem(TOTP_SESSION_EXPIRES_AT_KEY);
}

export function clearTotpVerifiedSessionToken(): void {
  const storage = safeStorage();
  if (!storage) return;

  storage.removeItem(TOTP_SESSION_TOKEN_KEY);
  storage.removeItem(TOTP_SESSION_EXPIRES_AT_KEY);
}

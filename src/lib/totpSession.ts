const TOTP_SESSION_STORAGE_KEY = "buymesho.totp.session";

export function getTotpVerifiedSessionToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const token = window.localStorage.getItem(TOTP_SESSION_STORAGE_KEY);
    return token && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

export function setTotpVerifiedSessionToken(token: string): void {
  if (typeof window === "undefined") return;

  const normalized = token.trim();
  if (!normalized) return;

  try {
    window.localStorage.setItem(TOTP_SESSION_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage failures so auth can still proceed.
  }
}

export function clearTotpVerifiedSessionToken(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(TOTP_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function hasTotpVerifiedSessionToken(): boolean {
  return !!getTotpVerifiedSessionToken();
}

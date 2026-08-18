import type { Response } from "express";

export const TOTP_SESSION_COOKIE = "buymesho_totp_session";
export const TOTP_SESSION_TTL_MS = 15 * 60 * 1000;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.max(0, Math.floor(maxAge)),
  };
}

export function setTotpSessionCookie(res: Response, expiresAt: string) {
  const expiresMs = Date.parse(expiresAt);
  const maxAge = Number.isFinite(expiresMs) ? Math.max(0, expiresMs - Date.now()) : TOTP_SESSION_TTL_MS;
  res.cookie(TOTP_SESSION_COOKIE, "", cookieOptions(0));
  return maxAge;
}

export function setTotpSessionTokenCookie(res: Response, token: string, expiresAt: string) {
  const expiresMs = Date.parse(expiresAt);
  const maxAge = Number.isFinite(expiresMs) ? Math.max(0, expiresMs - Date.now()) : TOTP_SESSION_TTL_MS;
  res.cookie(TOTP_SESSION_COOKIE, token, cookieOptions(maxAge));
}

export function clearTotpSessionCookie(res: Response) {
  res.clearCookie(TOTP_SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export function readTotpSessionCookie(req: { headers: { cookie?: string } }): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    const name = pair.slice(0, separator).trim();
    if (name !== TOTP_SESSION_COOKIE) continue;
    return decodeURIComponent(pair.slice(separator + 1).trim()) || null;
  }

  return null;
}

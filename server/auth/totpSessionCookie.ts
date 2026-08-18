import type { Request, Response } from "express";

export const TOTP_SESSION_COOKIE = "buymesho_totp_session";
export const TOTP_SESSION_TTL_MS = 15 * 60 * 1000;
export const VALIDATOR_TOTP_SESSION_COOKIE = "buymesho_validator_totp_session";

function setSessionCookie(res: Response, name: string, token: string, expiresAt: string) {
  const expiresMs = Date.parse(expiresAt);
  const maxAge = Number.isFinite(expiresMs) ? Math.max(0, expiresMs - Date.now()) : TOTP_SESSION_TTL_MS;

  res.cookie(name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(maxAge),
  });
}

function clearSessionCookie(res: Response, name: string) {
  res.clearCookie(name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

function readSessionCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    const cookieName = pair.slice(0, separator).trim();
    if (cookieName !== name) continue;

    const value = pair.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value) || null;
    } catch {
      return value || null;
    }
  }

  return null;
}

export function setTotpSessionTokenCookie(res: Response, token: string, expiresAt: string) {
  setSessionCookie(res, TOTP_SESSION_COOKIE, token, expiresAt);
}

export function clearTotpSessionCookie(res: Response) {
  clearSessionCookie(res, TOTP_SESSION_COOKIE);
}

export function readTotpSessionCookie(req: Request): string | null {
  return readSessionCookie(req, TOTP_SESSION_COOKIE);
}

export function setValidatorTotpSessionTokenCookie(res: Response, token: string, expiresAt: string) {
  setSessionCookie(res, VALIDATOR_TOTP_SESSION_COOKIE, token, expiresAt);
}

export function clearValidatorTotpSessionCookie(res: Response) {
  clearSessionCookie(res, VALIDATOR_TOTP_SESSION_COOKIE);
}

export function readValidatorTotpSessionCookie(req: Request): string | null {
  return readSessionCookie(req, VALIDATOR_TOTP_SESSION_COOKIE);
}
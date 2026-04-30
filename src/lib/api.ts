import { auth } from "../firebase";
import { getTotpVerifiedSessionToken } from "./totpSession";

async function authHeader() {
  const user = auth.currentUser;
  if (!user) return {} as Record<string, string>;
  const token = await user.getIdToken(true);
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

  const totpSessionToken = getTotpVerifiedSessionToken();
  if (totpSessionToken) {
    headers["x-buymesho-totp-session"] = totpSessionToken;
  }

  return headers;
}

const API_FETCH_TIMEOUT_MS = 15000;

export async function apiFetch(url: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    ...(await authHeader()),
  };

  // ✅ If sending a JSON body and no content-type set, set it
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, signal: init.signal ?? controller.signal });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Network timeout. Please check your connection and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch {}
    throw new Error(body?.error || `Request failed (${res.status})`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

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

type ApiFetchInit = RequestInit & {
  timeoutMs?: number;
};

function formatApiErrorMessage(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatApiErrorMessage(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(", ") : null;
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const directMessage = formatApiErrorMessage(
      record.message ?? record.error ?? record.detail ?? record.reason,
    );
    if (directMessage) return directMessage;

    const parts = Object.entries(record)
      .map(([key, nested]) => {
        const nestedMessage = formatApiErrorMessage(nested);
        return nestedMessage ? `${key}: ${nestedMessage}` : null;
      })
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join("; ") : null;
  }

  return null;
}

function createCombinedAbortSignal(signal?: AbortSignal) {
  const controller = new AbortController();
  let callerAborted = false;

  if (signal) {
    if (signal.aborted) {
      callerAborted = true;
      controller.abort(signal.reason);
    } else {
      signal.addEventListener(
        "abort",
        () => {
          callerAborted = true;
          controller.abort(signal.reason);
        },
        { once: true }
      );
    }
  }

  return { controller, wasCallerAborted: () => callerAborted };
}

export async function apiFetch(url: string, init: ApiFetchInit = {}) {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    ...(await authHeader()),
  };

  // ✅ If sending a JSON body and no content-type set, set it
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const { controller, wasCallerAborted } = createCombinedAbortSignal(init.signal);
  let timedOut = false;
  const timeoutMs = init.timeoutMs ?? API_FETCH_TIMEOUT_MS;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    const timeoutError = new Error("Request aborted by timeout.");
    timeoutError.name = "AbortError";
    controller.abort(timeoutError);
  }, timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      const reason = controller.signal.reason;
      if (reason instanceof Error && reason.message.trim()) {
        throw reason;
      }
      if (typeof reason === "string" && reason.trim()) {
        throw new Error(reason.trim());
      }
      if (timedOut && !wasCallerAborted()) {
        throw new Error("Request aborted by timeout.");
      }
      throw new Error("Request aborted.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch {}
    const message = formatApiErrorMessage(body?.error ?? body?.message) ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

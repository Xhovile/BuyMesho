import { auth } from "../firebase";
import {
  API_CACHE_TTL_MS,
  isCachedApiResponseFresh,
  readCachedApiJson,
  writeCachedApiJson,
} from "./apiCache";

async function authHeader() {
  const user = auth.currentUser;
  if (!user) return {} as Record<string, string>;

  let token = "";
  try {
    token = await user.getIdToken();
  } catch {
    try {
      token = await user.getIdToken(true);
    } catch (err) {
      console.warn("Failed to retrieve ID token:", err);
    }
  }

  if (!token) return {} as Record<string, string>;

  return { Authorization: `Bearer ${token}` };
}

const API_FETCH_TIMEOUT_MS = 15000;
const DEFAULT_SAFE_RETRY_ATTEMPTS = 3;
const DEFAULT_SAFE_RETRY_DELAY_MS = 350;
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

type ApiFetchInit = RequestInit & {
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
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
    const parts = value.map((item) => formatApiErrorMessage(item)).filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(", ") : null;
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const directMessage = formatApiErrorMessage(record.message ?? record.error ?? record.detail ?? record.reason);
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
      signal.addEventListener("abort", () => {
        callerAborted = true;
        controller.abort(signal.reason);
      }, { once: true });
    }
  }

  return { controller, wasCallerAborted: () => callerAborted };
}

function normalizeAbortReason(reason: unknown, fallbackMessage: string) {
  if (reason instanceof Error && reason.message.trim()) return reason;
  if (typeof reason === "string" && reason.trim()) return new Error(reason.trim());
  return new Error(fallbackMessage);
}

function getRetryableMethod(method?: string) {
  return (method || "GET").trim().toUpperCase();
}

function shouldRetrySafeRequest(method?: string) {
  const normalized = getRetryableMethod(method);
  return normalized === "GET" || normalized === "HEAD" || normalized === "OPTIONS";
}

function isSellerWorkspaceCacheable(url: string) {
  return /^\/api\/(sellers(?:\/|$)|seller\/orders(?:\/|$)|payouts(?:\/|$)|connect(?:\/|$))/i.test(url);
}

function rewriteLegacyPayoutRoute(url: string, init: ApiFetchInit) {
  return { url, init };
}

function rewriteEventLifecyclePayload(url: string, init: ApiFetchInit) {
  return { url, init };
}

async function performApiFetch(url: string, init: ApiFetchInit = {}) {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    ...(await authHeader()),
  };

  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const { controller, wasCallerAborted } = createCombinedAbortSignal(init.signal);
  let timedOut = false;
  const timeoutMs = init.timeoutMs ?? API_FETCH_TIMEOUT_MS;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error(`Request timed out after ${timeoutMs}ms.`));
  }, timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, credentials: "same-origin", signal: controller.signal });
  } catch (error: any) {
    if (error?.name === "AbortError" || controller.signal.aborted) {
      const reason = controller.signal.reason;
      if (timedOut && !wasCallerAborted()) throw normalizeAbortReason(reason, `Request timed out after ${timeoutMs}ms.`);
      throw normalizeAbortReason(reason, "Request aborted.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    let body: any = null;
    try {
      body = await res.json();
    } catch {}
    const message = formatApiErrorMessage(body?.error ?? body?.message) ?? `Request failed (${res.status})`;
    const error = new Error(message) as Error & { status?: number; code?: string };
    error.status = res.status;
    if (typeof body?.code === "string" && body.code.trim()) error.code = body.code.trim();
    throw error;
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function apiFetch(url: string, init: ApiFetchInit = {}) {
  const { url: rewrittenUrl, init: rewrittenInit } = rewriteLegacyPayoutRoute(url, init);
  const eventInit = rewriteEventLifecyclePayload(rewrittenUrl, rewrittenInit);
  const method = getRetryableMethod(eventInit.method);
  const retryAttempts = eventInit.retryAttempts ?? (shouldRetrySafeRequest(method) ? DEFAULT_SAFE_RETRY_ATTEMPTS : 1);
  const retryDelayMs = eventInit.retryDelayMs ?? DEFAULT_SAFE_RETRY_DELAY_MS;
  const cacheableSellerRead = method === "GET" && isSellerWorkspaceCacheable(rewrittenUrl);
  const cachedSellerRead = cacheableSellerRead ? readCachedApiJson<unknown>(rewrittenUrl) : null;

  if (cacheableSellerRead && cachedSellerRead !== null && isCachedApiResponseFresh(rewrittenUrl, API_CACHE_TTL_MS)) {
    return cachedSellerRead;
  }

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      const data = await performApiFetch(rewrittenUrl, eventInit);
      if (cacheableSellerRead) writeCachedApiJson(rewrittenUrl, data);
      return data;
    } catch (error: any) {
      lastError = error;
      const status = typeof error?.status === "number" ? error.status : null;
      const retryable = status !== null && RETRYABLE_STATUS_CODES.has(status);
      if (attempt >= retryAttempts || !retryable) throw error;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed.");
}

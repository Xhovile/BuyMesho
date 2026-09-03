import { auth } from "../firebase";
import { clearSensitiveApiCache } from "./apiCache";
import { getSellerCache, invalidateSellerCache, setSellerCache } from "./sellerWorkspaceCache";
import { onAuthStateChanged } from "firebase/auth";

clearSensitiveApiCache();

// Firebase restores persisted authentication asynchronously after the app starts.
// Resolve this once so API calls made during that window never race auth.currentUser.
const initialAuthState = new Promise<void>((resolve) => {
  let settled = false;
  const unsubscribe = onAuthStateChanged(auth, () => {
    if (settled) return;
    settled = true;
    unsubscribe();
    resolve();
  });
});

async function authHeader(forceRefresh = false) {
  await initialAuthState;

  const user = auth.currentUser;
  if (!user) return {} as Record<string, string>;

  try {
    const token = await user.getIdToken(forceRefresh);
    if (token) return { Authorization: `Bearer ${token}` };
  } catch (error) {
    if (!forceRefresh) {
      try {
        const token = await user.getIdToken(true);
        if (token) return { Authorization: `Bearer ${token}` };
      } catch (refreshError) {
        console.warn("Failed to retrieve refreshed ID token:", refreshError);
      }
    } else {
      console.warn("Failed to refresh Firebase ID token:", error);
    }
  }

  return {} as Record<string, string>;
}

const API_FETCH_TIMEOUT_MS = 15000;
const DEFAULT_SAFE_RETRY_ATTEMPTS = 3;
const DEFAULT_SAFE_RETRY_DELAY_MS = 350;
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);
const adminMessagesResponseCache = new Map<string, any>();

type ApiFetchInit = RequestInit & { timeoutMs?: number; retryAttempts?: number; retryDelayMs?: number };

function formatApiErrorMessage(value: unknown): string | null {
  if (typeof value === "string") { const trimmed = value.trim(); return trimmed.length > 0 ? trimmed : null; }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map((item) => formatApiErrorMessage(item)).filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(", ") : null;
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const directMessage = formatApiErrorMessage(record.message ?? record.error ?? record.detail ?? record.reason);
    if (directMessage) return directMessage;
    const parts = Object.entries(record).map(([key, nested]) => { const nestedMessage = formatApiErrorMessage(nested); return nestedMessage ? `${key}: ${nestedMessage}` : null; }).filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join("; ") : null;
  }
  return null;
}

function createCombinedAbortSignal(signal?: AbortSignal) {
  const controller = new AbortController();
  let callerAborted = false;
  if (signal) {
    if (signal.aborted) { callerAborted = true; controller.abort(signal.reason); }
    else signal.addEventListener("abort", () => { callerAborted = true; controller.abort(signal.reason); }, { once: true });
  }
  return { controller, wasCallerAborted: () => callerAborted };
}

function normalizeAbortReason(reason: unknown, fallbackMessage: string) {
  if (reason instanceof Error && reason.message.trim()) return reason;
  if (typeof reason === "string" && reason.trim()) return new Error(reason.trim());
  return new Error(fallbackMessage);
}

function getRetryableMethod(method?: string) { return (method || "GET").trim().toUpperCase(); }
function shouldRetrySafeRequest(method: string) { return method === "GET" || method === "HEAD"; }
function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function rewriteLegacyPayoutRoute(url: string, init: ApiFetchInit): { url: string; init: ApiFetchInit } {
  const match = url.match(/^\/api\/payouts\/([^/]+)\/(retry|override)$/);
  if (!match) return { url, init };
  const payload = typeof init.body === "string" ? (() => { try { return JSON.parse(init.body) as Record<string, unknown>; } catch { return null; } })() : null;
  const payoutId = typeof payload?.payoutId === "string" ? payload.payoutId.trim() : "";
  if (!payoutId) return { url, init };
  return { url: `/api/admin/payouts/${encodeURIComponent(payoutId)}/${match[2]}`, init };
}

function rewriteEventLifecyclePayload(url: string, init: ApiFetchInit): ApiFetchInit {
  if (!/^\/api\/events(?:\/\d+)?$/.test(url) || typeof init.body !== "string") return init;
  let payload: Record<string, any>;
  try { payload = JSON.parse(init.body); } catch { return init; }
  if (!payload || typeof payload !== "object" || !payload.spec_values || typeof payload.spec_values !== "object") return init;
  const spec = payload.spec_values as Record<string, unknown>;
  const lifecycleKeys = ["end_time", "publication_mode", "publication_at", "runtime_mode"] as const;
  const nextPayload = { ...payload };
  for (const key of lifecycleKeys) if (nextPayload[key] === undefined && spec[key] !== undefined && spec[key] !== "") nextPayload[key] = spec[key];
  return { ...init, body: JSON.stringify(nextPayload) };
}

function sellerWorkspaceCacheKey(url: string): string | null {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;

  if (url === "/api/seller/orders") return "api:orders";

  const sellerMatch = url.match(/^\/api\/sellers\/([^/]+)(\/listings)?$/);
  const sellerUid = sellerMatch ? sellerMatch[1] : null;
  if (sellerUid === uid) {
    return `api:seller:${uid}${sellerMatch && sellerMatch[2] === "/listings" ? ":listings" : ":profile"}`;
  }

  const userListingsMatch = url.match(/^\/api\/users\/([^/]+)\/listings$/);
  const userListingsUid = userListingsMatch ? userListingsMatch[1] : null;
  if (userListingsUid === uid) return `api:seller:${uid}:listings`;

  return null;
}

function invalidateSellerWorkspaceCache(method: string, url: string) {
  if (method === "GET" || method === "HEAD") return;

  const uid = auth.currentUser?.uid;
  if (!uid) return;

  if (url === "/api/seller/orders" || url.startsWith("/api/seller/orders/")) {
    invalidateSellerCache("api:orders");
  }

  if (url === "/api/listings" || url.startsWith("/api/listings/")) {
    invalidateSellerCache(`api:seller:${uid}:listings`);
  }

  const sellerMatch = url.match(/^\/api\/sellers\/([^/]+)/);
  const sellerUid = sellerMatch ? sellerMatch[1] : null;
  if (sellerUid === uid) {
    invalidateSellerCache(`api:seller:${sellerUid}:profile`);
    invalidateSellerCache(`api:seller:${sellerUid}:listings`);
  }
}

async function performApiFetch(url: string, init: ApiFetchInit = {}, forceRefreshToken = false) {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined), ...(await authHeader(forceRefreshToken)) };
  if (init.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  const { controller, wasCallerAborted } = createCombinedAbortSignal(init.signal);
  let timedOut = false;
  const timeoutMs = init.timeoutMs ?? API_FETCH_TIMEOUT_MS;
  const timeoutId = setTimeout(() => { timedOut = true; controller.abort(new Error(`Request timed out after ${timeoutMs}ms.`)); }, timeoutMs);

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
  } finally { clearTimeout(timeoutId); }

  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch {}
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
  const isAdminMessagesList = method === "GET" && rewrittenUrl.startsWith("/api/admin/messages?") && !rewrittenUrl.includes("/summary");
  const sellerCacheKey = method === "GET" ? sellerWorkspaceCacheKey(rewrittenUrl) : null;

  if (isAdminMessagesList) {
    const cached = adminMessagesResponseCache.get(rewrittenUrl);
    if (cached !== undefined) return cached;
  }

  if (sellerCacheKey) {
    const cached = getSellerCache<any>(sellerCacheKey);
    if (cached !== null) return cached;
  }

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      const result = await performApiFetch(rewrittenUrl, eventInit);
      if (isAdminMessagesList) adminMessagesResponseCache.set(rewrittenUrl, result);
      if (sellerCacheKey) setSellerCache(sellerCacheKey, result);
      invalidateSellerWorkspaceCache(method, rewrittenUrl);
      return result;
    } catch (error: any) {
      lastError = error;
      const status = typeof error?.status === "number" ? error.status : null;

      // Authentication failures are recoverable when Firebase still has a signed-in
      // user. Refresh the ID token and retry the exact request once, including POSTs
      // such as reconcile/retry/refund. A genuine second 401 is still surfaced.
      if (status === 401 && auth.currentUser) {
        try {
          return await performApiFetch(rewrittenUrl, eventInit, true);
        } catch (refreshError) {
          lastError = refreshError;
        }
      }

      const retryableStatus = status !== null && RETRYABLE_STATUS_CODES.has(status);
      const retryableError = error?.name === "AbortError" || /Request timed out/i.test(String(error?.message || "")) || /fetch/i.test(String(error?.message || ""));
      const canRetry = attempt < retryAttempts && shouldRetrySafeRequest(method) && (retryableStatus || retryableError);
      if (!canRetry) throw lastError instanceof Error ? lastError : error;
      await sleep(retryDelayMs * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed.");
}

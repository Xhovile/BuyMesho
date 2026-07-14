const PATCH_FLAG = "__buymeshoExploreFetchCacheInstalled";
const CACHE_TTL_MS = 60_000;

type CachedResponse = {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
  timestamp: number;
};

type FetchInput = RequestInfo | URL;
type FetchInit = RequestInit | undefined;

function getUrl(input: FetchInput, init?: FetchInit) {
  if (typeof input === "string" || input instanceof URL) {
    return new URL(input.toString(), window.location.href);
  }

  const request = input as Request;
  return new URL(request.url, window.location.href);
}

function getMethod(input: FetchInput, init?: FetchInit) {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input !== "string" && !(input instanceof URL)) {
    return (input as Request).method?.toUpperCase() || "GET";
  }
  return "GET";
}

function isExploreListingsUrl(url: URL) {
  return url.origin === window.location.origin && url.pathname === "/api/listings";
}

function shouldCacheMethod(method: string) {
  return method === "GET";
}

export function invalidateExploreFetchCache() {
  const globalAny = window as Window & { __buymeshoExploreListingsCache?: Map<string, CachedResponse> };
  globalAny.__buymeshoExploreListingsCache?.clear();
}

export function installExploreFetchCache() {
  if (typeof window === "undefined") return;

  const globalAny = window as Window & {
    [PATCH_FLAG]?: boolean;
    __buymeshoExploreListingsCache?: Map<string, CachedResponse>;
  };

  if (globalAny[PATCH_FLAG]) return;
  globalAny[PATCH_FLAG] = true;
  globalAny.__buymeshoExploreListingsCache ??= new Map<string, CachedResponse>();

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: FetchInput, init?: FetchInit): Promise<Response> => {
    const method = getMethod(input, init);
    const url = getUrl(input, init);

    if (isExploreListingsUrl(url) && !shouldCacheMethod(method)) {
      globalAny.__buymeshoExploreListingsCache?.clear();
      return originalFetch(input, init);
    }

    if (!isExploreListingsUrl(url) || !shouldCacheMethod(method)) {
      return originalFetch(input, init);
    }

    const cacheKey = url.toString();
    const cached = globalAny.__buymeshoExploreListingsCache?.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: cached.headers,
      });
    }

    const response = await originalFetch(input, init);

    try {
      if (response.ok) {
        const body = await response.clone().text();
        const headers = Array.from(response.headers.entries()) as [string, string][];
        globalAny.__buymeshoExploreListingsCache?.set(cacheKey, {
          status: response.status,
          statusText: response.statusText,
          headers,
          body,
          timestamp: Date.now(),
        });
      }
    } catch {
      // Ignore caching failures and return the network response.
    }

    return response;
  };
}

installExploreFetchCache();

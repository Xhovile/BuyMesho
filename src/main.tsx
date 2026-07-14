import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import RootRouter from './RootRouter.tsx';
import './index.css';

const nativeFetch = window.fetch.bind(window);
const APICACHE_PREFIX = '__buymesho_api_cache_v2:';
const APICACHE_TTL_MS = 5 * 60 * 1000;

type CachedResponse = {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
  timestamp: number;
};

function getUrlString(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function getUrl(input: RequestInfo | URL): URL {
  return new URL(getUrlString(input), window.location.origin);
}

function getMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input !== 'string' && !(input instanceof URL)) {
    return (input as Request).method?.toUpperCase() || 'GET';
  }
  return 'GET';
}

function isCacheableGet(url: URL, method: string) {
  if (method !== 'GET') return false;
  if (url.origin !== window.location.origin) return false;

  const isListingsCollection = url.pathname === '/api/listings' && url.searchParams.has('pageSize');
  const isListingDetail =
    /^\/api\/listings\/[^/]+$/.test(url.pathname) &&
    !url.pathname.endsWith('/view') &&
    !url.pathname.endsWith('/status') &&
    !url.pathname.endsWith('/restock') &&
    !url.pathname.endsWith('/record-sale') &&
    !url.pathname.endsWith('/related');

  const isRelatedListings = /^\/api\/listings\/[^/]+\/related$/.test(url.pathname);
  const isUserProfile = /^\/api\/users\/[^/]+$/.test(url.pathname);
  const isUserListings = /^\/api\/users\/[^/]+\/listings$/.test(url.pathname);
  const isUserRatingSummary = /^\/api\/users\/[^/]+\/rating-summary$/.test(url.pathname);

  return (
    isListingsCollection ||
    isListingDetail ||
    isRelatedListings ||
    isUserProfile ||
    isUserListings ||
    isUserRatingSummary
  );
}

function getCacheKey(url: URL) {
  return `${APICACHE_PREFIX}${url.toString()}`;
}

function readCachedResponse(url: URL): CachedResponse | null {
  try {
    const raw = localStorage.getItem(getCacheKey(url));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedResponse;
    if (!parsed || Date.now() - parsed.timestamp > APICACHE_TTL_MS) {
      localStorage.removeItem(getCacheKey(url));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedResponse(url: URL, response: Response, body: string) {
  try {
    const payload: CachedResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: Array.from(response.headers.entries()),
      body,
      timestamp: Date.now(),
    };
    localStorage.setItem(getCacheKey(url), JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

function clearCachedResponsesByPath(prefixes: string[]) {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(APICACHE_PREFIX)) continue;
      if (prefixes.some((prefix) => key.includes(prefix))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore cleanup failures.
  }
}

window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = getUrl(input);
  const urlString = url.toString();
  const method = getMethod(input, init);

  if (url.origin === window.location.origin && method !== 'GET') {
    if (
      url.pathname.startsWith('/api/listings/') ||
      url.pathname.startsWith('/api/users/')
    ) {
      clearCachedResponsesByPath(['/api/listings/', '/api/users/']);
    }
  }

  if (urlString.includes('/api/listings?')) {
    const pageSize = window.innerWidth < 768 ? '18' : '24';
    url.searchParams.set('pageSize', pageSize);

    if (input instanceof Request) {
      input = new Request(url.toString(), input);
    } else {
      input = url.toString();
    }
  }

  if (isCacheableGet(url, method)) {
    const cached = readCachedResponse(url);
    if (cached) {
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: cached.headers,
      });
    }
  }

  const response = await nativeFetch(input as RequestInfo, init);

  if (isCacheableGet(url, method) && response.ok) {
    try {
      const cloned = response.clone();
      const body = await cloned.text();
      writeCachedResponse(url, response, body);
    } catch {
      // Ignore cache write failures.
    }
  }

  return response;
}) as typeof window.fetch;

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    console.error('App crash captured by error boundary:', error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-50 px-4 py-10 flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-lg">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#438c7c]">
              BuyMesho
            </p>
            <h1 className="mt-3 text-2xl font-black text-zinc-900">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              The app hit an unexpected error. Reload the page to try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center justify-center rounded-2xl bg-[#438c7c] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <RootRouter />
    </AppErrorBoundary>
  </StrictMode>,
);

import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import RootRouter from './RootRouter.tsx';
import './index.css';

const nativeFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const urlString =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (urlString.includes('/api/listings?')) {
    const url = new URL(urlString, window.location.origin);

    if (url.pathname === '/api/listings') {
      const pageSize = window.innerWidth < 768 ? '18' : '24';
      url.searchParams.set('pageSize', pageSize);

      if (input instanceof Request) {
        return nativeFetch(new Request(url.toString(), input));
      }

      return nativeFetch(url.toString(), init);
    }
  }

  return nativeFetch(input as RequestInfo, init);
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

class DebugErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("DebugErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
          <h2>Admin Payouts crashed</h2>
          <p>{this.state.error?.message}</p>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

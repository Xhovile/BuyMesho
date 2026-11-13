import { createContext, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { ADMIN_AUDIT_PATH, navigateToPath } from "../../lib/appNavigation";
import EventTicketSearchPanel from "../../components/EventTicketSearchPanel";
import AdminWorkspaceNav from "./AdminWorkspaceNav";
import DiagnosticsDrawer from "./DiagnosticsDrawer";

export type AdminWorkspaceContextValue = {
  pathname: string;
  pageKey: string;
  isActive: boolean;
  pageHeaderTarget: HTMLDivElement | null;
  isRefreshing: boolean;
  registerRefresh: (handler: (() => void) | undefined, isRefreshing: boolean) => void;
};

export const AdminWorkspaceContext = createContext<AdminWorkspaceContextValue | null>(null);

type AdminWorkspaceShellProps = {
  pathname: string;
  pageKey: string;
  showNav?: boolean;
  children: ReactNode;
};

function AdminPageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-3xl border border-bm-border bg-bm-surface p-8 text-center text-sm font-semibold text-bm-text-muted shadow-sm"
    >
      <Loader2 className="h-7 w-7 animate-spin text-bm-brand" aria-hidden="true" />
      <span>Loading this workspace page…</span>
    </div>
  );
}

/**
 * Keeps the Admin Workspace chrome mounted while retaining visited page
 * instances in the background. This preserves page data and local UI state
 * when administrators switch between workspace destinations.
 */
export default function AdminWorkspaceShell({
  pathname,
  pageKey,
  showNav = true,
  children,
}: AdminWorkspaceShellProps) {
  const [visitedPages, setVisitedPages] = useState<Record<string, ReactNode>>({});
  const [refreshHandler, setRefreshHandler] = useState<(() => void) | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const registerRefresh = useCallback((handler: (() => void) | undefined, refreshing: boolean) => {
    setRefreshHandler(() => handler ?? null);
    setIsRefreshing(refreshing);
  }, []);
  const pageHeaderRef = useRef<HTMLDivElement | null>(null);
  const [pageHeaderTarget, setPageHeaderTarget] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setPageHeaderTarget(pageHeaderRef.current);
  }, []);

  useEffect(() => {
    setVisitedPages((current) => {
      if (Object.prototype.hasOwnProperty.call(current, pageKey)) return current;
      return { ...current, [pageKey]: children };
    });
  }, [pageKey, children]);

  const pages = Object.entries(visitedPages);
  if (!Object.prototype.hasOwnProperty.call(visitedPages, pageKey)) {
    pages.push([pageKey, children]);
  }

  const showEventTicketSearch =
    pathname === "/admin/events" ||
    pathname === "/admin/transaction-inspector";

  return (
    <div className="min-h-screen bg-bm-surface-muted text-bm-text dark:bg-bm-surface-muted dark:text-bm-text">
        <header className="buymesho-brand-header sticky top-0 z-40 border-b border-bm-border bg-bm-surface/90 backdrop-blur-sm dark:bg-bm-surface/90">
          <div className={`mx-auto max-w-7xl px-4 py-3 ${pathname === ADMIN_AUDIT_PATH ? "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4" : "flex items-center justify-between gap-3"}`}>
            <button
              type="button"
              onClick={() => navigateToPath("/")}
              className="inline-flex items-center gap-2 justify-self-start rounded-2xl border border-bm-border bg-bm-surface px-4 py-2.5 text-sm font-bold hover:bg-bm-surface-muted dark:bg-bm-surface dark:hover:bg-bm-surface-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            {pathname === ADMIN_AUDIT_PATH ? (
              <div className="justify-self-center">
                <DiagnosticsDrawer showIcon={false} />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => refreshHandler?.()}
              disabled={!refreshHandler || isRefreshing}
              aria-busy={isRefreshing}
              className="inline-flex items-center gap-2 justify-self-end rounded-2xl bg-bm-brand px-4 py-2.5 text-sm font-bold text-bm-on-brand transition hover:bg-bm-brand-hover active:bg-bm-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              title={refreshHandler ? "Refresh this workspace page" : "Refresh is unavailable on this page"}
            >
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle dark:text-bm-text-subtle">
            Admin Workspace
          </p>
          <div ref={pageHeaderRef} />

          {showNav ? <AdminWorkspaceNav pathname={pathname} /> : null}
          {showEventTicketSearch ? <EventTicketSearchPanel mode="admin" /> : null}

          <div className="min-w-0">
            {pages.map(([key, page]) => {
              const active = key === pageKey;
              const pagePath = key.split("?")[0] ?? key;
              return (
                <AdminWorkspaceContext.Provider
                  key={key}
                  value={{ pathname: pagePath, pageKey: key, isActive: active, pageHeaderTarget, isRefreshing: active && isRefreshing, registerRefresh }}
                >
                  <div hidden={!active} aria-hidden={!active} className="min-w-0">
                    <Suspense fallback={active ? <AdminPageLoader /> : null}>
                      {page}
                    </Suspense>
                  </div>
                </AdminWorkspaceContext.Provider>
              );
            })}
          </div>
        </main>
      </div>
  );
}

import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useContext, type ReactNode } from "react";
import { navigateToPath } from "../../lib/appNavigation";
import AdminWorkspaceNav from "./AdminWorkspaceNav";
import DiagnosticsDrawer from "./DiagnosticsDrawer";
import EventTicketSearchPanel from "../../components/EventTicketSearchPanel";
import { AdminWorkspaceContext } from "./AdminWorkspaceShell";

type AdminWorkspaceLayoutProps = {
  title: string;
  description?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children: ReactNode;
  showNav?: boolean;
};

export default function AdminWorkspaceLayout({
  title,
  description,
  onRefresh,
  isRefreshing = false,
  children,
  showNav = true,
}: AdminWorkspaceLayoutProps) {
  const shellContext = useContext(AdminWorkspaceContext);
  const pathname = shellContext?.pathname ?? window.location.pathname;
  const isAuditLog = pathname.includes("audit-log") || pathname.includes("audit");
  const showEventTicketSearch =
    pathname === "/admin/events" ||
    pathname === "/admin/transaction-inspector";

  if (shellContext) {
    const pageHeader = shellContext.isActive && shellContext.pageHeaderTarget
      ? createPortal(
          <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-black tracking-tight text-bm-text dark:text-bm-text sm:text-4xl">{title}</h1>
              {description ? (
                <p className="mt-2 text-sm text-bm-text-muted dark:text-bm-text-muted sm:text-base">
                  {description}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isAuditLog ? <DiagnosticsDrawer /> : null}
              {onRefresh ? (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  aria-busy={isRefreshing}
                  className="inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-4 py-2.5 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover disabled:cursor-wait disabled:opacity-70"
                >
                  {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {isRefreshing ? "Refreshing…" : "Refresh"}
                </button>
              ) : null}
            </div>
          </section>,
          shellContext.pageHeaderTarget,
        )
      : null;

    return (
      <>
        {pageHeader}
        <div className="min-w-0 space-y-6">{children}</div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text dark:text-bm-text">
      <header className="buymesho-brand-header sticky top-0 z-40 border-b border-bm-border bg-bm-surface/90 dark:bg-bm-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigateToPath("/")}
            className="inline-flex items-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-2.5 text-sm font-bold hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            {isAuditLog ? <DiagnosticsDrawer /> : null}
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-busy={isRefreshing}
                className="inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-4 py-2.5 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover disabled:cursor-wait disabled:opacity-70"
              >
                {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {isRefreshing ? "Refreshing…" : "Refresh"}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle dark:text-bm-text-subtle">Admin Workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-bm-text dark:text-bm-text sm:text-4xl">{title}</h1>
          {description ? <p className="mt-2 text-sm text-bm-text-muted dark:text-bm-text-muted sm:text-base">{description}</p> : null}
        </section>

        {showNav ? <AdminWorkspaceNav pathname={pathname} /> : null}
        {showEventTicketSearch ? <EventTicketSearchPanel mode="admin" /> : null}
        {children}
      </main>
    </div>
  );
}

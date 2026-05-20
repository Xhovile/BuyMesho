import { ArrowLeft, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { navigateToPath } from "../../lib/appNavigation";
import AdminWorkspaceNav from "./AdminWorkspaceNav";

type AdminWorkspaceLayoutProps = {
  title: string;
  description?: string;
  onRefresh?: () => void;
  children: ReactNode;
  showNav?: boolean;
};

export default function AdminWorkspaceLayout({
  title,
  description,
  onRefresh,
  children,
  showNav = true,
}: AdminWorkspaceLayoutProps) {
  const pathname = window.location.pathname;

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigateToPath("/")}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Market
          </button>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Admin Workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">{title}</h1>
          {description ? <p className="mt-2 text-sm text-zinc-600 sm:text-base">{description}</p> : null}
        </section>

        {showNav ? <AdminWorkspaceNav pathname={pathname} /> : null}

        {children}
      </main>
    </div>
  );
}

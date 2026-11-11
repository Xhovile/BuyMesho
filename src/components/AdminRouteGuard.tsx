import { type ReactNode, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuthUser } from "../hooks/useAuthUser";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { PROFILE_PATH, navigateToLoginWithReturnPath, navigateToPath } from "../lib/appNavigation";

type AdminRouteGuardProps = {
  children: ReactNode;
};

export default function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { user, loading: authLoading } = useAuthUser();
  const { isAdmin, loading: adminLoading } = useIsAdmin(user);
  const loading = authLoading || adminLoading;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigateToLoginWithReturnPath(window.location.pathname + window.location.search);
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bm-bg dark:bg-bm-surface-muted text-bm-text dark:text-bm-text flex items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-bm-text-muted dark:text-bm-text-muted" />
          <span className="text-sm font-bold text-bm-text-muted dark:text-bm-text-muted">Checking access…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bm-bg dark:bg-bm-surface-muted text-bm-text dark:text-bm-text flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl border border-bm-border dark:border-bm-border bg-bm-surface p-6 shadow-sm text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-bm-text-subtle dark:text-bm-text-subtle">Admin</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">Access required</h1>
          <p className="mt-3 text-sm text-bm-text-muted dark:text-bm-text-muted">
            Your account can sign in, but it does not currently have backend admin access.
          </p>
          <button
            type="button"
            onClick={() => navigateToPath(PROFILE_PATH)}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-5 py-3 text-sm font-extrabold text-bm-on-brand hover:bg-bm-brand-hover"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

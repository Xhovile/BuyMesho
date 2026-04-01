import { type ReactNode, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuthUser } from "../hooks/useAuthUser";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { LOGIN_PATH, PROFILE_PATH, navigateToPath } from "../lib/appNavigation";

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
      navigateToPath(LOGIN_PATH);
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 text-zinc-900 flex items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
          <span className="text-sm font-bold text-zinc-700">Checking access…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-100 text-zinc-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Admin</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">Access required</h1>
          <p className="mt-3 text-sm text-zinc-600">
            Your account can sign in, but it does not currently have backend admin access.
          </p>
          <button
            type="button"
            onClick={() => navigateToPath(PROFILE_PATH)}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

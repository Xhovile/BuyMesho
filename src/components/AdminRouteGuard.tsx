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
      return;
    }

    if (!isAdmin) {
      navigateToPath(PROFILE_PATH);
    }
  }, [isAdmin, loading, user]);

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

  if (!user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}

import { useEffect } from "react";
import { LOGIN_PATH, VERIFY_EMAIL_PATH, navigateToPath } from "../lib/appNavigation";
import { useAuthUser } from "./useAuthUser";

export function useRequireVerifiedUser() {
  const { user, loading } = useAuthUser();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigateToPath(LOGIN_PATH);
      return;
    }

    if (!user.emailVerified) {
      navigateToPath(VERIFY_EMAIL_PATH);
    }
  }, [loading, user]);

  return !loading && !!user && !!user.emailVerified;
}

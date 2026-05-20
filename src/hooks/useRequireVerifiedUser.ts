import { useEffect } from "react";
import {
  VERIFY_EMAIL_PATH,
  navigateToLoginWithReturnPath,
  navigateToPath,
} from "../lib/appNavigation";
import { useAuthUser } from "./useAuthUser";

export function useRequireVerifiedUser() {
  const { user, loading } = useAuthUser();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigateToLoginWithReturnPath();
      return;
    }

    if (!user.emailVerified) {
      navigateToPath(VERIFY_EMAIL_PATH);
    }
  }, [loading, user]);

  return !loading && !!user && !!user.emailVerified;
}

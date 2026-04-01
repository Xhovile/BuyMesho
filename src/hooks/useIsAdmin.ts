import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { resolveIsAdminUser } from "../lib/adminAccess";

export function useIsAdmin(user: User | null | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadAdminState = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      const nextValue = await resolveIsAdminUser(user);
      if (!cancelled) {
        setIsAdmin(nextValue);
        setLoading(false);
      }
    };

    void loadAdminState();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isAdmin, loading };
}

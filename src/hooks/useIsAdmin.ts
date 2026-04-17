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

      let nextValue = await resolveIsAdminUser(user);

      if (!nextValue) {
        try {
          const token = await user.getIdToken();
          const response = await fetch("/api/admin/access", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const result = await response.json();
            nextValue = result?.isAdmin === true;
          } else {
            nextValue = false;
          }
        } catch {
          nextValue = false;
        }
      }

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

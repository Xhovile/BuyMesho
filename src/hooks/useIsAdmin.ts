import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { getCachedHeaderCapabilities, setCachedHeaderCapabilities } from "../lib/headerCapabilities";
import { resolveIsAdminUser } from "../lib/adminAccess";

async function resolveAdminState(user: User): Promise<boolean> {
  let nextValue = await resolveIsAdminUser(user);
  if (nextValue) return true;

  try {
    const token = await user.getIdToken(true);
    const response = await fetch("/api/admin/access", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "same-origin",
    });
    if (!response.ok) return false;
    const result = await response.json();
    nextValue = result?.isAdmin === true;
  } catch {
    nextValue = false;
  }

  return nextValue;
}

export function useIsAdmin(user: User | null | undefined) {
  const cached = user ? getCachedHeaderCapabilities(user.uid) : null;
  const [isAdmin, setIsAdmin] = useState(() => cached?.isAdmin ?? false);
  const [loading, setLoading] = useState(() => Boolean(user && !cached));

  const refresh = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const nextValue = await resolveAdminState(user);
      setIsAdmin(nextValue);
      const current = getCachedHeaderCapabilities(user.uid);
      setCachedHeaderCapabilities(user.uid, {
        isSeller: current?.isSeller ?? false,
        isAdmin: nextValue,
      });
    } catch {
      // Cached header capability remains visible when revalidation is unavailable.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const current = getCachedHeaderCapabilities(user.uid);
    if (current) {
      setIsAdmin(current.isAdmin);
      setLoading(false);
    } else {
      setLoading(true);
    }

    let cancelled = false;
    const run = async () => {
      const nextValue = await resolveAdminState(user);
      if (cancelled) return;
      setIsAdmin(nextValue);
      const latest = getCachedHeaderCapabilities(user.uid);
      setCachedHeaderCapabilities(user.uid, {
        isSeller: latest?.isSeller ?? false,
        isAdmin: nextValue,
      });
      setLoading(false);
    };

    void run().catch(() => {
      if (!cancelled) setLoading(false);
    });

    const handleFocus = () => void refresh();
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, refresh]);

  return { isAdmin, loading };
}

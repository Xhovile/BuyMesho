import { useCallback, useEffect, useState } from "react";
import { fetchAdminQueueSummary } from "./adminApi";
import type { AdminQueueSummary } from "./adminTypes";

export function useAdminWorkspaceData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AdminQueueSummary>({
    contentOpen: 0,
    messageOpen: 0,
    sellerPending: 0,
  });

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const nextSummary = await fetchAdminQueueSummary();
      setSummary(nextSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin summary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, error, summary, refresh };
}

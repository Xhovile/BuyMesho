import { apiFetch } from "../../lib/api";
import { fetchMessageReports } from "../../lib/messageModeration";
import type {
  AdminActionLog,
  AdminActionLogFilters,
  AdminActionLogPage,
  AdminContentReport,
  AdminQueueSummary,
  AdminSellerApplication,
} from "./adminTypes";

export async function fetchOpenContentReports() {
  const data = await apiFetch("/api/admin/reports?status=open");
  return (Array.isArray(data) ? data : []) as AdminContentReport[];
}

export async function fetchPendingSellerApplications() {
  const data = await apiFetch("/api/admin/seller-applications?status=pending");
  return (Array.isArray(data) ? data : []) as AdminSellerApplication[];
}

export async function fetchAdminActionLogs(filters: AdminActionLogFilters = {}) {
  const params = new URLSearchParams();

  const setIfPresent = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    params.set(key, String(value));
  };

  setIfPresent("action_type", filters.action_type);
  setIfPresent("target_type", filters.target_type);
  setIfPresent("admin", filters.admin);
  setIfPresent("from", filters.from);
  setIfPresent("to", filters.to);
  setIfPresent("q", filters.q);
  setIfPresent("limit", filters.limit);
  setIfPresent("offset", filters.offset);
  setIfPresent("cursor", filters.cursor);
  setIfPresent("cursor_id", filters.cursor_id);

  const query = params.toString();
  const path = query ? `/api/admin/actions?${query}` : "/api/admin/actions";
  const data = await apiFetch(path);
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as AdminActionLogPage).rows) &&
    typeof (data as AdminActionLogPage).total === "number"
  ) {
    return data as AdminActionLogPage;
  }

  return {
    rows: (Array.isArray(data) ? data : []) as AdminActionLog[],
    total: Array.isArray(data) ? data.length : 0,
    limit: typeof filters.limit === "number" ? filters.limit : 100,
    offset: typeof filters.offset === "number" ? filters.offset : 0,
    hasMore: false,
  } satisfies AdminActionLogPage;
}

export async function fetchAdminQueueSummary(): Promise<AdminQueueSummary> {
  try {
    const summary = await apiFetch("/api/admin/summary");
    if (
      summary &&
      typeof summary === "object" &&
      typeof (summary as Record<string, unknown>).contentOpen === "number" &&
      typeof (summary as Record<string, unknown>).messageOpen === "number" &&
      typeof (summary as Record<string, unknown>).sellerPending === "number"
    ) {
      return summary as AdminQueueSummary;
    }
  } catch {
    // fallback to existing APIs
  }

  const [contentReports, messageReports, sellerApplications] = await Promise.all([
    fetchOpenContentReports(),
    fetchMessageReports("open"),
    fetchPendingSellerApplications(),
  ]);

  return {
    contentOpen: contentReports.length,
    messageOpen: messageReports.length,
    sellerPending: sellerApplications.length,
  };
}

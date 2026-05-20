import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";
import { fetchAdminActionLogs } from "./modules/admin/adminApi";
import type { AdminActionLog } from "./modules/admin/adminTypes";
import { ADMIN_ACTION_LABELS, ADMIN_TARGET_LABELS, isAdminActionType, isAdminTargetType } from "./modules/admin/shared/adminAuditTypes";

export default function AdminAuditLogPage() {
  const PAGE_SIZE = 100;
  const initialFilters = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      action_type: params.get("action_type") ?? "",
      target_type: params.get("target_type") ?? "",
      admin: params.get("admin") ?? "",
      from: params.get("from") ?? "",
      to: params.get("to") ?? "",
      q: params.get("q") ?? "",
    };
  }, []);
  const [rows, setRows] = useState<AdminActionLog[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [total, setTotal] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const toggleRow = (rowId: number) => {
    setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const buildRequestFilters = (currentFilters = filters, nextOffset = 0) => ({
    ...currentFilters,
    action_type: currentFilters.action_type || undefined,
    target_type: currentFilters.target_type || undefined,
    admin: currentFilters.admin.trim() || undefined,
    from: currentFilters.from || undefined,
    to: currentFilters.to || undefined,
    q: currentFilters.q.trim() || undefined,
    limit: PAGE_SIZE,
    offset: nextOffset,
  });

  const load = async (currentFilters = filters) => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchAdminActionLogs(buildRequestFilters(currentFilters, 0));
      setRows(data.rows);
      setTotal(data.total);
      setOffset(data.offset);
      setHasMore(data.hasMore);
      setExpandedRows({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin actions.");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) {
      return;
    }
    setLoadingMore(true);
    setError(null);
    const nextOffset = rows.length;
    try {
      const data = await fetchAdminActionLogs(buildRequestFilters(filters, nextOffset));
      setRows((prev) => [...prev, ...data.rows]);
      setTotal(data.total);
      setOffset(data.offset);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more admin actions.");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextParams = new URLSearchParams();
    const setIfPresent = (key: keyof typeof filters) => {
      const value = filters[key];
      if (value.trim()) {
        nextParams.set(key, value.trim());
      }
    };
    setIfPresent("action_type");
    setIfPresent("target_type");
    setIfPresent("admin");
    setIfPresent("from");
    setIfPresent("to");
    setIfPresent("q");
    const nextQuery = nextParams.toString();
    if (nextQuery !== params.toString()) {
      const nextPath = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
      window.history.replaceState({}, "", nextPath);
    }

    const timeoutId = window.setTimeout(() => {
      void load(filters);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [filters]);

  const summaryKeys = ["reason", "notes", "old_value", "new_value", "report_id", "report_type", "status"];

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined) {
      return "—";
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return JSON.stringify(value, null, 2);
  };

  const orderedDetailEntries = (details: Record<string, unknown> | null) => {
    if (!details) {
      return [] as Array<[string, unknown]>;
    }

    const entries = Object.entries(details);
    const summaryEntries = summaryKeys.flatMap((key) =>
      Object.prototype.hasOwnProperty.call(details, key) ? [[key, details[key]] as [string, unknown]] : [],
    );
    const summaryKeySet = new Set(summaryEntries.map(([key]) => key));
    const metadataEntries = entries.filter(([key]) => !summaryKeySet.has(key)).sort(([a], [b]) => a.localeCompare(b));

    return [...summaryEntries, ...metadataEntries];
  };

  return (
    <AdminWorkspaceLayout
      title="Admin Audit Log"
      description="Track moderation and admin enforcement actions for accountability."
      onRefresh={() => void load()}
    >
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Action type
              <select
                value={filters.action_type}
                onChange={(event) => setFilters((prev) => ({ ...prev, action_type: event.target.value }))}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-900"
              >
                <option value="">All actions</option>
                {Object.entries(ADMIN_ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Target type
              <select
                value={filters.target_type}
                onChange={(event) => setFilters((prev) => ({ ...prev, target_type: event.target.value }))}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-900"
              >
                <option value="">All targets</option>
                {Object.entries(ADMIN_TARGET_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Admin
              <input
                value={filters.admin}
                onChange={(event) => setFilters((prev) => ({ ...prev, admin: event.target.value }))}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-900"
                placeholder="UID or email"
              />
            </label>
            <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              From
              <input
                type="date"
                value={filters.from}
                onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-900"
              />
            </label>
            <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              To
              <input
                type="date"
                value={filters.to}
                onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-900"
              />
            </label>
            <label className="flex min-w-[220px] flex-[2] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Search
              <input
                value={filters.q}
                onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-900"
                placeholder="Listing ID / seller UID / admin email"
              />
            </label>
            <button
              type="button"
              onClick={() => setFilters({ action_type: "", target_type: "", admin: "", from: "", to: "", q: "" })}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Reset filters
            </button>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-10 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">No admin actions logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {total !== null ? `Showing ${rows.length} of ${total}` : `Showing ${rows.length} results`}
            </div>
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="w-12 px-3 py-3 text-left font-black text-zinc-500">Details</th>
                  <th className="px-4 py-3 text-left font-black text-zinc-500">When</th>
                  <th className="px-4 py-3 text-left font-black text-zinc-500">Action</th>
                  <th className="px-4 py-3 text-left font-black text-zinc-500">Target</th>
                  <th className="px-4 py-3 text-left font-black text-zinc-500">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => {
                  const detailEntries = orderedDetailEntries(row.details);
                  const isExpanded = Boolean(expandedRows[row.id]);
                  return (
                    <Fragment key={row.id}>
                      <tr key={row.id}>
                        <td className="px-3 py-2 align-top">
                          {detailEntries.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleRow(row.id)}
                              className="inline-flex rounded p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
                              aria-label={isExpanded ? "Collapse details" : "Expand details"}
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-zinc-700">{new Date(row.created_at).toLocaleString()}</td>
                        <td className="px-4 py-2 font-semibold text-zinc-900">
                          {isAdminActionType(row.action_type) ? ADMIN_ACTION_LABELS[row.action_type] : row.action_type}
                        </td>
                        <td className="px-4 py-2 text-zinc-700">
                          {isAdminTargetType(row.target_type) ? ADMIN_TARGET_LABELS[row.target_type] : row.target_type}
                          {row.target_id ? `:${row.target_id}` : ""}
                        </td>
                        <td className="px-4 py-2 text-zinc-700 break-all">{row.admin_email || row.admin_uid || "—"}</td>
                      </tr>
                      {isExpanded ? (
                        <tr key={`${row.id}-details`} className="bg-zinc-50/60">
                          <td colSpan={5} className="px-4 pb-3 pt-1">
                            <dl className="grid gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                              {detailEntries.map(([key, value]) => {
                                const formatted = formatValue(value);
                                const isJson = typeof value === "object" && value !== null;
                                return (
                                  <div key={`${row.id}-${key}`} className="min-w-0">
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{key}</dt>
                                    <dd className="mt-0.5 text-xs text-zinc-800">
                                      {isJson ? (
                                        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-zinc-100 px-2 py-1 font-mono text-[11px] leading-4">
                                          {formatted}
                                        </pre>
                                      ) : (
                                        <span className="break-words">{formatted}</span>
                                      )}
                                    </dd>
                                  </div>
                                );
                              })}
                            </dl>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-center border-t border-zinc-200 px-4 py-4">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={!hasMore || loadingMore}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition enabled:hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : hasMore ? "Load more" : "All results loaded"}
              </button>
            </div>
          </div>
        )}
      </section>
    </AdminWorkspaceLayout>
  );
}

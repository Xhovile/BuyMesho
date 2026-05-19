import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";
import { fetchAdminActionLogs } from "./modules/admin/adminApi";
import type { AdminActionLog } from "./modules/admin/adminTypes";
import { ADMIN_ACTION_LABELS, ADMIN_TARGET_LABELS, isAdminActionType, isAdminTargetType } from "./modules/admin/shared/adminAuditTypes";

export default function AdminAuditLogPage() {
  const [rows, setRows] = useState<AdminActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchAdminActionLogs();
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin actions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminWorkspaceLayout
      title="Admin Audit Log"
      description="Track moderation and admin enforcement actions for accountability."
      onRefresh={() => void load()}
    >
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-10 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">No admin actions logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-black text-zinc-500">When</th>
                  <th className="px-4 py-3 text-left font-black text-zinc-500">Action</th>
                  <th className="px-4 py-3 text-left font-black text-zinc-500">Target</th>
                  <th className="px-4 py-3 text-left font-black text-zinc-500">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => {
                  const actionLabel = isAdminActionType(row.action_type) ? ADMIN_ACTION_LABELS[row.action_type] : row.action_type;
                  const targetLabel = isAdminTargetType(row.target_type) ? ADMIN_TARGET_LABELS[row.target_type] : row.target_type;

                  return (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-zinc-700">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-900" title={row.action_type}>
                      {actionLabel}
                      {actionLabel !== row.action_type ? <span className="ml-2 text-xs font-normal text-zinc-500">({row.action_type})</span> : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-700" title={row.target_type}>
                      {targetLabel}
                      {targetLabel !== row.target_type ? <span className="ml-2 text-xs text-zinc-500">({row.target_type})</span> : null}
                      {row.target_id ? `:${row.target_id}` : ""}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 break-all">{row.admin_email || row.admin_uid || "—"}</td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminWorkspaceLayout>
  );
}

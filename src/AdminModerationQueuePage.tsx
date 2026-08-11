import { AlertCircle, MessageSquareWarning, ShieldCheck } from "lucide-react";
import type { ComponentType } from "react";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";
import { navigateToAdminReports, navigateToAdminSellerApplications } from "./lib/appNavigation";
import { useAdminWorkspaceData } from "./modules/admin/useAdminWorkspaceData";

function QueueCard({
  title,
  value,
  note,
  onOpen,
  icon: Icon,
}: {
  title: string;
  value: number;
  note: string;
  onOpen: () => void;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-3xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:bg-zinc-50"
    >
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-bold text-zinc-500">{title}</p>
      <p className="mt-1 text-3xl font-black text-zinc-900">{value}</p>
      <p className="mt-2 text-sm text-zinc-600">{note}</p>
    </button>
  );
}

export default function AdminModerationQueuePage() {
  const { loading, error, summary, refresh } = useAdminWorkspaceData();

  return (
    <AdminWorkspaceLayout
      title="Moderation Queue"
      description="Review what needs attention first across content, chats, and seller onboarding."
      onRefresh={() => void refresh()}
    >
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <QueueCard
          title="Open content reports"
          value={summary.contentOpen}
          note={loading ? "Loading..." : "Listing and seller problem reports"}
          onOpen={navigateToAdminReports}
          icon={AlertCircle}
        />
        <QueueCard
          title="Open message reports"
          value={summary.messageOpen}
          note={loading ? "Loading..." : "Chat moderation reports"}
          onOpen={navigateToAdminReports}
          icon={MessageSquareWarning}
        />
        <QueueCard
          title="Pending seller applications"
          value={summary.sellerPending}
          note={loading ? "Loading..." : "Applicants waiting for approval"}
          onOpen={navigateToAdminSellerApplications}
          icon={ShieldCheck}
        />
      </section>
    </AdminWorkspaceLayout>
  );
}

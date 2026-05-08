import { ClipboardList, ShieldCheck, Webhook, ArrowLeft } from "lucide-react";
import { navigateToAdminPayments, navigateToAdminReports, navigateToAdminSellerApplications, navigateToPath } from "./lib/appNavigation";
import AdminRouteGuard from "./components/AdminRouteGuard";
import type { ElementType } from "react";

function AdminCard({
  title,
  description,
  icon: Icon,
  onClick,
  tone = "zinc",
}: {
  title: string;
  description: string;
  icon: ElementType;
  onClick: () => void;
  tone?: "zinc" | "emerald" | "amber" | "blue";
}) {
  const toneClasses: Record<typeof tone, string> = {
    zinc: "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
    emerald: "border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/60",
    amber: "border-amber-200 hover:border-amber-300 hover:bg-amber-50/60",
    blue: "border-blue-200 hover:border-blue-300 hover:bg-blue-50/60",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[2rem] border bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${toneClasses[tone]}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-lg font-black tracking-tight text-zinc-900">{title}</p>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>
      </div>
    </button>
  );
}

function AdminHubContent() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <button
            type="button"
            onClick={() => navigateToPath("/")}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Market
          </button>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-bold text-zinc-700">
            Admin Access
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            BuyMesho control room
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">
            This is the central admin entry point. Use it to manage reports, seller approvals, and payment monitoring.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <AdminCard
            title="Reports"
            description="Review and manage user reports."
            icon={ClipboardList}
            tone="blue"
            onClick={() => navigateToAdminReports()}
          />
          <AdminCard
            title="Seller Approvals"
            description="Approve or reject seller applications."
            icon={ShieldCheck}
            tone="emerald"
            onClick={() => navigateToAdminSellerApplications()}
          />
          <AdminCard
            title="Payments & Webhooks"
            description="Monitor payment status, webhook delivery, and escrow state."
            icon={Webhook}
            tone="amber"
            onClick={() => navigateToAdminPayments()}
          />
        </section>
      </main>
    </div>
  );
}

export default function AdminHubPage() {
  return (
    <AdminRouteGuard>
      <AdminHubContent />
    </AdminRouteGuard>
  );
}

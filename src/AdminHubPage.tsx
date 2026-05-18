import { ArrowLeft, ClipboardList, ShieldCheck, Webhook, Wallet } from "lucide-react";
import { navigateToAdminPayments, navigateToAdminPayouts, navigateToAdminReports, navigateToAdminSellerApplications, navigateToPath } from "./lib/appNavigation";
import AdminRouteGuard from "./components/AdminRouteGuard";

function AdminHubButton({
  title,
  icon: Icon,
  onClick,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[4.5rem] items-center gap-3 bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-black tracking-tight text-zinc-900 sm:text-[15px]">{title}</p>
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

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <section className="px-1">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">BuyMesho control room</h1>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">
            Use this hub to access reports, seller approvals, payments monitoring, and seller payouts.
          </p>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-200 p-px shadow-sm">
          <div className="grid gap-px bg-zinc-200 md:grid-cols-3">
            <AdminHubButton title="Reports" icon={ClipboardList} onClick={() => navigateToAdminReports()} />
            <AdminHubButton title="Seller Approvals" icon={ShieldCheck} onClick={() => navigateToAdminSellerApplications()} />
            <AdminHubButton title="Payments & Webhooks" icon={Webhook} onClick={() => navigateToAdminPayments()} />
          </div>
          <div className="mt-px bg-zinc-200">
            <AdminHubButton title="Payouts" icon={Wallet} onClick={() => navigateToAdminPayouts()} />
          </div>
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

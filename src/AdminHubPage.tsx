import { ClipboardList, ListChecks, ShieldCheck, Webhook, Wallet, Wrench } from "lucide-react";
import {
  navigateToAdminModerationQueue,
  navigateToAdminPayments,
  navigateToAdminPayouts,
  navigateToAdminReports,
  navigateToAdminSellerApplications,
  navigateToAdminSetup,
} from "./lib/appNavigation";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";

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

export default function AdminHubPage() {
  return (
    <AdminWorkspaceLayout
      title="BuyMesho control room"
      description="Use one workspace for moderation, onboarding approvals, payments, payouts, and setup."
    >
      <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-200 p-px shadow-sm">
        <div className="grid gap-px bg-zinc-200 md:grid-cols-3">
          <AdminHubButton title="Moderation Queue" icon={ListChecks} onClick={() => navigateToAdminModerationQueue()} />
          <AdminHubButton title="Reports" icon={ClipboardList} onClick={() => navigateToAdminReports()} />
          <AdminHubButton title="Seller Approvals" icon={ShieldCheck} onClick={() => navigateToAdminSellerApplications()} />
        </div>
        <div className="mt-px grid gap-px bg-zinc-200 md:grid-cols-3">
          <AdminHubButton title="Payments & Webhooks" icon={Webhook} onClick={() => navigateToAdminPayments()} />
          <AdminHubButton title="Payouts" icon={Wallet} onClick={() => navigateToAdminPayouts()} />
          <AdminHubButton title="Admin Setup" icon={Wrench} onClick={() => navigateToAdminSetup()} />
        </div>
      </section>
    </AdminWorkspaceLayout>
  );
}

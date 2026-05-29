import { ClipboardList, ShieldCheck, Webhook } from "lucide-react";
import type { ComponentType, MouseEvent } from "react";
import {
  ADMIN_MODERATION_QUEUE_PATH,
  ADMIN_PAYMENTS_PATH,
  ADMIN_PAYOUT_DESTINATIONS_PATH,
  ADMIN_REPORTS_PATH,
  ADMIN_SELLER_APPLICATIONS_PATH,
  navigateToAdminModerationQueue,
  navigateToAdminPayments,
  navigateToAdminPayoutDestinations,
  navigateToAdminReports,
  navigateToAdminSellerApplications,
  navigateToPath,
} from "./lib/appNavigation";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";

function AdminOverviewCard({
  title,
  description,
  icon: Icon,
  path,
  onClick,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  path: string;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a
      href={path}
      onClick={onClick}
      className="group flex h-full flex-col gap-4 rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800 transition-colors group-hover:bg-zinc-900 group-hover:text-white">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
          Open page
        </span>
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-black tracking-tight text-zinc-900">{title}</h2>
        <p className="text-sm leading-6 text-zinc-600">{description}</p>
      </div>
    </a>
  );
}

export default function AdminHubPage() {
  return (
    <AdminWorkspaceLayout
      title="Admin Overview"
      description="This screen is only a launch point. Each admin function should open its own page, while the shared nav stays on the workspace pages only."
      showNav={false}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminOverviewCard
          title="Moderation Queue"
          description="Review flagged listings and urgent moderation work."
          icon={ClipboardList}
          path={ADMIN_MODERATION_QUEUE_PATH}
          onClick={(event) => {
            event.preventDefault();
            navigateToAdminModerationQueue();
          }}
        />
        <AdminOverviewCard
          title="Reports"
          description="Handle user reports and compliance issues."
          icon={ClipboardList}
          path={ADMIN_REPORTS_PATH}
          onClick={(event) => {
            event.preventDefault();
            navigateToAdminReports();
          }}
        />
        <AdminOverviewCard
          title="Seller Approvals"
          description="Approve or reject seller onboarding requests."
          icon={ShieldCheck}
          path={ADMIN_SELLER_APPLICATIONS_PATH}
          onClick={(event) => {
            event.preventDefault();
            navigateToAdminSellerApplications();
          }}
        />
        <AdminOverviewCard
          title="Payments & Webhooks"
          description="Inspect payment events and webhook activity."
          icon={Webhook}
          path={ADMIN_PAYMENTS_PATH}
          onClick={(event) => {
            event.preventDefault();
            navigateToAdminPayments();
          }}
        />
        <AdminOverviewCard
          title="Payout Destination Review"
          description="Approve pending seller payout destinations before payouts are released to PayChangu."
          icon={ShieldCheck}
          path={ADMIN_PAYOUT_DESTINATIONS_PATH}
          onClick={(event) => {
            event.preventDefault();
            navigateToAdminPayoutDestinations();
          }}
        />
      </section>

      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">Navigation rule</p>
        <h2 className="mt-2 text-lg font-black tracking-tight text-zinc-900">No duplicated button wall here</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          The overview should summarize the control room and send operators into separate work pages.
          The shared admin nav belongs on the workspace pages, not repeated inside the hub.
        </p>
        <button
          type="button"
          onClick={() => navigateToPath(ADMIN_MODERATION_QUEUE_PATH)}
          className="mt-4 inline-flex items-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
        >
          Open Moderation Queue
        </button>
      </section>
    </AdminWorkspaceLayout>
  );
}

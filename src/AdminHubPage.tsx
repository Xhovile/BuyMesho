import { AlertTriangle, CalendarDays, ClipboardList, CreditCard, MessageSquareText, RefreshCw, ShieldCheck, Webhook } from "lucide-react";
import type { ComponentType, MouseEvent } from "react";
import {
  ADMIN_DISPUTES_PATH,
  ADMIN_EVENT_PAYOUT_RECOVERY_PATH,
  ADMIN_EVENTS_PATH,
  ADMIN_MESSAGES_PATH,
  ADMIN_MODERATION_QUEUE_PATH,
  ADMIN_PAYMENTS_PATH,
  ADMIN_REPORTS_PATH,
  ADMIN_SELLER_APPLICATIONS_PATH,
  ADMIN_TRANSACTION_INSPECTOR_PATH,
  navigateToAdminEvents,
  navigateToAdminModerationQueue,
  navigateToAdminPayments,
  navigateToAdminTransactionInspector,
  navigateToAdminReports,
  navigateToAdminSellerApplications,
  navigateToPath,
} from "./lib/appNavigation";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";

function AdminOverviewCard({ title, description, icon: Icon, path, onClick }: { title: string; description: string; icon: ComponentType<{ className?: string }>; path: string; onClick: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  return <a href={path} onClick={onClick} className="group flex h-full flex-col gap-4 rounded-[1.75rem] border border-bm-border dark:border-bm-border bg-bm-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-bm-border hover:shadow-md"><div className="flex items-start justify-between gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text dark:text-bm-text-muted transition-colors group-hover:bg-bm-brand group-hover:text-bm-on-brand"><Icon className="h-5 w-5" /></div><span className="rounded-full bg-bm-surface-muted dark:bg-bm-surface-muted px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-bm-text-subtle dark:text-bm-text-subtle">Open page</span></div><div className="space-y-1"><h2 className="text-base font-black tracking-tight text-bm-text dark:text-bm-text">{title}</h2><p className="text-sm leading-6 text-bm-text-muted dark:text-bm-text-muted">{description}</p></div></a>;
}

export default function AdminHubPage() {
  return <AdminWorkspaceLayout title="Admin Overview" description="This screen is only a launch point. Each admin function should open its own page, while the shared nav stays on the workspace pages only." showNav={false}>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <AdminOverviewCard title="Moderation Queue" description="Review flagged listings and urgent moderation work." icon={ClipboardList} path={ADMIN_MODERATION_QUEUE_PATH} onClick={(event) => { event.preventDefault(); navigateToAdminModerationQueue(); }} />
      <AdminOverviewCard title="Reports" description="Handle user reports and compliance issues." icon={ClipboardList} path={ADMIN_REPORTS_PATH} onClick={(event) => { event.preventDefault(); navigateToAdminReports(); }} />
      <AdminOverviewCard title="Messages" description="Monitor marketplace conversations and moderation states." icon={MessageSquareText} path={ADMIN_MESSAGES_PATH} onClick={(event) => { event.preventDefault(); navigateToPath(ADMIN_MESSAGES_PATH); }} />
      <AdminOverviewCard title="Disputes" description="Review returns, refunds, seller-reported refunds, and buyer claims in one workspace." icon={AlertTriangle} path={ADMIN_DISPUTES_PATH} onClick={(event) => { event.preventDefault(); navigateToPath(ADMIN_DISPUTES_PATH); }} />
      <AdminOverviewCard title="Seller Approvals" description="Approve or reject seller onboarding requests." icon={ShieldCheck} path={ADMIN_SELLER_APPLICATIONS_PATH} onClick={(event) => { event.preventDefault(); navigateToAdminSellerApplications(); }} />
      <AdminOverviewCard title="Event Moderation" description="Review event creators, posted events, and moderation activity." icon={CalendarDays} path={ADMIN_EVENTS_PATH} onClick={(event) => { event.preventDefault(); navigateToAdminEvents(); }} />
      <AdminOverviewCard title="Payments & Webhooks" description="Inspect payment events and webhook activity." icon={Webhook} path={ADMIN_PAYMENTS_PATH} onClick={(event) => { event.preventDefault(); navigateToAdminPayments(); }} />
      <AdminOverviewCard title="Transaction Inspector" description="Deep-dive into payouts, reconciliation, and seller payout history." icon={CreditCard} path={ADMIN_TRANSACTION_INSPECTOR_PATH} onClick={(event) => { event.preventDefault(); navigateToAdminTransactionInspector(); }} />
      <AdminOverviewCard title="Event Financials" description="Review event payments, creator payouts, refunds, and financial recovery." icon={RefreshCw} path={ADMIN_EVENT_PAYOUT_RECOVERY_PATH} onClick={(event) => { event.preventDefault(); navigateToPath(ADMIN_EVENT_PAYOUT_RECOVERY_PATH); }} />
    </section>
    <section className="rounded-[1.75rem] border border-bm-border dark:border-bm-border bg-bm-surface p-5 shadow-sm"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-bm-text-subtle">Navigation rule</p><h2 className="mt-2 text-lg font-black tracking-tight text-bm-text dark:text-bm-text">No duplicated button wall here</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-bm-text-muted dark:text-bm-text-muted">The overview should summarize the control room and send operators into separate work pages. The shared admin nav belongs on the workspace pages, not repeated inside the hub.</p><button type="button" onClick={() => navigateToPath(ADMIN_EVENTS_PATH)} className="mt-4 inline-flex items-center rounded-2xl bg-bm-brand px-4 py-2.5 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover">Open Event Moderation</button></section>
  </AdminWorkspaceLayout>;
}

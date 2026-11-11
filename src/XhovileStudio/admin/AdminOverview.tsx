import {
  Bell,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FolderKanban,
  Users,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { formatMoney, type StudioAdminPayment } from "../config";
import type { AdminSummary } from "./types";

function formatDate(value: string | null | undefined, includeTime = true) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-MW", {
    dateStyle: "medium",
    timeStyle: includeTime ? "short" : undefined,
  }).format(date);
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-bm-border bg-bm-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-bm-text-subtle">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-bm-text">{value}</p>
          {helper ? <p className="mt-1 text-xs text-bm-text-subtle">{helper}</p> : null}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-bm-surface-muted text-bm-text-muted">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  eyebrow,
  children,
  action,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-bm-border bg-bm-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.2em] text-bm-text-subtle">{eyebrow}</p> : null}
          <h2 className="mt-1 text-xl font-black tracking-tight text-bm-text">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-bm-border bg-bm-surface-subtle px-5 py-10 text-center text-sm text-bm-text-subtle">
      {label}
    </div>
  );
}

function statusClasses(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid" || normalized === "processed" || normalized === "sent") {
    return "border-bm-success/25 bg-bm-success-bg text-bm-success";
  }
  if (normalized === "pending" || normalized === "received" || normalized === "sending") {
    return "border-bm-warning/25 bg-bm-warning-bg text-bm-warning";
  }
  if (normalized === "failed" || normalized === "refunded") {
    return "border-bm-danger/25 bg-bm-danger-bg text-bm-danger";
  }
  return "border-bm-border bg-bm-surface-muted text-bm-text-muted";
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] " + statusClasses(value)}>
      {value}
    </span>
  );
}

export default function AdminOverview({
  summary,
  payments,
  onSelectPayment,
}: {
  summary: AdminSummary;
  payments: StudioAdminPayment[];
  onSelectPayment: (paymentId: string) => void;
}) {
  return (
    <>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={CircleDollarSign} label="Paid revenue" value={formatMoney(summary.paidRevenue)} helper="Confirmed Studio payments" />
        <StatCard icon={CheckCircle2} label="Paid payments" value={summary.paidPayments.toLocaleString()} helper={summary.todayPaidPayments.toLocaleString() + " paid today"} />
        <StatCard icon={Clock3} label="Pending" value={summary.pendingPayments.toLocaleString()} helper="Still awaiting confirmation" />
        <StatCard icon={XCircle} label="Failed" value={summary.failedPayments.toLocaleString()} helper="Failed or declined checkouts" />
        <StatCard icon={CreditCard} label="Refunded" value={summary.refundedPayments.toLocaleString()} helper="Recorded refunded payments" />
        <StatCard icon={Users} label="Customers" value={summary.customerCount.toLocaleString()} helper="Unique phone numbers" />
        <StatCard icon={FolderKanban} label="Projects" value={summary.projectCount.toLocaleString()} helper="Referenced Studio projects" />
        <StatCard icon={Bell} label="Email issues" value={(summary.notificationPending + summary.notificationFailed).toLocaleString()} helper={summary.notificationFailed.toLocaleString() + " failed delivery records"} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <SectionCard title="Recent payments" eyebrow="Live activity" action={<span className="text-[10px] font-black uppercase tracking-[0.16em] text-bm-text-subtle">Latest 250 records</span>}>
          {payments.length ? (
            <div className="overflow-hidden rounded-2xl border border-bm-border">
              <div className="hidden grid-cols-[minmax(150px,1.15fr)_minmax(140px,1fr)_auto_auto] gap-4 bg-bm-surface-subtle px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle sm:grid sm:grid-cols-[minmax(170px,1.1fr)_minmax(200px,1fr)_auto_auto]">
                <span>Customer</span>
                <span>Service / Project</span>
                <span className="text-right">Amount / Time</span>
                <span className="text-right">Status</span>
              </div>
              {payments.slice(0, 10).map((payment) => (
                <button
                  key={payment.id}
                  type="button"
                  onClick={() => onSelectPayment(String(payment.id))}
                  className="grid w-full grid-cols-[minmax(150px,1.15fr)_minmax(140px,1fr)_auto_auto] gap-4 border-b border-bm-border-subtle px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-bm-surface-subtle sm:grid-cols-[minmax(170px,1.1fr)_minmax(200px,1fr)_auto_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-bm-text">{payment.customerName}</p>
                    <p className="mt-0.5 truncate text-xs text-bm-text-subtle">{payment.customerPhone}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-bm-text">{payment.serviceType}</p>
                    <p className="mt-0.5 truncate text-[11px] text-bm-text-subtle">{payment.projectReference || "No project reference"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-bm-text">{formatMoney(payment.amount, payment.currency)}</p>
                    <p className="mt-0.5 text-[10px] text-bm-text-subtle">{formatDate(payment.createdAt)}</p>
                  </div>
                  <div className="flex items-center justify-end">
                    <StatusPill value={payment.status} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState label="No Studio payments have been recorded yet." />
          )}
        </SectionCard>

        <SectionCard title="Attention" eyebrow="Operational signals">
          <div className="space-y-3">
            <div className="rounded-2xl border border-bm-warning/25 bg-bm-warning-bg p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-warning">Pending payments</p>
              <p className="mt-1 text-2xl font-black text-bm-warning">{summary.pendingPayments}</p>
              <p className="mt-1 text-xs leading-5 text-bm-warning">Payments that have not yet reached a confirmed paid state.</p>
            </div>
            <div className="rounded-2xl border border-bm-danger/25 bg-bm-danger-bg p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-danger">Failed notifications</p>
              <p className="mt-1 text-2xl font-black text-bm-danger">{summary.notificationFailed}</p>
              <p className="mt-1 text-xs leading-5 text-bm-danger">Successful payments whose internal notification email needs attention.</p>
            </div>
            <div className="rounded-2xl border border-bm-border bg-bm-surface-subtle p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">Webhook failures</p>
              <p className="mt-1 text-2xl font-black text-bm-text">{summary.webhookFailed}</p>
              <p className="mt-1 text-xs leading-5 text-bm-text-muted">PayChangu webhook events recorded as failed.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Today" eyebrow="Confirmed payment activity">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-bm-border bg-bm-surface-subtle p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">Paid today</p>
            <p className="mt-2 text-2xl font-black text-bm-text">{summary.todayPaidPayments}</p>
          </div>
          <div className="rounded-2xl border border-bm-border bg-bm-surface-subtle p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">Revenue today</p>
            <p className="mt-2 text-2xl font-black text-bm-text">{formatMoney(summary.todayPaidRevenue)}</p>
          </div>
          <div className="rounded-2xl border border-bm-border bg-bm-surface-subtle p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">Last payment activity</p>
            <p className="mt-2 text-sm font-black text-bm-text">{formatDate(summary.lastPaymentAt)}</p>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

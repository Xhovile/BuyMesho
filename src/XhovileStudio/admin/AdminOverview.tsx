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
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-zinc-950">{value}</p>
          {helper ? <p className="mt-1 text-xs text-zinc-500">{helper}</p> : null}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
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
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</p> : null}
          <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-10 text-center text-sm text-zinc-500">
      {label}
    </div>
  );
}

function statusClasses(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid" || normalized === "processed" || normalized === "sent") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "pending" || normalized === "received" || normalized === "sending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (normalized === "failed" || normalized === "refunded") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
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
        <SectionCard title="Recent payments" eyebrow="Live activity" action={<span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Latest 250 records</span>}>
          {payments.length ? (
            <div className="overflow-hidden rounded-2xl border border-zinc-200">
              <div className="hidden grid-cols-[minmax(150px,1.15fr)_minmax(140px,1fr)_auto_auto] gap-4 bg-zinc-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400 sm:grid sm:grid-cols-[minmax(170px,1.1fr)_minmax(200px,1fr)_auto_auto]">
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
                  className="grid w-full grid-cols-[minmax(150px,1.15fr)_minmax(140px,1fr)_auto_auto] gap-4 border-b border-zinc-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-zinc-50 sm:grid-cols-[minmax(170px,1.1fr)_minmax(200px,1fr)_auto_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-zinc-900">{payment.customerName}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">{payment.customerPhone}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-zinc-800">{payment.serviceType}</p>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">{payment.projectReference || "No project reference"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-zinc-950">{formatMoney(payment.amount, payment.currency)}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">{formatDate(payment.createdAt)}</p>
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
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Pending payments</p>
              <p className="mt-1 text-2xl font-black text-amber-900">{summary.pendingPayments}</p>
              <p className="mt-1 text-xs leading-5 text-amber-800">Payments that have not yet reached a confirmed paid state.</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-700">Failed notifications</p>
              <p className="mt-1 text-2xl font-black text-red-900">{summary.notificationFailed}</p>
              <p className="mt-1 text-xs leading-5 text-red-800">Successful payments whose internal notification email needs attention.</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Webhook failures</p>
              <p className="mt-1 text-2xl font-black text-zinc-900">{summary.webhookFailed}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-600">PayChangu webhook events recorded as failed.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Today" eyebrow="Confirmed payment activity">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Paid today</p>
            <p className="mt-2 text-2xl font-black text-zinc-950">{summary.todayPaidPayments}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Revenue today</p>
            <p className="mt-2 text-2xl font-black text-zinc-950">{formatMoney(summary.todayPaidRevenue)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Last payment activity</p>
            <p className="mt-2 text-sm font-black text-zinc-950">{formatDate(summary.lastPaymentAt)}</p>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

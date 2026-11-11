import { type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { formatMoney, SERVICE_LABELS, type StudioAdminPayment } from "../config";

export function formatDate(value: string | null | undefined, includeTime = true) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-MW", {
    dateStyle: "medium",
    timeStyle: includeTime ? "short" : undefined,
  }).format(date);
}

export function statusClasses(status: string) {
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

export function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] " +
        statusClasses(value)
      }
    >
      {value}
    </span>
  );
}

export function StatCard({
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

export function SectionCard({
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

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-bm-border bg-bm-surface-subtle px-5 py-10 text-center text-sm text-bm-text-subtle">
      {label}
    </div>
  );
}

export function PaymentRow({
  payment,
  onSelect,
}: {
  payment: StudioAdminPayment;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="grid w-full grid-cols-[minmax(150px,1.15fr)_minmax(140px,1fr)_auto_auto] gap-4 border-b border-bm-border-subtle px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-bm-surface-subtle sm:grid-cols-[minmax(170px,1.1fr)_minmax(200px,1fr)_auto_auto]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-bm-text">{payment.customerName}</p>
        <p className="mt-0.5 truncate text-xs text-bm-text-subtle">{payment.customerPhone}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-bm-text">{SERVICE_LABELS[payment.serviceType]}</p>
        <p className="mt-0.5 truncate text-[11px] text-bm-text-subtle">
          {payment.projectReference || "No project reference"}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-black text-bm-text">{formatMoney(payment.amount, payment.currency)}</p>
        <p className="mt-0.5 text-[10px] text-bm-text-subtle">{formatDate(payment.createdAt)}</p>
      </div>
      <div className="flex items-center justify-end">
        <StatusPill value={payment.status} />
      </div>
    </button>
  );
}

export function DetailField({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-bm-border bg-bm-surface-subtle px-3.5 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">{label}</p>
      <p className={(mono ? "font-mono text-[11px] " : "text-sm ") + "mt-1 break-words font-bold text-bm-text"}>{value}</p>
    </div>
  );
}


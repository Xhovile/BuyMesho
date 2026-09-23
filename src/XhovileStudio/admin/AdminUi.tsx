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

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-10 text-center text-sm text-zinc-500">
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
      className="grid w-full grid-cols-[minmax(150px,1.15fr)_minmax(140px,1fr)_auto_auto] gap-4 border-b border-zinc-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-zinc-50 sm:grid-cols-[minmax(170px,1.1fr)_minmax(200px,1fr)_auto_auto]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-zinc-900">{payment.customerName}</p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">{payment.customerPhone}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-zinc-800">{SERVICE_LABELS[payment.serviceType]}</p>
        <p className="mt-0.5 truncate text-[11px] text-zinc-500">
          {payment.projectReference || "No project reference"}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-black text-zinc-950">{formatMoney(payment.amount, payment.currency)}</p>
        <p className="mt-0.5 text-[10px] text-zinc-400">{formatDate(payment.createdAt)}</p>
      </div>
      <div className="flex items-center justify-end">
        <StatusPill value={payment.status} />
      </div>
    </button>
  );
}

export function DetailField({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <p className={(mono ? "font-mono text-[11px] " : "text-sm ") + "mt-1 break-words font-bold text-zinc-900"}>{value}</p>
    </div>
  );
}


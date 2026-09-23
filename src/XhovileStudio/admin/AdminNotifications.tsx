import type { ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import type { StudioAdminPayment } from "../config";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-MW", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusClasses(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid" || normalized === "processed" || normalized === "sent") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "pending" || normalized === "received" || normalized === "sending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalized === "failed" || normalized === "refunded") return "border-red-200 bg-red-50 text-red-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function StatusPill({ value }: { value: string }) {
  return <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] " + statusClasses(value)}>{value}</span>;
}

function SectionCard({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>{eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</p> : null}<h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">{title}</h2></div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function AdminNotifications({
  notifications,
  recipient,
  onSelectPayment,
}: {
  notifications: StudioAdminPayment[];
  recipient: string;
  onSelectPayment: (paymentId: string) => void;
}) {
  return (
    <SectionCard title="Notifications" eyebrow="Internal payment email delivery" action={<span className="text-xs text-zinc-400">Recipient: {recipient}</span>}>
      {notifications.length ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-200">
          {notifications.map((payment) => (
            <button key={payment.id} type="button" onClick={() => onSelectPayment(String(payment.id))} className="grid w-full gap-3 border-b border-zinc-100 px-4 py-3 text-left last:border-b-0 hover:bg-zinc-50 sm:grid-cols-[minmax(180px,1fr)_auto_minmax(150px,0.8fr)] sm:items-center">
              <div><p className="text-sm font-black text-zinc-900">{payment.customerName}</p><p className="mt-0.5 text-xs text-zinc-500">{payment.paymentReference || payment.id}</p></div>
              <StatusPill value={payment.successNotificationStatus} />
              <div className="text-xs text-zinc-500"><p>{formatDate(payment.updatedAt)}</p>{payment.successNotificationError ? <p className="mt-1 truncate text-red-600">{payment.successNotificationError}</p> : null}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <BadgeCheck className="h-5 w-5 text-emerald-600" />
            <div><p className="font-black text-emerald-900">No notification issues in the latest records.</p><p className="mt-1 text-sm text-emerald-800">Successful Studio payments with unsent, sending, or failed internal notifications would appear here.</p></div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

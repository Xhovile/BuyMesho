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
  if (normalized === "paid" || normalized === "processed" || normalized === "sent") return "border-bm-success/25 bg-bm-success-bg text-bm-success";
  if (normalized === "pending" || normalized === "received" || normalized === "sending") return "border-bm-warning/25 bg-bm-warning-bg text-bm-warning";
  if (normalized === "failed" || normalized === "refunded") return "border-bm-danger/25 bg-bm-danger-bg text-bm-danger";
  return "border-bm-border bg-bm-surface-muted text-bm-text-muted";
}

function StatusPill({ value }: { value: string }) {
  return <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] " + statusClasses(value)}>{value}</span>;
}

function SectionCard({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-bm-border bg-bm-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>{eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.2em] text-bm-text-subtle">{eyebrow}</p> : null}<h2 className="mt-1 text-xl font-black tracking-tight text-bm-text">{title}</h2></div>
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
    <SectionCard title="Notifications" eyebrow="Internal payment email delivery" action={<span className="text-xs text-bm-text-subtle">Recipient: {recipient}</span>}>
      {notifications.length ? (
        <div className="overflow-hidden rounded-2xl border border-bm-border">
          {notifications.map((payment) => (
            <button key={payment.id} type="button" onClick={() => onSelectPayment(String(payment.id))} className="grid w-full gap-3 border-b border-bm-border-subtle px-4 py-3 text-left last:border-b-0 hover:bg-bm-surface-subtle sm:grid-cols-[minmax(180px,1fr)_auto_minmax(150px,0.8fr)] sm:items-center">
              <div><p className="text-sm font-black text-bm-text">{payment.customerName}</p><p className="mt-0.5 text-xs text-bm-text-subtle">{payment.paymentReference || payment.id}</p></div>
              <StatusPill value={payment.successNotificationStatus} />
              <div className="text-xs text-bm-text-subtle"><p>{formatDate(payment.updatedAt)}</p>{payment.successNotificationError ? <p className="mt-1 truncate text-bm-danger">{payment.successNotificationError}</p> : null}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-bm-success/25 bg-bm-success-bg p-5">
          <div className="flex items-start gap-3">
            <BadgeCheck className="h-5 w-5 text-bm-success" />
            <div><p className="font-black text-bm-success">No notification issues in the latest records.</p><p className="mt-1 text-sm text-bm-success">Successful Studio payments with unsent, sending, or failed internal notifications would appear here.</p></div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

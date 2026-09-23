import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { SERVICE_LABELS, formatMoney, type PaymentStatus, type StudioAdminPayment } from "../config";

function formatDate(value: string | null | undefined, includeTime = true) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-MW", { dateStyle: "medium", timeStyle: includeTime ? "short" : undefined }).format(date);
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

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-10 text-center text-sm text-zinc-500">{label}</div>;
}

function DetailField({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">{label}</p><p className={(mono ? "font-mono text-[11px] " : "text-sm ") + "mt-1 break-words font-bold text-zinc-900"}>{value}</p></div>;
}

function PaymentRow({ payment, onSelect }: { payment: StudioAdminPayment; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} className="grid w-full grid-cols-[minmax(150px,1.15fr)_minmax(140px,1fr)_auto_auto] gap-4 border-b border-zinc-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-zinc-50 sm:grid-cols-[minmax(170px,1.1fr)_minmax(200px,1fr)_auto_auto]">
    <div className="min-w-0"><p className="truncate text-sm font-black text-zinc-900">{payment.customerName}</p><p className="mt-0.5 truncate text-xs text-zinc-500">{payment.customerPhone}</p></div>
    <div className="min-w-0"><p className="truncate text-xs font-bold text-zinc-800">{SERVICE_LABELS[payment.serviceType]}</p><p className="mt-0.5 truncate text-[11px] text-zinc-500">{payment.projectReference || "No project reference"}</p></div>
    <div className="text-right"><p className="text-sm font-black text-zinc-950">{formatMoney(payment.amount, payment.currency)}</p><p className="mt-0.5 text-[10px] text-zinc-400">{formatDate(payment.createdAt)}</p></div>
    <div className="flex items-center justify-end"><StatusPill value={payment.status} /></div>
  </button>;
}

export default function AdminPayments({
  payments,
  focusPaymentId = null,
  onFocusConsumed,
}: {
  payments: StudioAdminPayment[];
  focusPaymentId?: string | null;
  onFocusConsumed?: () => void;
}) {
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"all" | PaymentStatus>("all");
  const [paymentQuery, setPaymentQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<StudioAdminPayment | null>(null);

  useEffect(() => {
    if (!focusPaymentId) return;
    const payment = payments.find((item) => String(item.id) === String(focusPaymentId) || item.paymentReference === focusPaymentId);
    if (payment) {
      setSelectedPayment(payment);
      onFocusConsumed?.();
    }
  }, [focusPaymentId, onFocusConsumed, payments]);

  useEffect(() => {
    if (!selectedPayment) return;

    const refreshedPayment = payments.find((item) => item.id === selectedPayment.id);
    if (!refreshedPayment) {
      setSelectedPayment(null);
      return;
    }

    if (refreshedPayment !== selectedPayment) {
      setSelectedPayment(refreshedPayment);
    }
  }, [payments, selectedPayment]);

  const filteredPayments = useMemo(() => {
    const q = paymentQuery.trim().toLowerCase();
    return payments.filter((payment) => {
      if (paymentStatusFilter !== "all" && payment.status !== paymentStatusFilter) return false;
      if (!q) return true;
      return [payment.customerName, payment.customerPhone, payment.customerEmail || "", payment.description, payment.projectReference || "", payment.paymentReference || "", payment.providerReference || ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [paymentQuery, paymentStatusFilter, payments]);

  return (
    <div className="space-y-6">
      <SectionCard title="Payments" eyebrow="Studio payment ledger">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input value={paymentQuery} onChange={(event) => setPaymentQuery(event.target.value)} className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm text-zinc-900 outline-none focus:border-zinc-400" placeholder="Search customer, phone, email, reference, or description" /></div>
          <div className="flex flex-wrap gap-2">{(["all", "paid", "pending", "failed", "refunded"] as const).map(status => <button key={status} type="button" onClick={() => setPaymentStatusFilter(status)} className={"rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-[0.12em] " + (paymentStatusFilter === status ? "bg-zinc-950 text-white" : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50")}>{status}</button>)}</div>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">{filteredPayments.length ? filteredPayments.map(payment => <PaymentRow key={payment.id} payment={payment} onSelect={() => setSelectedPayment(payment)} />) : <EmptyState label="No payments match the current filters." />}</div>
        <p className="mt-3 text-[11px] text-zinc-400">Showing up to the latest 250 records from the Studio database.</p>
      </SectionCard>

      {selectedPayment ? (
        <SectionCard title="Payment details" eyebrow="Selected record" action={<button type="button" onClick={() => setSelectedPayment(null)} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-600 hover:bg-zinc-50">Close</button>}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailField label="Customer" value={selectedPayment.customerName} /><DetailField label="Phone" value={selectedPayment.customerPhone} /><DetailField label="Email" value={selectedPayment.customerEmail || "Not provided"} /><DetailField label="Status" value={<StatusPill value={selectedPayment.status} />} />
            <DetailField label="Service" value={SERVICE_LABELS[selectedPayment.serviceType]} /><DetailField label="Payment mode" value={selectedPayment.paymentMode || "—"} /><DetailField label="Amount" value={formatMoney(selectedPayment.amount, selectedPayment.currency)} /><DetailField label="Project total" value={selectedPayment.projectTotal === null ? "—" : formatMoney(selectedPayment.projectTotal, selectedPayment.currency)} />
            <DetailField label="Project reference" value={selectedPayment.projectReference || "—"} mono /><DetailField label="Studio reference" value={selectedPayment.paymentReference || "—"} mono /><DetailField label="PayChangu reference" value={selectedPayment.providerReference || "—"} mono /><DetailField label="Created" value={formatDate(selectedPayment.createdAt)} /><DetailField label="Paid at" value={formatDate(selectedPayment.paidAt)} /><DetailField label="Email notification" value={<StatusPill value={selectedPayment.successNotificationStatus} />} />
          </div>
          <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Customer brief</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{selectedPayment.description}</p></div>
          {selectedPayment.referenceMedia.length ? <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">References</p><p className="mt-1 text-xs text-zinc-500">{selectedPayment.referenceMedia.length} file{selectedPayment.referenceMedia.length === 1 ? "" : "s"} attached by the customer.</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{selectedPayment.referenceMedia.map((media,index)=><a key={media.url+"-"+index} href={media.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-zinc-200 bg-white">{media.kind === "image" ? <img src={media.url} alt={media.originalName || "Reference"} className="aspect-square w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" /> : <video src={media.url} controls preload="metadata" className="aspect-square w-full bg-black object-cover" />}<div className="border-t border-zinc-100 px-2.5 py-2"><p className="truncate text-[10px] font-bold text-zinc-800">{media.originalName}</p><p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-zinc-400">{media.kind}</p></div></a>)}</div></div> : null}
          {selectedPayment.successNotificationError ? <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-black">Notification error</p><p className="mt-1 whitespace-pre-wrap">{selectedPayment.successNotificationError}</p></div> : null}
        </SectionCard>
      ) : null}
    </div>
  );
}

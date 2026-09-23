import type { ReactNode } from "react";
import type { AdminWebhook } from "./types";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-MW", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusClasses(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid" || normalized === "processed" || normalized === "sent" || normalized === "valid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "pending" || normalized === "received" || normalized === "sending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalized === "failed" || normalized === "refunded" || normalized === "invalid") return "border-red-200 bg-red-50 text-red-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function StatusPill({ value }: { value: string }) {
  return <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] " + statusClasses(value)}>{value}</span>;
}

function SectionCard({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
      <div>{eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</p> : null}<h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">{title}</h2></div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-10 text-center text-sm text-zinc-500">{label}</div>;
}

export default function AdminWebhooks({ webhooks }: { webhooks: AdminWebhook[] }) {
  return (
    <SectionCard title="Webhooks" eyebrow="PayChangu event audit">
      <div className="overflow-x-auto rounded-2xl border border-zinc-200">
        <table className="min-w-full text-left">
          <thead className="bg-zinc-50"><tr className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400"><th className="px-4 py-3">Event</th><th className="px-4 py-3">Payment reference</th><th className="px-4 py-3">Signature</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Error</th></tr></thead>
          <tbody className="divide-y divide-zinc-100">
            {webhooks.length ? webhooks.map((webhook) => (
              <tr key={webhook.id} className="text-xs">
                <td className="px-4 py-3"><p className="font-black text-zinc-900">{webhook.eventType || "Unknown event"}</p><p className="mt-0.5 font-mono text-[10px] text-zinc-400">{webhook.providerEventId || "No provider event id"}</p></td>
                <td className="px-4 py-3 font-mono text-[10px] text-zinc-700">{webhook.paymentReference || "—"}</td>
                <td className="px-4 py-3"><StatusPill value={webhook.signatureValid ? "valid" : "invalid"} /></td>
                <td className="px-4 py-3"><StatusPill value={webhook.status} /></td>
                <td className="px-4 py-3 text-zinc-500">{formatDate(webhook.createdAt)}</td>
                <td className="max-w-xs px-4 py-3 text-red-600">{webhook.error || "—"}</td>
              </tr>
            )) : <tr><td colSpan={6}><EmptyState label="No Studio webhook events have been recorded yet." /></td></tr>}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

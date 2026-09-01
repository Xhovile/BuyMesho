import { BadgeInfo, Loader2, Webhook } from "lucide-react";
import { formatDate, type Tone, type WebhookEventRow } from "./adminPayments.utils";

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const toneClass: Record<Tone, string> = {
    zinc: "bg-zinc-100 text-zinc-700 border-zinc-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${toneClass[tone]}`}>{label}</span>;
}

export default function AdminWebhooksTable({
  events,
  loading,
  searchActive,
}: {
  events: WebhookEventRow[];
  loading: boolean;
  searchActive: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          <h2 className="text-lg font-black">{searchActive ? "Matching webhook events" : "Webhook log"}</h2>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
      ) : events.length === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-500">{searchActive ? "No webhook events matched this investigation query." : "No webhook events captured yet."}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="p-4 text-left">Event</th>
                <th className="p-4 text-left">Reference</th>
                <th className="p-4 text-left">Signature</th>
                <th className="p-4 text-left">Received</th>
                <th className="p-4 text-left">Payload</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-zinc-100">
                  <td className="p-4 align-top">{event.event_type || "—"}<div className="mt-1 text-[11px] text-zinc-400">Event ID: {event.id}</div><div className="mt-1 text-[11px] text-zinc-400">{event.provider}</div></td>
                  <td className="break-all p-4 align-top font-mono text-xs">{event.reference || "—"}</td>
                  <td className="p-4 align-top"><StatusPill label={Number(event.signature_valid) === 1 ? "Valid" : "Invalid"} tone={Number(event.signature_valid) === 1 ? "emerald" : "rose"} /></td>
                  <td className="p-4 align-top text-zinc-500">{formatDate(event.created_at)}</td>
                  <td className="p-4 align-top">
                    {event.payload ? (
                      <details className="group">
                        <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-bold text-zinc-700"><BadgeInfo className="h-3.5 w-3.5" /> View payload</summary>
                        <pre className="mt-3 max-h-72 overflow-auto rounded-2xl bg-zinc-950 p-4 text-[11px] leading-relaxed text-zinc-100">{event.payload}</pre>
                      </details>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

import { AlertTriangle, CheckCircle2, ChevronRight, Clock3, FileText, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ADMIN_DISPUTES_PATH, navigateToPath } from "./lib/appNavigation";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";

type CaseRow = {
  id: string; order_id: string; buyer_id: string; seller_id: string; status: string; outcome?: string | null;
  opened_at?: string | null; window_ends_at?: string | null; updated_at?: string | null;
  order_status?: string | null; total_amount?: number | null; total_currency?: string | null;
  escrow_state?: string | null; escrow_balance_amount?: number | null;
  latest_attempt_id?: string | null; latest_request_type?: string | null; latest_requested_resolution?: string | null;
  latest_reason?: string | null; latest_amount_requested?: number | null; latest_attempt_status?: string | null;
  latest_attempt_created_at?: string | null; refund_request_id?: string | null; refund_request_status?: string | null;
  refund_requested_resolution?: string | null; refund_requested_amount?: number | null; refund_window_ends_at?: string | null;
  refunded_status?: string | null; refunded_amount?: number | null; refunded_provider?: string | null;
  refunded_transaction_id?: string | null;
};
type Detail = { case: Record<string, any>; attempts: Record<string, any>[]; refunds: Record<string, any>[]; audit: Record<string, any>[] };

const money = (amount: unknown, currency: unknown) => `${Number(amount ?? 0).toLocaleString()} ${String(currency ?? "MWK")}`;
const date = (value: unknown) => value ? new Date(String(value)).toLocaleString() : "—";
const label = (value: unknown) => String(value ?? "—").replaceAll("_", " ");

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { credentials: "include", headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || "Request failed");
  return payload;
}

export default function AdminDisputesPage() {
  const [status, setStatus] = useState("active");
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await api(`/api/admin/disputes${status === "active" ? "" : `?status=${encodeURIComponent(status)}`}`);
      setCases(data.cases ?? []);
      if (!selectedId && data.cases?.[0]?.id) setSelectedId(data.cases[0].id);
      if (selectedId && !data.cases?.some((item: CaseRow) => item.id === selectedId)) setSelectedId(data.cases?.[0]?.id ?? null);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to load disputes"); }
    finally { setLoading(false); }
  }, [selectedId, status]);

  const loadDetail = useCallback(async (caseId: string) => {
    try { setDetail(await api(`/api/admin/disputes/${encodeURIComponent(caseId)}`)); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load dispute details"); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (selectedId) void loadDetail(selectedId); else setDetail(null); }, [loadDetail, selectedId]);

  const selected = useMemo(() => cases.find((item) => item.id === selectedId) ?? null, [cases, selectedId]);
  const active = selected?.status === "open" || selected?.status === "under_review";
  const refundReady = selected?.status === "under_review" && ["requested", "under_review", "approved"].includes(String(selected.refund_request_status));
  const sellerRefundReady = selected?.status === "under_review" && selected.refunded_status === "refunded" && selected.refunded_provider === "seller_reported";

  async function act(action: "review" | "approve_refund" | "reject" | "accept_seller_refund") {
    if (!selectedId) return;
    if (!note.trim()) { setError("A decision note is required."); return; }
    setBusy(true); setError(null);
    try {
      const path = action === "review" ? `/api/admin/disputes/${selectedId}/review` : `/api/admin/disputes/${selectedId}/decision`;
      const body = action === "review" ? undefined : JSON.stringify({ decision: action, note: note.trim() });
      await api(path, { method: "POST", ...(body ? { body } : {}) });
      setNote(""); await load(); await loadDetail(selectedId);
    } catch (err) { setError(err instanceof Error ? err.message : "Action failed"); }
    finally { setBusy(false); }
  }

  return (
    <AdminWorkspaceLayout title="Disputes" description="One workspace for returns, refunds, seller-reported refunds, buyer claims, review, and final decisions." onRefresh={() => void load()}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
        <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-zinc-200 p-4">
            <div className="flex flex-wrap gap-2">
              {["active", "open", "under_review", "resolved", "rejected"].map((value) => (
                <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-full px-3 py-2 text-xs font-black capitalize ${status === value ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"}`}>{value === "active" ? "Active" : label(value)}</button>
              ))}
            </div>
          </div>
          {loading ? <div className="p-8 text-sm text-zinc-500">Loading disputes…</div> : cases.length === 0 ? <div className="p-8 text-sm text-zinc-500">No dispute cases in this view.</div> : <div className="divide-y divide-zinc-100">{cases.map((item) => {
            const activeItem = item.status === "open" || item.status === "under_review";
            return <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`block w-full p-4 text-left hover:bg-zinc-50 ${selectedId === item.id ? "bg-zinc-50" : ""}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-zinc-900">{money(item.refund_requested_amount ?? item.latest_amount_requested ?? item.total_amount, item.total_currency)}</p><p className="mt-1 text-xs font-semibold text-zinc-500">Order {item.order_id}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${activeItem ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"}`}>{label(item.status)}</span></div>
              <p className="mt-3 line-clamp-2 text-sm text-zinc-700">{item.latest_reason || "No reason recorded"}</p><div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-bold text-zinc-400"><span>{label(item.latest_requested_resolution || item.refund_requested_resolution || "review")}</span><ChevronRight className="h-4 w-4" /></div>
            </button>;
          })}</div>}
        </section>

        <section className="space-y-5">
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
          {!selected ? <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">Select a dispute case.</div> : <>
            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Case</p><h2 className="mt-1 text-xl font-black">{selected.id}</h2><p className="mt-1 text-sm text-zinc-500">Order {selected.order_id} · Buyer {selected.buyer_id} · Seller {selected.seller_id}</p></div><div className="rounded-2xl bg-zinc-100 px-3 py-2 text-xs font-black capitalize">{label(selected.status)}</div></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Info icon={<AlertTriangle className="h-4 w-4" />} title="Request" value={label(selected.latest_requested_resolution || selected.refund_requested_resolution)} /><Info icon={<FileText className="h-4 w-4" />} title="Reason" value={selected.latest_reason || "—"} /><Info icon={<Clock3 className="h-4 w-4" />} title="Window ends" value={date(selected.window_ends_at || selected.refund_window_ends_at)} /><Info icon={<RefreshCw className="h-4 w-4" />} title="Escrow" value={`${label(selected.escrow_state)} · ${money(selected.escrow_balance_amount, selected.total_currency)}`} /></div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"><h3 className="font-black">Financial context</h3><div className="mt-4 space-y-3 text-sm"><Row title="Order state" value={label(selected.order_status)} /><Row title="Refund request" value={`${label(selected.refund_request_status)} · ${money(selected.refund_requested_amount, selected.total_currency)}`} /><Row title="Seller refund" value={selected.refunded_status ? `${label(selected.refunded_provider)} · ${selected.refunded_transaction_id || "—"}` : "None recorded"} /><Row title="Case opened" value={date(selected.opened_at)} /></div></div>
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"><h3 className="font-black">Case history</h3><div className="mt-4 max-h-56 space-y-2 overflow-auto">{detail?.audit?.length ? detail.audit.map((entry) => <div key={String(entry.id)} className="rounded-2xl bg-zinc-50 p-3"><p className="text-xs font-black uppercase tracking-wider text-zinc-500">{label(entry.event_type)}</p><p className="mt-1 text-xs text-zinc-500">{date(entry.timestamp)} · {entry.performed_by || "system"}</p></div>) : <p className="text-sm text-zinc-500">No audit history loaded.</p>}</div></div>
            </div>

            {active ? <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"><h3 className="font-black">Admin decision</h3><p className="mt-1 text-sm text-zinc-500">Review changes the case state. Final actions below are constrained by the current financial state.</p><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Decision note…" className="mt-4 w-full rounded-2xl border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-zinc-400" />
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.status === "open" ? <button disabled={busy} onClick={() => void act("review")} className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><RefreshCw className="h-4 w-4" />Start review</button> : null}
                {refundReady ? <button disabled={busy} onClick={() => void act("approve_refund")} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Approve & execute refund</button> : null}
                {sellerRefundReady ? <button disabled={busy} onClick={() => void act("accept_seller_refund")} className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Accept seller refund</button> : null}
                {selected.status === "under_review" && !refundReady && !sellerRefundReady ? <button disabled={busy} onClick={() => void act("reject")} className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4" />Reject dispute</button> : null}
              </div>
            </div> : null}

            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"><h3 className="font-black">Evidence & records</h3>{detail?.case?.latest_evidence?.length ? <div className="mt-3 flex flex-wrap gap-2">{detail.case.latest_evidence.map((item: string) => <span key={item} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{item}</span>)}</div> : <p className="mt-3 text-sm text-zinc-500">No evidence recorded.</p>}<p className="mt-4 text-xs text-zinc-400">Attempts: {detail?.attempts?.length ?? 0} · Refund transactions: {detail?.refunds?.length ?? 0}</p></div>
          </>}
        </section>
      </div>
    </AdminWorkspaceLayout>
  );
}

function Info({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) { return <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-zinc-400">{icon}{title}</div><p className="mt-2 text-sm font-semibold text-zinc-800">{value}</p></div>; }
function Row({ title, value }: { title: string; value: string }) { return <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3"><span className="text-zinc-500">{title}</span><span className="max-w-[65%] text-right font-bold text-zinc-900">{value}</span></div>; }

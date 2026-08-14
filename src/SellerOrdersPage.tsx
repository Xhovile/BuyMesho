import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Package, RefreshCw } from "lucide-react";
import { apiFetch } from "./lib/api";
import { navigateToPath } from "./lib/appNavigation";
import { SELLER_DASHBOARD_PATH, SELLER_ORDERS_PATH } from "./lib/appNavigation.paths";
import { useAccountProfile } from "./hooks/useAccountProfile";

type BuyerDetails = { fullName: string; phone: string; addressLine: string; area: string; townOrDistrict: string; landmark: string } | null;
type OrderBundle = {
  order: { id: string; status: string; currency: string; subtotal: { amount: number; currency: string }; total: { amount: number; currency: string }; paymentReference?: string | null; settlementRoute?: string | null; items: Array<{ title: string; quantity: number; unitPrice: { amount: number; currency: string } }>; buyerDetails?: BuyerDetails; placedAt?: string | null; paidAt?: string | null; fulfilledAt?: string | null; createdAt: string; updatedAt: string };
  payment: { status?: string | null; verified?: boolean; reference?: string } | null;
  escrow: { state?: string | null } | null;
  dispute: Record<string, unknown> | null;
};
type FilterKey = "all" | "action_required" | "escrow" | "paid" | "delivered" | "pending_delivery" | "disputed";
const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" }, { key: "action_required", label: "Action Required" }, { key: "escrow", label: "In Escrow" }, { key: "paid", label: "Paid" }, { key: "delivered", label: "Delivered" }, { key: "pending_delivery", label: "Pending Delivery" }, { key: "disputed", label: "Disputed" },
];
function money(order: OrderBundle["order"]): string { return `${order.currency} ${Number(order.total.amount).toLocaleString()}`; }
function statusLabel(status: string): string { switch (status) { case "in_escrow": return "In Escrow"; case "fulfilled": return "Delivered"; case "pending_payment": return "Pending Payment"; case "paid": return "Paid"; case "disputed": return "Disputed"; case "closed": return "Completed"; case "cancelled": return "Cancelled"; case "refunded": return "Refunded"; default: return status.replaceAll("_", " "); } }
function matchesFilter(bundle: OrderBundle, filter: FilterKey): boolean { const status = bundle.order.status; if (filter === "all") return true; if (filter === "escrow") return status === "in_escrow"; if (filter === "paid") return status === "paid"; if (filter === "delivered") return status === "fulfilled" || status === "closed"; if (filter === "disputed") return status === "disputed"; if (filter === "pending_delivery") return status === "paid" || status === "in_escrow"; if (filter === "action_required") return status === "paid" || status === "in_escrow" || status === "disputed"; return true; }

export default function SellerOrdersPage() {
  const { profileLoading, profile } = useAccountProfile();
  const [orders, setOrders] = useState<OrderBundle[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<OrderBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const data = await apiFetch("/api/seller/orders");
      setOrders(Array.isArray(data) ? (data as OrderBundle[]) : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load seller orders");
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { if (!profileLoading && profile?.is_seller) void loadOrders(); }, [profileLoading, profile?.is_seller]);
  const filteredOrders = useMemo(() => orders.filter((bundle) => matchesFilter(bundle, filter)), [orders, filter]);
  const selectedOrderId = new URLSearchParams(window.location.search).get("order");
  useEffect(() => { if (!selectedOrderId) return; const found = orders.find((entry) => entry.order.id === selectedOrderId); if (found) setSelected(found); }, [orders, selectedOrderId]);

  if (profileLoading) return <main className="min-h-screen grid place-items-center bg-zinc-50 text-sm font-semibold text-zinc-500">Loading seller orders…</main>;
  if (!profile?.is_seller) return <main className="min-h-screen grid place-items-center bg-zinc-50 px-6 text-center"><div><p className="font-extrabold text-zinc-900">Seller access required</p><button type="button" onClick={() => navigateToPath(SELLER_DASHBOARD_PATH)} className="mt-3 text-sm font-bold text-zinc-600 hover:text-zinc-950">Back to Seller Dashboard</button></div></main>;

  const openOrder = (bundle: OrderBundle) => { setSelected(bundle); navigateToPath(`${SELLER_ORDERS_PATH}&order=${encodeURIComponent(bundle.order.id)}`); };
  const closeOrder = () => { setSelected(null); navigateToPath(SELLER_ORDERS_PATH); };

  if (selected) {
    const buyer = selected.order.buyerDetails;
    return <main className="min-h-screen bg-zinc-50 px-4 py-6 md:px-8"><div className="mx-auto max-w-4xl"><button type="button" onClick={closeOrder} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-zinc-600 hover:text-zinc-950"><ArrowLeft className="h-4 w-4" /> Back to Seller Orders</button><section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Order</p><h1 className="mt-1 text-2xl font-black text-zinc-950">{selected.order.id}</h1></div><span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-extrabold text-zinc-800">{statusLabel(selected.order.status)}</span></div><div className="mt-6 grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-zinc-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-zinc-400">Purchase</p>{selected.order.items.map((item) => <div key={`${item.title}-${item.quantity}`} className="mt-3 flex justify-between gap-4 text-sm"><span className="font-semibold text-zinc-700">{item.title} × {item.quantity}</span><span className="font-extrabold text-zinc-950">{selected.order.currency} {Number(item.unitPrice.amount * item.quantity).toLocaleString()}</span></div>)}<div className="mt-4 flex justify-between border-t border-zinc-200 pt-3 font-black"><span>Total</span><span>{money(selected.order)}</span></div></div><div className="rounded-2xl bg-zinc-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-zinc-400">Buyer & Delivery</p>{buyer ? <div className="mt-3 space-y-1 text-sm text-zinc-700"><p className="font-extrabold text-zinc-950">{buyer.fullName}</p><p>{buyer.phone}</p><p>{buyer.addressLine}</p><p>{buyer.area}, {buyer.townOrDistrict}</p>{buyer.landmark ? <p>Landmark: {buyer.landmark}</p> : null}</div> : <p className="mt-3 text-sm text-zinc-500">Buyer delivery details are not available for this order.</p>}</div></div><div className="mt-4 rounded-2xl border border-zinc-200 p-4"><p className="text-xs font-black uppercase tracking-wider text-zinc-400">Payment</p><div className="mt-3 grid gap-2 text-sm md:grid-cols-2"><p><span className="text-zinc-500">Payment status:</span> <strong>{selected.payment?.status ?? selected.order.status}</strong></p><p><span className="text-zinc-500">Reference:</span> <strong>{selected.payment?.reference ?? selected.order.paymentReference ?? "—"}</strong></p><p><span className="text-zinc-500">Settlement:</span> <strong>{selected.order.settlementRoute ?? "—"}</strong></p><p><span className="text-zinc-500">Escrow:</span> <strong>{selected.escrow?.state ?? "—"}</strong></p></div></div></section></div></main>;
  }

  return <main className="min-h-screen bg-zinc-50 px-4 py-6 md:px-8"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Seller Workspace</p><h1 className="mt-1 text-3xl font-black text-zinc-950">Seller Orders</h1><p className="mt-1 text-sm text-zinc-500">Manage purchases made from your listings.</p></div><button type="button" onClick={() => void loadOrders(true)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh</button></div><div className="mt-6 flex gap-2 overflow-x-auto pb-2">{FILTERS.map((item) => <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold transition ${filter === item.key ? "bg-zinc-950 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100"}`}>{item.label}</button>)}</div>{error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}{loading ? <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm font-semibold text-zinc-500">Loading seller orders…</div> : filteredOrders.length === 0 ? <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-10 text-center"><Package className="mx-auto h-8 w-8 text-zinc-300" /><p className="mt-3 font-extrabold text-zinc-800">No orders in this view.</p></div> : <div className="mt-5 space-y-3">{filteredOrders.map((bundle) => <button key={bundle.order.id} type="button" onClick={() => openOrder(bundle)} className="group w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-zinc-300 hover:shadow-md"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="truncate text-sm font-black text-zinc-950">{bundle.order.items[0]?.title ?? "Order"}</p><p className="mt-1 text-xs text-zinc-500">{bundle.order.id} · {bundle.order.buyerDetails?.fullName ?? "Buyer"}</p></div><div className="flex items-center gap-3"><div className="text-right"><p className="text-sm font-black text-zinc-950">{money(bundle.order)}</p><p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">{statusLabel(bundle.order.status)}</p></div><ChevronRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5" /></div></div></button>)}</div>}<button type="button" onClick={() => navigateToPath(SELLER_DASHBOARD_PATH)} className="mt-8 text-sm font-bold text-zinc-500 hover:text-zinc-950">Back to Seller Dashboard</button></div></main>;
}

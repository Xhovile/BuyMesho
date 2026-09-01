import { Loader2, RefreshCw, Search } from "lucide-react";
import type { PaymentSortMode, WebhookSortMode } from "./adminPayments.utils";

type ActiveTab = "payments" | "webhooks";
type Tone = "zinc" | "emerald" | "amber" | "blue" | "rose";

export type AdminPaymentsStats = {
  totalPayments: number;
  verifiedPayments: number;
  paidPayments: number;
  pendingPayments: number;
  totalWebhooks: number;
  validWebhooks: number;
  invalidWebhooks: number;
};

function SortCard({
  label,
  value,
  active,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  tone: Tone;
  onClick: () => void;
}) {
  const accent: Record<Tone, string> = {
    zinc: "text-zinc-400",
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    blue: "text-blue-500",
    rose: "text-rose-500",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex aspect-square flex-col justify-between p-4 text-left transition-colors md:p-5 ${
        active ? "bg-zinc-950 text-white" : "bg-white text-zinc-900 hover:bg-zinc-50"
      }`}
      aria-pressed={active}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs font-black uppercase tracking-[0.18em] ${active ? "text-zinc-300" : accent[tone]}`}>
          {label}
        </p>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${active ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-500"}`}>
          Sort
        </span>
      </div>
      <div className="flex flex-1 items-end">
        <p className="text-4xl font-black leading-none tracking-tight md:text-5xl">{value}</p>
      </div>
    </button>
  );
}

export default function AdminPaymentsToolbar({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  paymentSortMode,
  webhookSortMode,
  onPaymentSortChange,
  onWebhookSortChange,
  stats,
  refreshing,
  onRefresh,
}: {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  paymentSortMode: PaymentSortMode;
  webhookSortMode: WebhookSortMode;
  onPaymentSortChange: (mode: PaymentSortMode) => void;
  onWebhookSortChange: (mode: WebhookSortMode) => void;
  stats: AdminPaymentsStats;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const activeSortLabel = activeTab === "payments"
    ? ({ recent: "Recent", verified: "Verified", paid: "Paid", pending: "Pending" } as const)[paymentSortMode]
    : ({ recent: "Recent", valid: "Valid hooks", invalid: "Invalid hooks" } as const)[webhookSortMode];

  return (
    <>
      <section className="flex flex-col gap-5 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">Payments & Webhooks</h1>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">
            Admin monitoring only. Buyer order status belongs elsewhere.
          </p>
        </div>

        <div className="flex overflow-hidden rounded-2xl border border-zinc-200">
          <button type="button" onClick={() => onTabChange("payments")} className={`px-5 py-3 text-left ${activeTab === "payments" ? "bg-zinc-700 text-white" : "bg-zinc-100 text-zinc-500"}`}>
            Payments<br /><span className="text-lg font-black">{stats.totalPayments}</span>
          </button>
          <div className="w-px bg-zinc-200" />
          <button type="button" onClick={() => onTabChange("webhooks")} className={`px-5 py-3 text-left ${activeTab === "webhooks" ? "bg-zinc-700 text-white" : "bg-zinc-100 text-zinc-500"}`}>
            Webhooks<br /><span className="text-lg font-black">{stats.totalWebhooks}</span>
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Transaction investigation</p>
            <h2 className="mt-1 text-lg font-black text-zinc-950">Search payments and webhooks</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Search Ticket ID, payment reference, seller UUID, order ID, provider reference, event ID, or webhook payload text.
            </p>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); onSearch(); }} className="flex w-full gap-2 lg:max-w-2xl">
            <label className="sr-only" htmlFor="admin-payment-investigation-search">Transaction investigation search</label>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="admin-payment-investigation-search"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Search payment, seller, order, ticket, webhook, or error…"
                className="min-h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white"
              />
            </div>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white transition hover:bg-zinc-800">
              <Search className="h-4 w-4" /> Search
            </button>
          </form>
        </div>
        {searchQuery.trim() ? (
          <p className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-500">
            Investigation query: <span className="font-black text-zinc-900">{searchQuery.trim()}</span>
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Click to Sort</p>
          <p className="mt-1 text-sm text-zinc-600">Current sort: <span className="font-bold text-zinc-900">{activeSortLabel}</span></p>
        </div>

        {activeTab === "payments" ? (
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-200 p-px shadow-sm md:grid-cols-4">
            <SortCard label="Recent" value={stats.totalPayments} active={paymentSortMode === "recent"} tone="zinc" onClick={() => onPaymentSortChange("recent")} />
            <SortCard label="Verified" value={stats.verifiedPayments} active={paymentSortMode === "verified"} tone="emerald" onClick={() => onPaymentSortChange("verified")} />
            <SortCard label="Paid" value={stats.paidPayments} active={paymentSortMode === "paid"} tone="blue" onClick={() => onPaymentSortChange("paid")} />
            <SortCard label="Pending" value={stats.pendingPayments} active={paymentSortMode === "pending"} tone="amber" onClick={() => onPaymentSortChange("pending")} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-200 p-px shadow-sm md:grid-cols-3">
            <SortCard label="Recent" value={stats.totalWebhooks} active={webhookSortMode === "recent"} tone="zinc" onClick={() => onWebhookSortChange("recent")} />
            <SortCard label="Valid hooks" value={stats.validWebhooks} active={webhookSortMode === "valid"} tone="emerald" onClick={() => onWebhookSortChange("valid")} />
            <SortCard label="Invalid hooks" value={stats.invalidWebhooks} active={webhookSortMode === "invalid"} tone="rose" onClick={() => onWebhookSortChange("invalid")} />
          </div>
        )}
      </section>
    </>
  );
}

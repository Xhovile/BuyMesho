import { Search } from "lucide-react";
import type { PaymentSortMode, WebhookSortMode } from "./adminPayments.utils";

type ActiveTab = "payments" | "webhooks";
export type AdminPaymentsStats = {
  totalPayments: number;
  verifiedPayments: number;
  paidPayments: number;
  pendingPayments: number;
  totalWebhooks: number;
  validWebhooks: number;
  invalidWebhooks: number;
};

function StatButton({
  label,
  value,
  active,
  onClick,
  badge = "Sort",
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex min-h-[5.75rem] flex-col justify-between rounded-2xl border px-3.5 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-4 ${
        active
          ? "border-zinc-950 bg-zinc-950 text-white shadow-zinc-950/15"
          : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${active ? "text-zinc-300" : "text-zinc-500"}`}>
          {label}
        </p>
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] ${active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200/70"}`}>
          {badge}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-black leading-none tracking-tight sm:text-3xl">{value}</p>
        <span className={`h-1.5 w-8 rounded-full ${active ? "bg-white/60" : "bg-zinc-200 group-hover:bg-zinc-300"}`} />
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
    ? ({ recent: "All", verified: "Verified", paid: "Paid", pending: "Pending" } as const)[paymentSortMode]
    : ({ recent: "All", valid: "Valid hooks", invalid: "Invalid hooks" } as const)[webhookSortMode];

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

        <div className="grid w-full grid-cols-2 gap-3 sm:w-80">
          <StatButton
            label="Payments"
            value={stats.totalPayments}
            active={activeTab === "payments"}
            onClick={() => onTabChange("payments")}
            badge="View"
          />
          <StatButton
            label="Webhooks"
            value={stats.totalWebhooks}
            active={activeTab === "webhooks"}
            onClick={() => onTabChange("webhooks")}
            badge="View"
          />
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatButton
              label="All"
              value={stats.totalPayments}
              active={paymentSortMode === "recent"}
              onClick={() => onPaymentSortChange("recent")}
            />
            <StatButton
              label="Verified"
              value={stats.verifiedPayments}
              active={paymentSortMode === "verified"}
              onClick={() => onPaymentSortChange("verified")}
            />
            <StatButton
              label="Paid"
              value={stats.paidPayments}
              active={paymentSortMode === "paid"}
              onClick={() => onPaymentSortChange("paid")}
            />
            <StatButton
              label="Pending"
              value={stats.pendingPayments}
              active={paymentSortMode === "pending"}
              onClick={() => onPaymentSortChange("pending")}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatButton
              label="All"
              value={stats.totalWebhooks}
              active={webhookSortMode === "recent"}
              onClick={() => onWebhookSortChange("recent")}
            />
            <StatButton
              label="Valid hooks"
              value={stats.validWebhooks}
              active={webhookSortMode === "valid"}
              onClick={() => onWebhookSortChange("valid")}
            />
            <StatButton
              label="Invalid hooks"
              value={stats.invalidWebhooks}
              active={webhookSortMode === "invalid"}
              onClick={() => onWebhookSortChange("invalid")}
            />
          </div>
        )}
      </section>
    </>
  );
}

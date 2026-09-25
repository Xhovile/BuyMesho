import { useEffect, useMemo, useState } from "react";
import { CircleAlert, Loader2, ShieldCheck } from "lucide-react";
import { apiFetch } from "./lib/api";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";
import AdminPaymentDetailsDrawer from "./AdminPaymentDetailsDrawer";
import AdminPaymentsToolbar from "./adminPayments/AdminPaymentsToolbar";
import AdminPaymentsTable from "./adminPayments/AdminPaymentsTable";
import AdminWebhooksTable from "./adminPayments/AdminWebhooksTable";
import {
  sortPayments,
  sortWebhooks,
  type PaymentRow,
  type PaymentSortMode,
  type SummaryResponse,
  type WebhookEventRow,
  type WebhookSortMode,
} from "./adminPayments/adminPayments.utils";

type ActiveTab = "payments" | "webhooks";
type InvestigationResponse = {
  query: string;
  payments: PaymentRow[];
  webhooks: WebhookEventRow[];
  tickets?: Array<{
    ticketId: unknown;
    ticketCode?: unknown;
    eventId?: unknown;
    eventTitle?: unknown;
    orderId?: unknown;
    sellerId?: unknown;
  }>;
  sellers?: Array<{ sellerId: unknown }>;
  counts?: {
    payments?: number;
    webhooks?: number;
    tickets?: number;
    sellers?: number;
  };
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventRow[]>([]);
  const [summary, setSummary] = useState<SummaryResponse>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("payments");
  const [paymentSortMode, setPaymentSortMode] = useState<PaymentSortMode>("recent");
  const [webhookSortMode, setWebhookSortMode] = useState<WebhookSortMode>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState("");
  const [investigation, setInvestigation] = useState<InvestigationResponse | null>(null);
  const [investigationLoading, setInvestigationLoading] = useState(false);
  const [investigationError, setInvestigationError] = useState<string | null>(null);
  const [selectedReference, setSelectedReference] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setRefreshing(true);
    try {
      const [paymentsData, webhookData, summaryData] = await Promise.all([
        apiFetch("/api/admin/payments"),
        apiFetch("/api/admin/webhook-events"),
        apiFetch("/api/admin/payment-summary"),
      ]);
      setPayments(Array.isArray(paymentsData) ? paymentsData as PaymentRow[] : []);
      setWebhookEvents(Array.isArray(webhookData) ? webhookData as WebhookEventRow[] : []);
      setSummary((summaryData ?? {}) as SummaryResponse);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load payment monitoring data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!selectedReference) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedReference(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedReference]);

  const stats = useMemo(() => ({
    totalPayments: summary?.summary?.total_payments ?? payments.length,
    verifiedPayments: summary?.summary?.verified_payments ?? payments.filter((p) => Number(p.verified) === 1).length,
    paidPayments: summary?.summary?.paid_payments ?? payments.filter((p) => ["paid", "captured"].includes(String(p.payment_status || "").toLowerCase())).length,
    pendingPayments: summary?.summary?.pending_payments ?? payments.filter((p) => String(p.payment_status || "").toLowerCase() === "pending").length,
    totalWebhooks: summary?.webhookSummary?.total_webhooks ?? webhookEvents.length,
    validWebhooks: summary?.webhookSummary?.valid_webhooks ?? webhookEvents.filter((e) => Number(e.signature_valid) === 1).length,
    invalidWebhooks: summary?.webhookSummary?.invalid_webhooks ?? webhookEvents.filter((e) => Number(e.signature_valid) === 0).length,
  }), [payments, webhookEvents, summary]);

  const selectedPayment = selectedReference
    ? payments.find((payment) => payment.reference === selectedReference) ?? null
    : null;
  const selectedHooks = selectedReference
    ? webhookEvents.filter((event) => event.reference === selectedReference)
    : [];

  const sortedPayments = useMemo(() => sortPayments(payments, paymentSortMode), [payments, paymentSortMode]);
  const sortedWebhookEvents = useMemo(() => sortWebhooks(webhookEvents, webhookSortMode), [webhookEvents, webhookSortMode]);

  const matchingPayments = useMemo(
    () => submittedSearchQuery
      ? sortPayments(investigation?.payments ?? [], paymentSortMode)
      : sortedPayments,
    [investigation, submittedSearchQuery, sortedPayments, paymentSortMode],
  );

  const matchingWebhooks = useMemo(
    () => submittedSearchQuery
      ? sortWebhooks(investigation?.webhooks ?? [], webhookSortMode)
      : sortedWebhookEvents,
    [investigation, submittedSearchQuery, sortedWebhookEvents, webhookSortMode],
  );

  const handleSearch = async () => {
    const query = searchQuery.trim();
    setSubmittedSearchQuery(query);
    setInvestigationError(null);
    setInvestigation(null);
    setSelectedReference(null);
    if (!query) return;

    setInvestigationLoading(true);
    try {
      const response = await apiFetch(`/api/admin/payment-investigation?q=${encodeURIComponent(query)}`);
      setInvestigation(response as InvestigationResponse);
    } catch (err: unknown) {
      setInvestigationError(err instanceof Error ? err.message : "Failed to investigate payments and webhooks.");
    } finally {
      setInvestigationLoading(false);
    }
  };

  const investigationCounts = investigation?.counts;

  return (
    <AdminWorkspaceLayout
      title="Payments & Webhooks"
      description="Admin monitoring only. Buyer order status belongs elsewhere."
      onRefresh={() => void load()}
    >
      <AdminPaymentsToolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={() => void handleSearch()}
        paymentSortMode={paymentSortMode}
        webhookSortMode={webhookSortMode}
        onPaymentSortChange={setPaymentSortMode}
        onWebhookSortChange={setWebhookSortMode}
        stats={stats}
        refreshing={refreshing}
        onRefresh={() => void load()}
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {investigationError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{investigationError}</div> : null}
      {investigationLoading ? <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Investigating transactions…</div> : null}

      {submittedSearchQuery && investigation ? (
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="font-black text-zinc-950">Investigation: {submittedSearchQuery}</span>
            <span className="text-zinc-500">{investigationCounts?.payments ?? investigation.payments.length} payment(s)</span>
            <span className="text-zinc-500">{investigationCounts?.webhooks ?? investigation.webhooks.length} webhook(s)</span>
            {investigationCounts?.tickets ? <span className="text-zinc-500">{investigationCounts.tickets} ticket(s)</span> : null}
            {investigationCounts?.sellers ? <span className="text-zinc-500">{investigationCounts.sellers} seller(s)</span> : null}
          </div>
        </section>
      ) : null}

      {activeTab === "payments" ? (
        <AdminPaymentsTable
          payments={matchingPayments}
          loading={loading || investigationLoading}
          searchActive={Boolean(submittedSearchQuery)}
          onSelectPayment={(payment) => setSelectedReference(payment.reference)}
        />
      ) : (
        <AdminWebhooksTable events={matchingWebhooks} loading={loading || investigationLoading} searchActive={Boolean(submittedSearchQuery)} />
      )}

      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700"><ShieldCheck className="h-5 w-5" /></div>
          <div className="space-y-2">
            <p className="text-sm font-black text-zinc-900">How to read this page</p>
            <p className="text-sm leading-relaxed text-zinc-600">Pending means the payment has been created, but the webhook or verification step has not completed yet. Once confirmed, the order should move through paid and into the holding phase, and later to released or refunded.</p>
            <p className="text-sm leading-relaxed text-zinc-600">Seller-facing payout progress is separate from this payment lifecycle: queued for admin review → sent to PayChangu → provider pending → paid (or needs destination update).</p>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"><CircleAlert className="h-3.5 w-3.5" /> Settlement control should stay in the order flow, not the admin page.</p>
          </div>
        </div>
      </section>

      {selectedPayment ? (
        <AdminPaymentDetailsDrawer
          payment={selectedPayment}
          hooks={selectedHooks}
          onClose={() => setSelectedReference(null)}
        />
      ) : null}
    </AdminWorkspaceLayout>
  );
}

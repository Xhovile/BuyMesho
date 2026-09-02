import { useEffect, useMemo, useState } from "react";
import { CircleAlert, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { apiFetch } from "./lib/api";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";
import AdminPayoutQueue from "./AdminPayoutQueue";
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
type LifecycleState = "done" | "active" | "waiting" | "issue";

type LifecycleStep = {
  number: number;
  title: string;
  detail: string;
  state: LifecycleState;
};

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

function lifecycleTone(state: LifecycleState): "emerald" | "blue" | "rose" | "zinc" {
  if (state === "done") return "emerald";
  if (state === "active") return "blue";
  if (state === "issue") return "rose";
  return "zinc";
}

function LifecycleNode({ number, title, detail, state }: LifecycleStep) {
  const tone = lifecycleTone(state);
  const classes = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    zinc: "border-zinc-200 bg-zinc-50 text-zinc-700",
  }[tone];
  const dotClasses = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    rose: "bg-rose-500",
    zinc: "bg-zinc-300",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{String(number).padStart(2, "0")}</span>
          <p className="text-sm font-black">{title}</p>
        </div>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClasses}`} />
      </div>
      <p className="mt-2 text-xs leading-5 opacity-75">{detail}</p>
    </div>
  );
}

function buildLifecycleSteps(payment?: PaymentRow | null, hooks: WebhookEventRow[] = []): LifecycleStep[] {
  const hasPayment = !!payment;
  const hasCheckout = !!payment?.checkout_url;
  const hasWebhook = hooks.length > 0;
  const hasValidWebhook = hooks.some((hook) => Number(hook.signature_valid) === 1);
  const isPaid = !!payment && (["paid", "captured"].includes(String(payment.payment_status || "").toLowerCase()) || !!payment.paid_at);
  const isEscrowActive = !!payment && (["in_escrow", "paid"].includes(String(payment.order_status || "").toLowerCase()) || !!payment.escrow_id);
  const isDelivered = !!payment && String(payment.order_status || "").toLowerCase() === "fulfilled";
  const escrowState = String(payment?.escrow_state || "").toLowerCase();
  const isSettled = escrowState === "released" || escrowState === "refunded";
  const isDisputed = escrowState === "disputed";

  return [
    {
      number: 1,
      title: "Payment created",
      detail: hasPayment ? "BuyMesho stored a payment row for this checkout attempt." : "No payment row exists yet.",
      state: hasPayment ? "done" : "waiting",
    },
    {
      number: 2,
      title: "Checkout opened",
      detail: hasCheckout ? "The buyer was sent to the provider checkout URL." : "Waiting for checkout creation.",
      state: hasCheckout ? "done" : hasPayment ? "active" : "waiting",
    },
    {
      number: 3,
      title: "Webhook received",
      detail: hasWebhook ? "PayChangu callback delivery was captured." : "No webhook event has arrived yet.",
      state: hasWebhook ? "active" : "waiting",
    },
    {
      number: 4,
      title: "Signature verified",
      detail: hasValidWebhook ? "At least one webhook signature passed verification." : hasWebhook ? "Webhook arrived, but verification has not passed yet." : "Waiting for a webhook to verify.",
      state: hasValidWebhook ? "done" : hasWebhook ? "active" : "waiting",
    },
    {
      number: 5,
      title: "Order confirmed",
      detail: isPaid ? "The order was marked paid and moved into the confirmed flow." : "The order is still pending confirmation.",
      state: isPaid ? "done" : "waiting",
    },
    {
      number: 6,
      title: "Escrow active",
      detail: isEscrowActive ? "Funds are represented as active escrow for the order." : "Escrow has not started yet.",
      state: isEscrowActive ? (isDisputed ? "issue" : "active") : "waiting",
    },
    {
      number: 7,
      title: "Buyer confirmed delivery",
      detail: isDelivered ? "The order has been marked fulfilled after delivery confirmation." : "Waiting for delivery confirmation.",
      state: isDelivered ? "done" : "waiting",
    },
    {
      number: 8,
      title: "Funds released or refunded",
      detail: escrowState === "released" ? "Funds were released to the seller." : escrowState === "refunded" ? "Funds were refunded to the buyer." : "Final settlement has not happened yet.",
      state: escrowState === "released" ? "done" : escrowState === "refunded" ? "issue" : "waiting",
    },
  ];
}

type LifecycleSelection = {
  payment: PaymentRow | null;
  hooks: WebhookEventRow[];
};

function useLifecycleSelection(
  latestPayment: PaymentRow | null,
  selectedPayment: PaymentRow | null,
  selectedHooks: WebhookEventRow[],
): LifecycleSelection {
  return useMemo(
    () => ({
      payment: selectedPayment ?? latestPayment,
      hooks: selectedPayment ? selectedHooks : latestPayment ? selectedHooks.length ? selectedHooks : [] : [],
    }),
    [latestPayment, selectedPayment, selectedHooks],
  );
}

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

  const latestPayment = useMemo(() => {
    return [...payments].sort((a, b) => Date.parse(b.updated_at || b.created_at || "") - Date.parse(a.updated_at || a.created_at || ""))[0] ?? null;
  }, [payments]);

  const selectedPayment = selectedReference
    ? payments.find((payment) => payment.reference === selectedReference) ?? null
    : null;
  const selectedHooks = selectedReference
    ? webhookEvents.filter((event) => event.reference === selectedReference)
    : [];

  const lifecycleSelection = useLifecycleSelection(
    latestPayment,
    selectedPayment,
    selectedPayment ? selectedHooks : latestPayment ? webhookEvents.filter((event) => event.reference === latestPayment.reference) : [],
  );
  const lifecycle = useMemo(
    () => buildLifecycleSteps(lifecycleSelection.payment, lifecycleSelection.hooks),
    [lifecycleSelection],
  );

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
  const lifecycleReference = lifecycleSelection.payment?.reference;

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

      {lifecycleReference ? (
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><CreditCard className="h-5 w-5" /><h2 className="text-lg font-black">Transaction lifecycle</h2></div>
          <p className="mt-2 text-sm text-zinc-600">
            Showing {selectedPayment ? "selected" : "latest"} payment reference: {lifecycleReference}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{lifecycle.map((step) => <LifecycleNode key={step.number} {...step} />)}</div>
        </section>
      ) : null}

      <AdminPayoutQueue />

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

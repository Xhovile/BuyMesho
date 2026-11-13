import { useEffect, useRef, useState } from "react";
import { CircleAlert, Loader2, RefreshCw, Wallet } from "lucide-react";
import { apiFetch } from "./lib/api";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";

type PayChanguBalanceResponse = {
  provider?: string;
  environment?: string;
  currency?: string;
  mainBalance?: number;
  collectionBalance?: number;
  availableBalance?: number;
  checkedAt?: string;
  rawResponse?: Record<string, unknown>;
};

let cachedPayChanguBalance: PayChanguBalanceResponse | null = null;

function formatMoney(value: unknown, currency = "MWK") {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }

  return `${currency} ${numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: unknown): string {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function AdminBalancePage() {
  const [balance, setBalance] = useState<PayChanguBalanceResponse | null>(
    cachedPayChanguBalance,
  );
  const [loading, setLoading] = useState(!cachedPayChanguBalance);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadBalance = async (forceRefresh = false) => {
    if (cachedPayChanguBalance && !forceRefresh) {
      setBalance(cachedPayChanguBalance);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setError(null);
    setRefreshing(true);

    try {
      const data = await apiFetch("/api/admin/paychangu/balance?currency=MWK", {
        signal: controller.signal,
        timeoutMs: 120000,
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      cachedPayChanguBalance = (data ?? {}) as PayChanguBalanceResponse;
      setBalance(cachedPayChanguBalance);
    } catch (err) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setError(err instanceof Error ? err.message : "Failed to load PayChangu balance.");
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
        setRefreshing(false);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    }
  };

  useEffect(() => {
    void loadBalance();

    return () => {
      abortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currency = balance?.currency ?? "MWK";
  const mainBalance = balance?.mainBalance ?? null;
  const collectionBalance = balance?.collectionBalance ?? null;
  const availableBalance = balance?.availableBalance ?? balance?.mainBalance ?? null;

  return (
    <AdminWorkspaceLayout
      title="Balance"
      description="PayChangu wallet balance for payout readiness."
      isRefreshing={loading}
      onRefresh={() => void loadBalance(true)}
    >
      <main className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-bm-danger/25 bg-bm-danger-bg px-4 py-3 text-sm text-bm-danger">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-bm-text-subtle">
              Main balance
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-2xl font-black text-bm-text">
                {formatMoney(mainBalance, currency)}
              </p>
              <Wallet className="h-5 w-5 text-bm-text-subtle" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-bm-text-subtle">
              Collection balance
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-2xl font-black text-bm-text">
                {formatMoney(collectionBalance, currency)}
              </p>
              <Wallet className="h-5 w-5 text-bm-text-subtle" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-bm-text-subtle">
              Available / checked
            </p>
            <p className="mt-3 text-2xl font-black text-bm-text">
              {formatMoney(availableBalance, currency)}
            </p>
            <p className="mt-2 text-xs text-bm-text-subtle dark:text-bm-text-subtle">
              Checked at: {formatDate(balance?.checkedAt)}
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-6 shadow-sm">
          <div className="flex items-center gap-2">
            {refreshing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
            <h2 className="text-lg font-black">Raw wallet response</h2>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-bm-text-subtle dark:text-bm-text-subtle">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading balance...
            </div>
          ) : (
            <details className="mt-4 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle p-4">
              <summary className="cursor-pointer text-sm font-bold text-bm-text-muted dark:text-bm-text-muted">
                Show provider payload
              </summary>
              <pre className="mt-4 overflow-auto rounded-2xl bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
                {JSON.stringify(balance?.rawResponse ?? {}, null, 2)}
              </pre>
            </details>
          )}
        </section>

        <section className="rounded-[2rem] border border-bm-warning/25 bg-bm-warning-bg p-5 text-sm text-bm-warning">
          <div className="flex items-center gap-2 font-black">
            <CircleAlert className="h-4 w-4" />
            Read this correctly
          </div>
          <p className="mt-2 leading-relaxed">
            Main balance is the number you should treat as payout-ready. Collection balance is shown separately so you do not confuse incoming collections with transferable funds.
          </p>
        </section>
      </main>
    </AdminWorkspaceLayout>
  );
}
import { useState, type FormEvent } from "react";
import { Truck } from "lucide-react";

import MarketHeaderBar from "./components/shared/MarketHeaderBar";
import { navigateToPath } from "./lib/appNavigation";
import { resolveTrackingTarget } from "./lib/orderFlow";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";

export default function TrackOrderPage() {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;
  return <TrackOrderPageContent />;
}

function TrackOrderPageContent() {
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = reference.trim();
    if (!value) return;

    try {
      setLoading(true);
      setError(null);
      const target = await resolveTrackingTarget(value);
      navigateToPath(target.destinationPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve the reference.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text dark:text-bm-text">
      <MarketHeaderBar subtitle="Track order" />

      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500 text-bm-on-brand">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-bm-text-muted dark:text-bm-text-muted sm:text-xl">Track order</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-bm-text dark:text-bm-text sm:text-5xl">
              Open order tracking
            </h1>
            <p className="mt-2 text-sm leading-7 text-bm-text-muted dark:text-bm-text-muted sm:text-base">
              Enter the order reference, order ID, or ticket code to open the correct tracking view.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 rounded-[1.75rem] border border-bm-border dark:border-bm-border bg-bm-surface p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Enter order reference, order ID, or ticket code"
              className="w-full rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-subtle dark:bg-bm-surface-subtle px-4 py-3 text-sm text-bm-text dark:text-bm-text outline-none focus:ring-2 focus:ring-bm-focus"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-2xl bg-bm-brand px-5 py-3 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Resolving…" : "Track order"}
            </button>
          </div>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { ArrowLeft, Truck } from "lucide-react";
import { PAYMENTS_HUB_PATH, navigateBackOrPath, navigateToOrderTracking } from "./lib/appNavigation";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";

export default function TrackOrderPage() {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;
  return <TrackOrderPageContent />;
}

function TrackOrderPageContent() {
  const [reference, setReference] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = reference.trim();
    if (!value) return;
    navigateToOrderTracking(value);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <button
          type="button"
          onClick={() => navigateBackOrPath(PAYMENTS_HUB_PATH)}
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <p className="mt-6 text-lg font-black uppercase tracking-[0.28em] text-zinc-600 sm:text-xl">
          Track order
        </p>

        <div className="mt-2 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
              Open order tracking
            </h1>
            <p className="mt-2 text-sm leading-7 text-zinc-600 sm:text-base">
              Enter the order reference to view tracking and delivery updates.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Enter order reference"
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white hover:bg-zinc-800"
            >
              Track order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

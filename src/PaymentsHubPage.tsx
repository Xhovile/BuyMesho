import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CreditCard,
  ShieldAlert,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react";
import {
  BUYER_PAYMENTS_PATH,
  CART_PATH,
  EXPLORE_PATH,
  navigateBackOrPath,
  navigateToOrderDispute,
  navigateToOrderTracking,
  navigateToPath,
} from "./lib/appNavigation";

type HubCardProps = {
  icon: typeof Wallet;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

function HubCard({ icon: Icon, title, description, actionLabel, onAction }: HubCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-800">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black tracking-tight text-zinc-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
        </div>
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
        >
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}

export default function PaymentsHubPage() {
  const [trackReference, setTrackReference] = useState("");
  const [disputeReference, setDisputeReference] = useState("");

  const handleTrackOrderSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reference = trackReference.trim();
    if (!reference) return;
    navigateToOrderTracking(reference);
  };

  const handleDisputeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reference = disputeReference.trim();
    if (!reference) return;
    navigateToOrderDispute(reference);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <button
          type="button"
          onClick={() => navigateBackOrPath(EXPLORE_PATH)}
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Payments hub</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
            All buyer payment actions in one place
          </h1>

          <div className="mt-8 space-y-4">
            <HubCard
              icon={Wallet}
              title="Payment Method"
              description="Add Card details, Mobile Money, and saved payment setup."
              actionLabel="Manage Payment Setup"
              onAction={() => navigateToPath(BUYER_PAYMENTS_PATH)}
            />

            <HubCard
              icon={ShoppingCart}
              title="Cart"
              description="Add different items, review available and added items, buy at once, and press Pay."
              actionLabel="Open Cart"
              onAction={() => navigateToPath(CART_PATH)}
            />

            <article className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-800">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black tracking-tight text-zinc-950">Track Order</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Buyer track-order form using the existing order reference flow.
                  </p>
                </div>
              </div>

              <form onSubmit={handleTrackOrderSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={trackReference}
                  onChange={(event) => setTrackReference(event.target.value)}
                  placeholder="Enter order reference"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
                >
                  Track
                </button>
              </form>
            </article>

            <HubCard
              icon={CreditCard}
              title="Buyer Payments"
              description="Show payment statuses such as pending, paid, rejected, and error."
              actionLabel="Open Buyer Payments"
              onAction={() => navigateToPath(BUYER_PAYMENTS_PATH)}
            />

            <article className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-800">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black tracking-tight text-zinc-950">Disputes</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Open cases linked to an order or payment record.
                  </p>
                </div>
              </div>

              <form onSubmit={handleDisputeSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={disputeReference}
                  onChange={(event) => setDisputeReference(event.target.value)}
                  placeholder="Enter order/payment reference"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
                >
                  Open Dispute
                </button>
              </form>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}

import { ArrowLeft, BadgeCheck, CreditCard, History, ShieldCheck } from "lucide-react";
import { navigateBackOrPath, navigateToPath, EXPLORE_PATH, CART_PATH } from "./lib/appNavigation";

const paymentStages = [
  "Order placed",
  "Payment pending",
  "Payment confirmed",
  "Funds in escrow",
  "Delivered",
  "Funds released",
];

export default function BuyerPaymentsPage() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigateBackOrPath(EXPLORE_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            type="button"
            onClick={() => navigateToPath(CART_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-zinc-800"
          >
            <CreditCard className="h-4 w-4" />
            Cart
          </button>
        </div>

        <section className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-900 text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Buyer payments</p>
              <h1 className="text-3xl font-black tracking-tight text-zinc-950">Track your purchase and payment state</h1>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">System truth</p>
              <h2 className="mt-2 text-xl font-black text-zinc-950">Payment, order, escrow</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                This page is for the buyer's own payment journey. It does not expose admin logs or raw webhook data.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Buyer actions</p>
              <h2 className="mt-2 text-xl font-black text-zinc-950">Confirm delivery</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                The buyer should only see simple actions like confirming delivery or opening a dispute.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Escrow safety</p>
              <h2 className="mt-2 text-xl font-black text-zinc-950">Funds stay protected</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Funds remain held until delivery is confirmed, keeping the buyer and seller process clean.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                <History className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Progress tracker</p>
                <h2 className="text-lg font-black text-zinc-950">Transaction flow</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {paymentStages.map((stage, index) => (
                <div key={stage} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-900 text-xs font-black text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm font-bold text-zinc-900">{stage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-5 w-5 text-red-900" />
                <h2 className="text-lg font-black text-zinc-950">What belongs here</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
                <li>Order status</li>
                <li>Payment status</li>
                <li>Escrow status</li>
                <li>Delivery confirmation</li>
                <li>Dispute action</li>
              </ul>
            </div>

            <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-red-900" />
                <h2 className="text-lg font-black text-zinc-950">What stays out</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
                <li>Webhook logs</li>
                <li>Invalid signature details</li>
                <li>Admin failure tables</li>
                <li>Raw payment rows</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

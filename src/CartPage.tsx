import { ArrowLeft, CheckCircle2, ShoppingCart } from "lucide-react";
import { navigateBackOrPath, navigateToBuyerPayments, EXPLORE_PATH } from "./lib/appNavigation";

const cartItems = [
  {
    title: "Sample item",
    note: "Saved for later checkout",
  },
  {
    title: "Campus essentials",
    note: "Ready for payment",
  },
];

export default function CartPage() {
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
            onClick={() => navigateToBuyerPayments()}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-zinc-800"
          >
            <CheckCircle2 className="h-4 w-4" />
            Buyer Payments
          </button>
        </div>

        <section className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-900 text-white">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Cart</p>
              <h1 className="text-3xl font-black tracking-tight text-zinc-950">Items ready for checkout</h1>
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-600">
            This is the buyer's holding area before payment. Keep it simple: selected items, summary, and a clear path to checkout.
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
              <h2 className="text-lg font-black text-zinc-950">Cart items</h2>
              <div className="mt-4 space-y-3">
                {cartItems.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <p className="text-sm font-bold text-zinc-900">{item.title}</p>
                    <p className="mt-1 text-sm text-zinc-500">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
              <h2 className="text-lg font-black text-zinc-950">Checkout summary</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-600">
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span>Items</span>
                  <span className="font-bold text-zinc-900">{cartItems.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span>Payment status</span>
                  <span className="font-bold text-zinc-900">Pending</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span>Escrow status</span>
                  <span className="font-bold text-zinc-900">Not started</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

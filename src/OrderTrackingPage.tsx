import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, CheckCircle2, CreditCard, Truck } from "lucide-react";
import { navigateBackOrPath, navigateToPath, CART_PATH, EXPLORE_PATH } from "./lib/appNavigation";
import { readBuyerPayments, type BuyerPaymentRecord } from "./lib/buyerState";

const stages = ["Order placed", "Payment pending", "Payment confirmed", "Funds in escrow", "Delivered", "Funds released"];

export default function OrderTrackingPage() {
  const [payments, setPayments] = useState<BuyerPaymentRecord[]>([]);

  useEffect(() => {
    const sync = () => setPayments(readBuyerPayments());
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === "__buymesho_buyer_payments") sync();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const latest = useMemo(() => payments[0] ?? null, [payments]);
  const activeIndex = latest?.status === "captured" ? 2 : latest?.status === "failed" ? 1 : latest?.status === "refunded" ? 5 : latest?.status === "cancelled" ? 1 : 0;

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigateBackOrPath(EXPLORE_PATH)} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"><ArrowLeft className="h-4 w-4" />Back</button>
          <button type="button" onClick={() => navigateToPath(CART_PATH)} className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-zinc-800"><CreditCard className="h-4 w-4" />Cart</button>
        </div>

        <section className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-900 text-white"><Truck className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Buyer order tracking</p>
              <h1 className="text-3xl font-black tracking-tight text-zinc-950">Track the order without admin noise</h1>
            </div>
          </div>

          {latest ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
                <h2 className="text-lg font-black text-zinc-950">Progress</h2>
                <div className="mt-4 grid gap-3">
                  {stages.map((stage, index) => {
                    const active = index <= activeIndex;
                    return (
                      <div key={stage} className={`flex items-center gap-3 rounded-2xl border p-4 ${active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700"}`}>
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${active ? "bg-white text-zinc-900" : "bg-zinc-100 text-zinc-700"}`}>{index + 1}</div>
                        <div>
                          <p className="text-sm font-bold">{stage}</p>
                          {index === activeIndex ? <p className={`text-xs ${active ? "text-zinc-200" : "text-zinc-500"}`}>Current state</p> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
                <div className="flex items-center gap-3"><BadgeCheck className="h-5 w-5 text-red-900" /><h2 className="text-lg font-black text-zinc-950">Order details</h2></div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3"><span className="text-zinc-500">Reference</span><p className="mt-1 font-semibold text-zinc-900 break-all">{latest.reference}</p></div>
                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3"><span className="text-zinc-500">Item</span><p className="mt-1 font-semibold text-zinc-900">{latest.listingTitle}</p></div>
                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3"><span className="text-zinc-500">Payment status</span><p className="mt-1 font-semibold text-zinc-900">{latest.status}</p></div>
                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3"><span className="text-zinc-500">Order ID</span><p className="mt-1 font-semibold text-zinc-900 break-all">{latest.orderId ?? "—"}</p></div>
                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3"><span className="text-zinc-500">Total</span><p className="mt-1 font-semibold text-zinc-900">MWK {latest.totalPrice.toLocaleString()}</p></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[2rem] border border-zinc-200 bg-zinc-50 p-6 text-sm leading-6 text-zinc-600">
              No tracking record yet. Start from the cart or checkout flow and the latest order will appear here.
            </div>
          )}

        </section>
      </div>
    </div>
  );
}

import { ArrowLeft, CreditCard, ShieldAlert, ShoppingCart, Truck, Wallet } from "lucide-react";
import {
  BALANCE_PATH,
  BUYER_PAYMENTS_PATH,
  CART_PATH,
  DISPUTES_PATH,
  EXPLORE_PATH,
  PAYMENTS_HUB_PATH,
  PAYMENT_METHOD_PATH,
  TRACK_ORDER_PATH,
  navigateBackOrPath,
  navigateToPath,
} from "./lib/appNavigation";

const paymentActions = [
  { label: "Balance", icon: Wallet, path: BALANCE_PATH },
  { label: "Payment Method", icon: CreditCard, path: PAYMENT_METHOD_PATH },
  { label: "Cart", icon: ShoppingCart, path: CART_PATH },
  { label: "Track Order", icon: Truck, path: TRACK_ORDER_PATH },
  { label: "Buyer Payments", icon: CreditCard, path: BUYER_PAYMENTS_PATH },
  { label: "Disputes", icon: ShieldAlert, path: DISPUTES_PATH },
] as const;

export default function PaymentsHubPage() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <button
          type="button"
          onClick={() => navigateBackOrPath(EXPLORE_PATH)}
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Payments</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">Payment actions</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Select one section below to open its separate page.
          </p>

          <nav className="mt-6 rounded-[1.75rem] border border-zinc-200 bg-zinc-50">
            <ol>
              {paymentActions.map((action, index) => (
                <li key={action.label} className={index > 0 ? "border-t border-zinc-200" : ""}>
                  <button
                    type="button"
                    onClick={() => navigateToPath(action.path)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-bold text-zinc-800 hover:bg-white"
                    aria-label={`Open ${action.label}`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-zinc-700">
                      <action.icon className="h-4 w-4" />
                    </span>
                    <span>{action.label}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <p className="mt-4 text-xs text-zinc-500">Current page: {PAYMENTS_HUB_PATH}</p>
        </section>
      </div>
    </div>
  );
}

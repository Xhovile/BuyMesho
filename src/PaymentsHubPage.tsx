import { useMemo } from "react";
import { ArrowLeft, ChevronRight, Receipt, ShieldAlert, Ticket, Truck } from "lucide-react";
import {
  BUYER_PAYMENTS_PATH,
  DISPUTES_PATH,
  EXPLORE_PATH,
  TICKETS_PATH,
  TRACK_ORDER_PATH,
  navigateBackOrPath,
  navigateToPath,
} from "./lib/appNavigation";
import { useAccountProfile } from "./hooks/useAccountProfile";

const paymentActions = [
  { label: "Purchases", path: BUYER_PAYMENTS_PATH, icon: Receipt, iconBg: "bg-emerald-300" },
  { label: "Tickets", path: TICKETS_PATH, icon: Ticket, iconBg: "bg-bm-brand" },
  { label: "Track Order", path: TRACK_ORDER_PATH, icon: Truck, iconBg: "bg-blue-500" },
  { label: "Disputes", path: DISPUTES_PATH, icon: ShieldAlert, iconBg: "bg-red-900" },
] as const;

export default function PaymentsHubPage() {
  const { profile, profileLoading } = useAccountProfile();
  const showSellerBalanceAction = !profileLoading && !!profile?.is_seller;
  const visibleActions = useMemo(
    () => paymentActions,
    [showSellerBalanceAction]
  );

  return (
    <div className="min-h-screen bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text dark:text-bm-text">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <button
          type="button"
          onClick={() => navigateBackOrPath(EXPLORE_PATH)}
          className="inline-flex items-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-3 text-sm font-bold text-bm-text dark:text-bm-text-muted shadow-sm hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <p className="mt-6 text-lg font-black uppercase tracking-[0.28em] text-bm-text-muted dark:text-bm-text-muted sm:text-xl">Payments</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-bm-text dark:text-bm-text sm:text-5xl">Payment actions</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-bm-text-muted dark:text-bm-text-muted sm:text-base">
          Select one section below to open its separate page.
        </p>

        <nav className="mt-8 overflow-hidden rounded-[1.75rem] border border-bm-border dark:border-bm-border bg-bm-surface shadow-sm">
          <ol>
            {visibleActions.map((action, index) => (
              <li key={action.label} className={index > 0 ? "border-t border-bm-border dark:border-bm-border" : ""}>
                <button
                  type="button"
                  onClick={() => navigateToPath(action.path)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-bold text-bm-text dark:text-bm-text-muted hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
                  aria-label={`Open ${action.label}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${action.iconBg} text-bm-on-brand`}>
                    <action.icon className="h-4 w-4" />
                  </span>
                  <span>{action.label}</span>
                  <ChevronRight className="ml-auto h-4 w-4 text-bm-on-brand" />
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}

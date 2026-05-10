import { useState } from "react";
import { ArrowLeft, ChevronRight, Wallet } from "lucide-react";
import {
  EXPLORE_PATH,
  PAYMENTS_HUB_PATH,
  navigateBackOrPath,
} from "./lib/appNavigation";
import { useAccountProfile } from "./hooks/useAccountProfile";
import FeedbackModal from "./components/FeedbackModal";

const sellerBalanceAction = { label: "Balance", icon: Wallet, iconBg: "bg-zinc-500" } as const;

export default function PaymentsHubPage() {
  const { profile, profileLoading } = useAccountProfile();
  const [showComingSoon, setShowComingSoon] = useState(false);
  const showSellerBalanceAction = !profileLoading && !!profile?.is_seller;

  return (
    <>
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

          <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-zinc-600">Payments</p>

          <section className="mt-2 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-3xl font-black tracking-tight text-zinc-950">Payment actions</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Select one section below to open its separate page.
            </p>

            {showSellerBalanceAction ? (
              <nav className="mt-6 rounded-[1.75rem] border border-zinc-200 bg-zinc-50">
                <ol>
                  <li>
                    <button
                      type="button"
                      onClick={() => setShowComingSoon(true)}
                      className="flex w-full items-center gap-3 bg-white px-5 py-4 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50"
                      aria-label={`Open ${sellerBalanceAction.label}`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sellerBalanceAction.iconBg} text-white`}>
                        <sellerBalanceAction.icon className="h-4 w-4" />
                      </span>
                      <span>{sellerBalanceAction.label}</span>
                      <ChevronRight className="ml-auto h-4 w-4 text-zinc-300" />
                    </button>
                  </li>
                </ol>
              </nav>
            ) : null}

            <p className="mt-4 text-xs text-zinc-500">Current page: {PAYMENTS_HUB_PATH}</p>
          </section>
        </div>
      </div>
      <FeedbackModal
        open={showComingSoon}
        type="info"
        title="Coming soon"
        message="This feature is coming soon."
        onClose={() => setShowComingSoon(false)}
        actions={[
          {
            label: "Cancel",
            onClick: () => setShowComingSoon(false),
            variant: "secondary",
          },
        ]}
      />
    </>
  );
}

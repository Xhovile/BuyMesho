import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Eye,
  Loader2,
  MapPin,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import AccountPageShell from "./components/AccountPageShell";
import PayoutActionRequiredBanner from "./components/payouts/PayoutActionRequiredBanner";
import SellerEarningsSummary from "./components/payouts/SellerEarningsSummary";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { apiFetch } from "./lib/api";
import { navigateToPath } from "./lib/appNavigation";
import { buildSellerEarningsSummary } from "./modules/payouts/summary";
import type { PayoutRecord } from "./modules/payouts/types";
import type { SellerDashboardData } from "./types";

type PayoutDestination = {
  id: string;
  isActive: boolean;
  verificationStatus: string;
  maskedAccount?: string | null;
};

function formatNumber(value: number | string | null | undefined) {
  const safeValue = Number(value ?? 0);
  if (!Number.isFinite(safeValue)) return "0";
  return safeValue.toLocaleString();
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
            {value}
          </p>
          {helper ? (
            <p className="mt-1 text-xs font-medium text-zinc-500">{helper}</p>
          ) : null}
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-700">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export default function SellerDashboardPage() {
  const { firebaseUser, authLoading, profile, profileLoading } =
    useAccountProfile();
  const [dashboard, setDashboard] = useState<SellerDashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [payoutDestinations, setPayoutDestinations] = useState<
    PayoutDestination[] | null
  >(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRecord[]>([]);
  const [payoutDestinationError, setPayoutDestinationError] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!firebaseUser || !profile?.is_seller) {
      setDashboard(null);
      setDashboardLoading(false);
      return;
    }

    setDashboardLoading(true);
    setDashboardError(null);

    try {
      const data = (await apiFetch("/api/seller/dashboard")) as SellerDashboardData;
      setDashboard(data);
    } catch (error: any) {
      console.error("Failed to load seller dashboard", error);
      setDashboard(null);
      setDashboardError(error?.message || "Failed to load seller dashboard.");
    } finally {
      setDashboardLoading(false);
    }
  }, [firebaseUser, profile?.is_seller]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const loadPayoutData = async () => {
      if (!firebaseUser || !profile?.is_seller) {
        setPayoutDestinations(null);
        setPayoutHistory([]);
        setPayoutDestinationError(false);
        return;
      }

      setPayoutDestinationError(false);
      try {
        const [destinationsResult, historyResult] = await Promise.allSettled([
          apiFetch("/api/payouts/destinations"),
          apiFetch(`/api/payouts/history/${encodeURIComponent(firebaseUser.uid)}`),
        ]);

        setPayoutDestinations(
          destinationsResult.status === "fulfilled" &&
            Array.isArray(destinationsResult.value?.destinations)
            ? destinationsResult.value.destinations
            : [],
        );
        setPayoutHistory(
          historyResult.status === "fulfilled" &&
            Array.isArray(historyResult.value?.payouts)
            ? historyResult.value.payouts
            : [],
        );
      } catch (error) {
        console.error("Failed to load payout data", error);
        setPayoutDestinations(null);
        setPayoutHistory([]);
        setPayoutDestinationError(true);
      }
    };

    void loadPayoutData();
  }, [firebaseUser, profile?.is_seller]);

  const dashboardEarningsSummary = useMemo(() => {
    const payoutTotals =
      dashboard?.payouts ??
      dashboard?.payouts_summary ??
      dashboard?.payoutSummary ??
      dashboard?.payout_summary ??
      dashboard?.earnings ??
      dashboard?.earnings_summary ??
      null;

    return buildSellerEarningsSummary({
      ...(payoutTotals ?? {}),
      payouts: payoutHistory,
      destinations: payoutDestinations ?? undefined,
    });
  }, [dashboard, payoutDestinations, payoutHistory]);

  const handleRetry = () => {
    void loadDashboard();
  };

  if (authLoading || profileLoading) {
    return (
      <AccountPageShell
        eyebrow="Seller"
        title="Dashboard"
        description="Review your seller performance, payouts, and listing traction."
        backLabel="Back to Listings"
        onBack={() => navigateToPath("/my-listings")}
        childrenSectionClassName="w-full"
      >
        <div className="flex items-center justify-center gap-3 rounded-[2rem] border border-zinc-200 bg-white p-10 text-zinc-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading dashboard...
        </div>
      </AccountPageShell>
    );
  }

  if (!firebaseUser) {
    return (
      <AccountPageShell
        eyebrow="Seller"
        title="Dashboard"
        description="Review your seller performance, payouts, and listing traction."
        backLabel="Back to Listings"
        onBack={() => navigateToPath("/my-listings")}
        childrenSectionClassName="w-full"
      >
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">
            Login required
          </h2>
          <p className="mt-3 text-sm text-zinc-500">
            You need to log in before opening the seller dashboard.
          </p>
          <button
            type="button"
            onClick={() => navigateToPath("/login")}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            Go to Login
          </button>
        </div>
      </AccountPageShell>
    );
  }

  if (!profile?.is_seller) {
    return (
      <AccountPageShell
        eyebrow="Seller"
        title="Dashboard"
        description="Review your seller performance, payouts, and listing traction."
        backLabel="Back to Listings"
        onBack={() => navigateToPath("/my-listings")}
        childrenSectionClassName="w-full"
      >
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">
            Seller access required
          </h2>
          <p className="mt-3 text-sm text-zinc-500">
            Only seller accounts can access this dashboard.
          </p>
          <button
            type="button"
            onClick={() => navigateToPath("/become-seller")}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            Become a Seller
          </button>
        </div>
      </AccountPageShell>
    );
  }

  const totalListings = dashboard?.stats.total_listings ?? 0;
  const activeListings = dashboard?.stats.active_listings ?? 0;
  const soldListings = dashboard?.stats.sold_listings ?? 0;
  const totalViews = dashboard?.stats.total_views ?? 0;
  const profileViews = dashboard?.seller.profile_views ?? 0;
  const campusCount = dashboard?.byCampus?.length ?? 0;
  const topListing = dashboard?.top_listing ?? null;

  return (
    <AccountPageShell
      eyebrow="Seller"
      title="Dashboard"
      description="Review your seller performance, payouts, and listing traction."
      backLabel="Back to Listings"
      onBack={() => navigateToPath("/my-listings")}
      childrenSectionClassName="w-full"
    >
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Seller performance
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-900">
                Live dashboard
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                A clean readout of reach, traction, and seller health. Keep the
                management work in My Listings.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => navigateToPath("/my-listings")}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm shadow-indigo-100 hover:bg-indigo-700"
              >
                <ArrowRight className="h-4 w-4" />
                My Listings
              </button>
            </div>
          </div>
        </div>

        {dashboardLoading ? (
          <div className="flex min-h-[220px] items-center justify-center gap-3 rounded-[2rem] border border-zinc-200 bg-white p-10 text-zinc-500 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading dashboard metrics...
          </div>
        ) : dashboardError ? (
          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-center text-red-900 shadow-sm">
            <h3 className="text-lg font-black tracking-tight">Dashboard failed to load</h3>
            <p className="mt-2 text-sm font-medium">{dashboardError}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              Try Again
            </button>
          </div>
        ) : dashboard ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard
                icon={BarChart3}
                label="Total listings"
                value={formatNumber(totalListings)}
                helper="All listings in the account"
              />
              <StatCard
                icon={TrendingUp}
                label="Active listings"
                value={formatNumber(activeListings)}
                helper="Listings still available"
              />
              <StatCard
                icon={Users}
                label="Sold listings"
                value={formatNumber(soldListings)}
                helper="Listings fully sold out"
              />
              <StatCard
                icon={Eye}
                label="Total views"
                value={formatNumber(totalViews)}
                helper="Combined listing views"
              />
              <StatCard
                icon={Eye}
                label="Profile views"
                value={formatNumber(profileViews)}
                helper="Seller profile visits"
              />
              <StatCard
                icon={Wallet}
                label="Campuses"
                value={formatNumber(campusCount)}
                helper="Locations with listings"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                      Top listing
                    </p>
                    <h3 className="mt-2 text-xl font-black tracking-tight text-zinc-900">
                      Best performing item
                    </h3>
                  </div>
                  <div className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-600">
                    {dashboard.stats.repeat_seller_activity
                      ? "Returning seller"
                      : "New seller activity"}
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4">
                  {topListing ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-lg font-black tracking-tight text-zinc-900">
                          {topListing.name}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {formatNumber(topListing.views_count)} views · {topListing.status}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                        <span className="font-bold text-zinc-900">Created:</span>{" "}
                        {new Date(topListing.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">No top listing data yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Actions
                </p>
                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => navigateToPath("/my-listings")}
                    className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm font-bold text-zinc-900 hover:bg-zinc-100"
                  >
                    <span>Open My Listings</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToPath("/seller/payouts")}
                    className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm font-bold text-zinc-900 hover:bg-zinc-100"
                  >
                    <span>Open Seller Payouts</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToPath("/profile")}
                    className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm font-bold text-zinc-900 hover:bg-zinc-100"
                  >
                    <span>Open Profile</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                      By campus
                    </p>
                    <h3 className="mt-2 text-xl font-black tracking-tight text-zinc-900">
                      Listing spread
                    </h3>
                  </div>
                  <MapPin className="h-5 w-5 text-zinc-400" />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {dashboard.byCampus?.length ? (
                    dashboard.byCampus.map((campusItem) => (
                      <div
                        key={campusItem.university}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                      >
                        <p className="line-clamp-1 text-sm font-bold text-zinc-900">
                          {campusItem.university}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {campusItem.count} listing{campusItem.count === 1 ? "" : "s"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">No campus breakdown yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                      Payouts
                    </p>
                    <h3 className="mt-2 text-xl font-black tracking-tight text-zinc-900">
                      Earnings and destination status
                    </h3>
                  </div>
                  <Wallet className="h-5 w-5 text-zinc-400" />
                </div>

                <div className="mt-4 rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
                  <SellerEarningsSummary summary={dashboardEarningsSummary} compact />
                </div>

                {!payoutDestinationError ? (
                  <div className="mt-4">
                    <PayoutActionRequiredBanner
                      summary={dashboardEarningsSummary}
                      destinations={payoutDestinations}
                      onAction={() => navigateToPath("/seller/payouts")}
                      actionLabel="Open Payouts"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AccountPageShell>
  );
}

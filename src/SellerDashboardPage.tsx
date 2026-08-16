import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BarChart3, Eye, Loader2, MapPin, RefreshCw, TrendingUp, Users, Wallet } from "lucide-react";
import AccountPageShell from "./components/AccountPageShell";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { apiFetch } from "./lib/api";
import { navigateToPath } from "./lib/appNavigation";
import type { Listing } from "./types";

type SellerProfile = {
  uid: string;
  business_name: string | null;
  profile_views: number;
};

type DashboardState = {
  seller: SellerProfile;
  stats: {
    total_listings: number;
    active_listings: number;
    sold_listings: number;
    total_views: number;
    repeat_seller_activity: boolean;
  };
  byCampus: {
    university: string;
    count: number;
  }[];
  top_listing: {
    id: number;
    name: string;
    views_count: number;
    status: string;
    created_at: string;
  } | null;
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
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-zinc-900">{value}</p>
          {helper ? <p className="mt-1 text-xs font-medium text-zinc-500">{helper}</p> : null}
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-700">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

async function fetchSellerProfile(uid: string): Promise<SellerProfile> {
  try {
    return (await apiFetch(`/api/sellers/${uid}`)) as SellerProfile;
  } catch {
    return (await apiFetch(`/api/users/${uid}`)) as SellerProfile;
  }
}

async function fetchSellerListings(uid: string): Promise<Listing[]> {
  try {
    const data = await apiFetch(`/api/sellers/${uid}/listings`);
    return Array.isArray(data) ? (data as Listing[]) : [];
  } catch {
    const data = await apiFetch(`/api/users/${uid}/listings`);
    return Array.isArray(data) ? (data as Listing[]) : [];
  }
}

function buildDashboard(seller: SellerProfile, listings: Listing[]): DashboardState {
  const totalListings = listings.length;
  const activeListings = listings.filter((item) => String(item.status).toLowerCase() !== "sold").length;
  const soldListings = listings.filter((item) => String(item.status).toLowerCase() === "sold").length;
  const totalViews = listings.reduce((sum, item) => sum + Number(item.views_count ?? 0), 0);
  const repeatSellerActivity = totalListings > 1 || soldListings > 0;

  const byCampusMap = new Map<string, number>();
  for (const item of listings) {
    const campus = typeof item.university === "string" && item.university.trim() ? item.university.trim() : "Unknown campus";
    byCampusMap.set(campus, (byCampusMap.get(campus) ?? 0) + 1);
  }

  const byCampus = Array.from(byCampusMap.entries())
    .map(([university, count]) => ({ university, count }))
    .sort((a, b) => b.count - a.count || a.university.localeCompare(b.university));

  const topListingSource = [...listings].sort((a, b) => {
    const viewsA = Number(a.views_count ?? 0);
    const viewsB = Number(b.views_count ?? 0);
    if (viewsB !== viewsA) return viewsB - viewsA;
    return new Date(String(b.created_at ?? 0)).getTime() - new Date(String(a.created_at ?? 0)).getTime();
  })[0];

  return {
    seller: {
      uid: seller.uid,
      business_name: seller.business_name ?? null,
      profile_views: Number(seller.profile_views ?? 0),
    },
    stats: {
      total_listings: totalListings,
      active_listings: activeListings,
      sold_listings: soldListings,
      total_views: totalViews,
      repeat_seller_activity: repeatSellerActivity,
    },
    byCampus,
    top_listing: topListingSource
      ? {
          id: Number(topListingSource.id),
          name: typeof topListingSource.name === "string" ? topListingSource.name : "Untitled listing",
          views_count: Number(topListingSource.views_count ?? 0),
          status: String(topListingSource.status ?? "available"),
          created_at: String(topListingSource.created_at ?? new Date().toISOString()),
        }
      : null,
  };
}

export default function SellerDashboardPage() {
  const { firebaseUser, authLoading, profile, profileLoading } = useAccountProfile();
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!firebaseUser || !profile?.is_seller) {
      setDashboard(null);
      setDashboardLoading(false);
      return;
    }

    setDashboardLoading(true);
    setDashboardError(null);

    try {
      const [sellerResult, listingsResult] = await Promise.allSettled([
        fetchSellerProfile(firebaseUser.uid),
        fetchSellerListings(firebaseUser.uid),
      ]);

      const seller =
        sellerResult.status === "fulfilled"
          ? sellerResult.value
          : {
              uid: firebaseUser.uid,
              business_name: profile.business_name ?? null,
              profile_views: 0,
            };
      const listings = listingsResult.status === "fulfilled" ? listingsResult.value : [];

      if (sellerResult.status !== "fulfilled" && listingsResult.status !== "fulfilled") {
        throw sellerResult.reason ?? listingsResult.reason ?? new Error("Failed to load seller dashboard data.");
      }

      setDashboard(buildDashboard(seller, listings));
    } catch (error: any) {
      console.error("Failed to load seller dashboard", error);
      setDashboard(null);
      setDashboardError(error?.message || "Failed to load seller dashboard.");
    } finally {
      setDashboardLoading(false);
    }
  }, [firebaseUser, profile?.business_name, profile?.is_seller]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleRetry = () => {
    void loadDashboard();
  };

  if (authLoading || profileLoading) {
    return (
      <AccountPageShell
        eyebrow="Seller"
        title="Dashboard"
        description="Review your seller performance and listing traction."
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
        description="Review your seller performance and listing traction."
        backLabel="Back to Listings"
        onBack={() => navigateToPath("/my-listings")}
        childrenSectionClassName="w-full"
      >
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">Login required</h2>
          <p className="mt-3 text-sm text-zinc-500">You need to log in before opening the seller dashboard.</p>
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
        description="Review your seller performance and listing traction."
        backLabel="Back to Listings"
        onBack={() => navigateToPath("/my-listings")}
        childrenSectionClassName="w-full"
      >
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">Seller access required</h2>
          <p className="mt-3 text-sm text-zinc-500">Only seller accounts can access this dashboard.</p>
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
      description="Review your seller performance, listings, and traction in one place."
      backLabel="Back to Listings"
      onBack={() => navigateToPath("/my-listings")}
      childrenSectionClassName="w-full"
    >
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-900">Live dashboard</h2>
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
              <StatCard icon={BarChart3} label="Total listings" value={formatNumber(totalListings)} helper="All listings in the account" />
              <StatCard icon={TrendingUp} label="Active listings" value={formatNumber(activeListings)} helper="Listings still available" />
              <StatCard icon={Users} label="Sold listings" value={formatNumber(soldListings)} helper="Listings fully sold out" />
              <StatCard icon={Eye} label="Total views" value={formatNumber(totalViews)} helper="Combined listing views" />
              <StatCard icon={Eye} label="Profile views" value={formatNumber(profileViews)} helper="Seller profile visits" />
              <StatCard icon={Wallet} label="Campuses" value={formatNumber(campusCount)} helper="Locations with listings" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Top listing</p>
                    <h3 className="mt-2 text-xl font-black tracking-tight text-zinc-900">Best performing item</h3>
                  </div>
                  <div className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-600">
                    {dashboard.stats.repeat_seller_activity ? "Returning seller" : "New seller activity"}
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4">
                  {topListing ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-lg font-black tracking-tight text-zinc-900">{topListing.name}</p>
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
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Actions</p>
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
                    <span>Open Business Profile</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">By campus</p>
                    <h3 className="mt-2 text-xl font-black tracking-tight text-zinc-900">Listing spread</h3>
                  </div>
                  <MapPin className="h-5 w-5 text-zinc-400" />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {dashboard.byCampus.length ? (
                    dashboard.byCampus.map((campusItem) => (
                      <div
                        key={campusItem.university}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                      >
                        <p className="line-clamp-1 text-sm font-bold text-zinc-900">{campusItem.university}</p>
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
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Seller identity</p>
                    <h3 className="mt-2 text-xl font-black tracking-tight text-zinc-900">
                      {dashboard.seller.business_name || "Your seller profile"}
                    </h3>
                  </div>
                  <Wallet className="h-5 w-5 text-zinc-400" />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Profile views</p>
                    <p className="mt-2 text-xl font-black text-zinc-900">{formatNumber(profileViews)}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Account status</p>
                    <p className="mt-2 text-xl font-black text-zinc-900">Active</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AccountPageShell>
  );
}

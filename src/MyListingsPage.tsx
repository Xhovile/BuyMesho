import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import AccountPageShell from "./components/AccountPageShell";
import ListingCard from "./components/ListingCard";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { apiFetch } from "./lib/api";
import { navigateToEditListing, navigateToListingDetails, navigateToPath, navigateToSellerProfile } from "./lib/appNavigation";
import type { Listing, SellerDashboardData } from "./types";

export default function MyListingsPage() {
  const { firebaseUser, authLoading, profile, profileLoading } = useAccountProfile();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<SellerDashboardData | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<number | null>(null);

  useEffect(() => {
    const loadListings = async () => {
      if (!firebaseUser || !profile?.is_seller) {
        setListings([]);
        setLoadingListings(false);
        return;
      }

      setLoadingListings(true);
      try {
        const data = await apiFetch(`/api/users/${firebaseUser.uid}/listings`);
        setListings(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load my listings", error);
        setListings([]);
      } finally {
        setLoadingListings(false);
      }
    };

    void loadListings();
  }, [firebaseUser, profile?.is_seller]);

  const handleDashboardToggle = async () => {
    if (!firebaseUser || !profile?.is_seller) return;

    if (dashboardOpen) {
      setDashboardOpen(false);
      return;
    }

    setDashboardOpen(true);
    if (dashboard || dashboardLoading) return;

    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await apiFetch("/api/seller/dashboard");
      setDashboard(data);
    } catch (error: any) {
      console.error("Failed to load seller dashboard", error);
      setDashboardError(error?.message || "Failed to load dashboard.");
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleToggleStatus = async (listing: Listing) => {
    if (togglingStatus === listing.id) return;
    const newStatus = listing.status === "sold" ? "available" : "sold";
    setTogglingStatus(listing.id);
    try {
      await apiFetch(`/api/listings/${listing.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, status: newStatus } : l)));
      const delta = newStatus === "sold" ? 1 : -1;
      setDashboard((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                sold_listings: prev.stats.sold_listings + delta,
                active_listings: prev.stats.active_listings - delta,
              },
            }
          : null
      );
    } catch (error) {
      console.error("Failed to toggle listing status", error);
    } finally {
      setTogglingStatus(null);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Seller"
      title="My Listings & Dashboard"
      description="Manage the listings you posted, review status, and open each listing from a clean marketplace-style card."
      backLabel="Back to Profile"
      onBack={() => navigateToPath("/profile")}
      childrenSectionClassName="overflow-visible"
    >
      {authLoading || profileLoading || loadingListings ? (
        <div className="p-10 flex items-center justify-center gap-3 text-zinc-500 font-medium">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading your listings...
        </div>
      ) : !firebaseUser ? (
        <div className="p-10 text-center">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">Login required</h2>
          <p className="mt-3 text-sm text-zinc-500">You need to log in before opening your listings page.</p>
          <button
            type="button"
            onClick={() => navigateToPath("/login")}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            Go to Login
          </button>
        </div>
      ) : !profile?.is_seller ? (
        <div className="p-10 text-center">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">Seller access required</h2>
          <p className="mt-3 text-sm text-zinc-500">Only seller accounts can access My Listings.</p>
          <button
            type="button"
            onClick={() => navigateToPath("/become-seller")}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            Become a Seller
          </button>
        </div>
      ) : listings.length === 0 ? (
        <div className="p-10 text-center">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">No listings yet</h2>
          <p className="mt-3 text-sm text-zinc-500">You have not posted any listings yet.</p>
          <button
            type="button"
            onClick={() => navigateToPath("/create")}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            Create Listing
          </button>
        </div>
      ) : (
        <div className="p-3 sm:p-6 space-y-6">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">Seller performance</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-900">Dashboard</h2>
              </div>
              {dashboardOpen ? (
                <button
                  type="button"
                  onClick={() => void handleDashboardToggle()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-100"
                >
                  Hide Seller Dashboard
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleDashboardToggle()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-zinc-800"
                >
                  <BarChart3 className="w-4 h-4" />
                  Seller Dashboard
                </button>
              )}
            </div>

            {dashboardOpen ? (
              <div className="mt-4">
                {dashboardLoading ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading dashboard...
                  </div>
                ) : dashboardError ? (
                  <p className="text-sm text-red-600">{dashboardError}</p>
                ) : dashboard ? (
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 text-sm">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-xs font-bold uppercase text-zinc-400">Total listings</p>
                      <p className="mt-1 text-lg font-black text-zinc-900">{dashboard.stats.total_listings}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-xs font-bold uppercase text-zinc-400">Active</p>
                      <p className="mt-1 text-lg font-black text-zinc-900">{dashboard.stats.active_listings}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-xs font-bold uppercase text-zinc-400">Sold</p>
                      <p className="mt-1 text-lg font-black text-zinc-900">{dashboard.stats.sold_listings}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-xs font-bold uppercase text-zinc-400">Total views</p>
                      <p className="mt-1 text-lg font-black text-zinc-900">{dashboard.stats.total_views}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-xs font-bold uppercase text-zinc-400">WhatsApp clicks</p>
                      <p className="mt-1 text-lg font-black text-zinc-900">{dashboard.stats.total_whatsapp_clicks}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-xs font-bold uppercase text-zinc-400">Profile views</p>
                      <p className="mt-1 text-lg font-black text-zinc-900">{dashboard.seller.profile_views}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onReport={() => navigateToPath("/report")}
                currentUid={firebaseUser.uid}
                onDelete={async (id) => {
                  await apiFetch(`/api/listings/${id}`, { method: "DELETE" });
                  setListings((prev) => prev.filter((item) => item.id !== id));
                }}
                onEdit={(item) => navigateToEditListing(item.id)}
                onToggleStatus={handleToggleStatus}
                isLoggedIn
                requireLoginForContact={() => navigateToPath("/login")}
                onOpenDetails={(item) => navigateToListingDetails(item.id, 0)}
                onOpenSeller={(uid) => navigateToSellerProfile(uid)}
                compact
                ultraCompact
                showActionsMenu
              />
            ))}
          </div>
        </div>
      )}
    </AccountPageShell>
  );
}

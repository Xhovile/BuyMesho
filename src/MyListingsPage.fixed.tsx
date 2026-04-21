import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import AccountPageShell from "./components/AccountPageShell";
import ListingCard from "./components/ListingCard";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { apiFetch } from "./lib/api";
import {
  navigateToEditListing,
  navigateToListingDetails,
  navigateToPath,
  navigateToSellerProfile,
} from "./lib/appNavigation";
import type { Listing, SellerDashboardData } from "./types";

type ListingActionResponse = {
  success: boolean;
  listing?: Listing;
  available_quantity?: number;
};

export default function MyListingsPage() {
  const { firebaseUser, authLoading, profile, profileLoading } = useAccountProfile();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<SellerDashboardData | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

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

  const applyListingResponse = (updated: Listing) => {
    setListings((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
  };

  const handleRecordSale = async (listing: Listing, quantity: number) => {
    if (!quantity || quantity <= 0) return;
    if (actionLoadingId === listing.id) return;

    setActionLoadingId(listing.id);
    try {
      const result = (await apiFetch(`/api/listings/${listing.id}/record-sale`, {
        method: "POST",
        body: JSON.stringify({ quantity }),
      })) as ListingActionResponse;

      if (result?.listing) {
        applyListingResponse(result.listing);
      }
    } catch (error) {
      console.error("Failed to record sale", error);
      window.alert("Failed to record sale.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestock = async (listing: Listing, quantity: number) => {
    if (!quantity || quantity <= 0) return;
    if (actionLoadingId === listing.id) return;

    setActionLoadingId(listing.id);
    try {
      const result = (await apiFetch(`/api/listings/${listing.id}/restock`, {
        method: "POST",
        body: JSON.stringify({ quantity }),
      })) as ListingActionResponse;

      if (result?.listing) {
        applyListingResponse(result.listing);
      }
    } catch (error) {
      console.error("Failed to restock listing", error);
      window.alert("Failed to restock listing.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const applyListingUpdate = (listingId: number, updater: (listing: Listing) => Listing) => {
    setListings((prev) => prev.map((listing) => (listing.id === listingId ? updater(listing) : listing)));
  };

  const handleToggleStatus = async (listing: Listing) => {
    if (actionLoadingId === listing.id) return;

    const nextStatus = listing.status === "sold" ? "available" : "sold";
    setActionLoadingId(listing.id);
    try {
      await apiFetch(`/api/listings/${listing.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      applyListingUpdate(listing.id, (current) => ({ ...current, status: nextStatus }));

      setDashboard((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                sold_listings: Math.max(0, prev.stats.sold_listings + (nextStatus === "sold" ? 1 : -1)),
                active_listings: Math.max(0, prev.stats.active_listings + (nextStatus === "sold" ? -1 : 1)),
              },
            }
          : null
      );
    } catch (error) {
      console.error("Failed to toggle listing status", error);
      window.alert("Failed to update listing status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteListing = async (listingId: number) => {
    if (actionLoadingId === listingId) return;

    const target = listings.find((item) => item.id === listingId);
    if (!target) return;

    const confirmed = window.confirm(`Delete "${target.name}"?`);
    if (!confirmed) return;

    setActionLoadingId(listingId);
    try {
      await apiFetch(`/api/listings/${listingId}`, { method: "DELETE" });
      setListings((prev) => prev.filter((item) => item.id !== listingId));
      setDashboard((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                total_listings: Math.max(0, prev.stats.total_listings - 1),
                active_listings:
                  target.status === "sold"
                    ? prev.stats.active_listings
                    : Math.max(0, prev.stats.active_listings - 1),
                sold_listings:
                  target.status === "sold"
                    ? Math.max(0, prev.stats.sold_listings - 1)
                    : prev.stats.sold_listings,
              },
            }
          : null
      );
    } catch (error) {
      console.error("Failed to delete listing", error);
      window.alert("Failed to delete listing.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Seller"
      title="My Listings & Dashboard"
      description="Manage your listings, update stock, and review seller performance from one place."
      backLabel="Back to Profile"
      onBack={() => navigateToPath("/profile")}
      childrenSectionClassName="w-full"
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
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Seller performance
                </p>
                <h2 className="text-xl font-black tracking-tight text-zinc-900">Dashboard</h2>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleDashboardToggle()}
                  className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-extrabold transition-all active:scale-95 shadow-sm ${
                    dashboardOpen
                      ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  {dashboardOpen ? "Hide Stats" : "Show Stats"}
                </button>
              </div>
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
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 text-sm">
                      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                        <p className="text-xs font-bold uppercase text-zinc-400">Total listings</p>
                        <p className="mt-1 text-lg font-black text-zinc-900">{dashboard.stats.total_listings}</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                        <p className="text-xs font-bold uppercase text-zinc-400">Active</p>
                        <p className="mt-1 text-lg font-black text-zinc-900">{dashboard.stats.active_listings}</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                        <p className="text-xs font-bold uppercase text-zinc-400">Sold</p>
                        <p className="mt-1 text-lg font-black text-zinc-900">{dashboard.stats.sold_listings}</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                        <p className="text-xs font-bold uppercase text-zinc-400">Total views</p>
                        <p className="mt-1 text-lg font-black text-zinc-900">{dashboard.stats.total_views}</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                        <p className="text-xs font-bold uppercase text-zinc-400">WhatsApp clicks</p>
                        <p className="mt-1 text-lg font-black text-zinc-900">{dashboard.stats.total_whatsapp_clicks}</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                        <p className="text-xs font-bold uppercase text-zinc-400">Profile views</p>
                        <p className="mt-1 text-lg font-black text-zinc-900">{dashboard.seller.profile_views}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                      <p className="text-xs font-bold uppercase text-zinc-400">Top listing</p>
                      <p className="mt-1 font-semibold text-zinc-900 line-clamp-1">
                        {dashboard.top_listing?.name || "No data"}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                currentUid={firebaseUser?.uid}
                isLoggedIn={!!firebaseUser}
                showActionsMenu
                compact
                ultraCompact
                clickable
                onReport={() => undefined}
                onEdit={(item) => navigateToEditListing(item.id)}
                onDelete={(id) => void handleDeleteListing(id)}
                onToggleStatus={(item) => void handleToggleStatus(item)}
                onRecordSale={(item, quantity) => void handleRecordSale(item, quantity)}
                onRestock={(item, quantity) => void handleRestock(item, quantity)}
                onOpenDetails={(item) => navigateToListingDetails(item.id, 0)}
                onOpenSeller={(sellerUid) => navigateToSellerProfile(sellerUid)}
              />
            ))}
          </div>
        </div>
      )}
    </AccountPageShell>
  );
}

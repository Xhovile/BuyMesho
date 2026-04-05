import { useEffect, useState } from "react";
import { BarChart3, ExternalLink, Loader2, Pencil, Tag } from "lucide-react";
import AccountPageShell from "./components/AccountPageShell";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { apiFetch } from "./lib/api";
import { navigateToEditListing, navigateToListingDetails, navigateToPath } from "./lib/appNavigation";
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
      setListings((prev) =>
        prev.map((l) => (l.id === listing.id ? { ...l, status: newStatus } : l))
      );
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
      description="Manage the listings you posted, review status, and jump straight into edit flow from a dedicated page."
      backLabel="Back to Profile"
      onBack={() => navigateToPath("/profile")}
      childrenSectionClassName="md:rounded-[2rem] md:border md:border-zinc-200 md:bg-white md:shadow-sm md:overflow-hidden"
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
        <div className="p-8 space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
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

            {dashboardOpen && (
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
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-zinc-700">Performance snapshot</p>
                      <button
                        type="button"
                        onClick={() => setDashboardOpen(false)}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                      >
                        Close
                      </button>
                    </div>
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
                      <p className="mt-1 text-lg font-black text-zinc-900">
                        {dashboard.stats.total_whatsapp_clicks}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                      <p className="text-xs font-bold uppercase text-zinc-400">Profile views</p>
                      <p className="mt-1 text-lg font-black text-zinc-900">
                        {dashboard.seller.profile_views}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                      <p className="text-xs font-bold uppercase text-zinc-400">Top listing</p>
                      <p className="mt-1 font-semibold text-zinc-900 line-clamp-1">
                        {dashboard.top_listing?.name || "No data"}
                      </p>
                    </div>
                  </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {listings.map((listing) => {
            const availableQuantity = Math.max(
              0,
              Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0)
            );

            return (
              <div key={listing.id} className="rounded-3xl border border-zinc-200 bg-zinc-50 overflow-hidden">
                <div className="aspect-[4/3] bg-zinc-100">
                  <img
                    src={listing.photos?.[0] || `https://picsum.photos/seed/${listing.id}/700/500`}
                    alt={listing.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">{listing.category}</p>
                      <h3 className="mt-1 text-xl font-black tracking-tight text-zinc-900">{listing.name}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide ${listing.status === "sold" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {listing.status === "sold" ? "Sold" : "Available"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white border border-zinc-200 p-3">
                      <p className="text-xs font-bold uppercase text-zinc-400 mb-1">Price</p>
                      <p className="font-bold text-zinc-900">MK {Number(listing.price).toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl bg-white border border-zinc-200 p-3">
                      <p className="text-xs font-bold uppercase text-zinc-400 mb-1">Stock</p>
                      <p className="font-bold text-zinc-900">{availableQuantity} left</p>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-500 line-clamp-2">{listing.description}</p>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => navigateToEditListing(listing.id)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-zinc-800"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Listing
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToListingDetails(listing.id, 0)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Listing
                    </button>
                    <button
                      type="button"
                      disabled={togglingStatus === listing.id}
                      onClick={() => void handleToggleStatus(listing)}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold ${listing.status === "sold" ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"} disabled:opacity-50`}
                    >
                      {togglingStatus === listing.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Tag className="w-4 h-4" />
                      )}
                      {listing.status === "sold" ? "Mark as Available" : "Mark as Sold"}
                    </button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}
    </AccountPageShell>
  );
}

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import type { Listing } from "./types";

export default function MyListingsPage() {
  const { firebaseUser, authLoading, profile, profileLoading } =
    useAccountProfile();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
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

  const handleDeleteListing = async (listingId: number) => {
    if (actionLoadingId === listingId) return;

    setActionLoadingId(listingId);
    try {
      await apiFetch(`/api/listings/${listingId}`, { method: "DELETE" });
      setListings((prev) => prev.filter((item) => item.id !== listingId));
    } catch (error) {
      console.error("Failed to delete listing", error);
      window.alert("Failed to delete listing.");
    } finally {
      setActionLoadingId(null);
    }
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

      setListings((prev) =>
        prev.map((item) =>
          item.id === listing.id ? { ...item, status: nextStatus } : item,
        ),
      );
    } catch (error) {
      console.error("Failed to toggle listing status", error);
      window.alert("Failed to update listing status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRecordSale = async (listing: Listing, quantity: number) => {
    if (!quantity || quantity <= 0) return;
    if (actionLoadingId === listing.id) return;

    setActionLoadingId(listing.id);
    try {
      const result = await apiFetch(`/api/listings/${listing.id}/record-sale`, {
        method: "POST",
        body: JSON.stringify({ quantity }),
      });

      if (result?.listing) {
        setListings((prev) =>
          prev.map((item) =>
            item.id === result.listing.id ? { ...item, ...result.listing } : item,
          ),
        );
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
      const result = await apiFetch(`/api/listings/${listing.id}/restock`, {
        method: "POST",
        body: JSON.stringify({ quantity }),
      });

      if (result?.listing) {
        setListings((prev) =>
          prev.map((item) =>
            item.id === result.listing.id ? { ...item, ...result.listing } : item,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to restock listing", error);
      window.alert("Failed to restock listing.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Seller"
      title="My Listings"
      description="Manage your listings, update stock, and open your seller dashboard from one place."
      backLabel="Back to Profile"
      onBack={() => navigateToPath("/profile")}
      childrenSectionClassName="w-full"
    >
      {authLoading || profileLoading || loadingListings ? (
        <div className="flex items-center justify-center gap-3 p-10 font-medium text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading your listings...
        </div>
      ) : !firebaseUser ? (
        <div className="p-10 text-center">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">
            Login required
          </h2>
          <p className="mt-3 text-sm text-zinc-500">
            You need to log in before opening your listings page.
          </p>
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
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">
            Seller access required
          </h2>
          <p className="mt-3 text-sm text-zinc-500">
            Only seller accounts can access My Listings.
          </p>
          <button
            type="button"
            onClick={() => navigateToPath("/become-seller")}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            Become a Seller
          </button>
        </div>
      ) : listings.length === 0 ? (
        <div className="space-y-5 p-10 text-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-900">
              No listings yet
            </h2>
            <p className="mt-3 text-sm text-zinc-500">
              You have not posted any listings yet.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigateToPath("/seller?uid=dashboard")}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
            >
              Open Dashboard
            </button>
            <button
              type="button"
              onClick={() => navigateToPath("/create")}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              Create Listing
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Seller performance
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-900">
                  My Listings
                </h2>
              </div>

              <button
                type="button"
                onClick={() => navigateToPath("/seller?uid=dashboard")}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-700 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95"
              >
                Open Dashboard
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                currentUid={firebaseUser?.uid}
                isLoggedIn={!!firebaseUser}
                showActionsMenu
                clickable
                onReport={() => undefined}
                onEdit={(item) => navigateToEditListing(item.id)}
                onDelete={(id) => void handleDeleteListing(id)}
                onToggleStatus={(item) => void handleToggleStatus(item)}
                onRecordSale={(item, quantity) =>
                  void handleRecordSale(item, quantity)
                }
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

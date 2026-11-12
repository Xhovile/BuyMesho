import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  EyeOff,
  Loader2,
  Package,
  Search,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from "lucide-react";
import type { Listing } from "./types";
import { apiFetch } from "./lib/api";
import { fetchListingsByIds } from "./lib/listings";
import { navigateBackOrPath, navigateToListingDetails, navigateToSellerProfile, SAVED_PATH } from "./lib/appNavigation";
import {
  hideListingId,
  readHiddenListingIds,
  readHiddenSellerUids,
  subscribeToHiddenCollectionsChanges,
  unhideListingId,
  unhideSellerUid,
} from "./lib/hiddenCollections";

type SellerProfile = {
  uid: string;
  email?: string | null;
  business_name?: string | null;
  university?: string | null;
  bio?: string | null;
  is_verified?: boolean;
  is_seller?: boolean;
};

type TabKey = "listings" | "sellers";

export default function HiddenCollectionsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("listings");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [hiddenSellerUids, setHiddenSellerUids] = useState<string[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<SellerProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyListingId, setBusyListingId] = useState<number | null>(null);
  const [busySellerUid, setBusySellerUid] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [hiddenListings, sellerUids] = [readHiddenListingIds(), readHiddenSellerUids()];

        const [listingItems, sellerResults] = await Promise.all([
          fetchListingsByIds(hiddenListings),
          Promise.allSettled(
            sellerUids.map(async (uid) => {
              const profile = (await apiFetch(`/api/users/${uid}`)) as SellerProfile;
              return profile;
            })
          ),
        ]);

        if (cancelled) return;

        const sellers = sellerResults
          .map((result, index) => {
            if (result.status === "fulfilled" && result.value) {
              return {
                ...(result.value as SellerProfile),
                uid: sellerUids[index],
              };
            }
            return null;
          })
          .filter((item): item is SellerProfile => Boolean(item));

        setListings(listingItems);
        setHiddenSellerUids(sellerUids);
        setSellerProfiles(sellers);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Could not load hidden collections.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    const unsubscribe = subscribeToHiddenCollectionsChanges(() => {
      void load();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const filteredListings = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return listings;

    return listings.filter((listing) =>
      [listing.name, listing.business_name, listing.category, listing.university]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [listings, search]);

  const filteredSellers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sellerProfiles;

    return sellerProfiles.filter((seller) =>
      [seller.business_name, seller.university, seller.email, seller.bio]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [sellerProfiles, search]);

  const handleUnhideListing = (listingId: number) => {
    setBusyListingId(listingId);
    try {
      unhideListingId(listingId);
    } finally {
      setBusyListingId(null);
    }
  };

  const handleUnhideSeller = (uid: string) => {
    setBusySellerUid(uid);
    try {
      unhideSellerUid(uid);
    } finally {
      setBusySellerUid(null);
    }
  };

  return (
    <div className="min-h-screen bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text dark:text-bm-text">
      <header className="buymesho-brand-header sticky top-0 z-40 border-b border-bm-border bg-bm-surface/95 dark:bg-bm-surface/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigateBackOrPath(SAVED_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-2.5 text-sm font-bold text-bm-text dark:text-bm-text hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2 rounded-full border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("listings")}
              className={`px-4 py-2 rounded-full text-sm font-extrabold transition-colors ${
                activeTab === "listings" ? "bg-bm-brand text-bm-on-brand" : "text-bm-text-muted dark:text-bm-text-muted hover:text-bm-text"
              }`}
            >
              Listings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sellers")}
              className={`px-4 py-2 rounded-full text-sm font-extrabold transition-colors ${
                activeTab === "sellers" ? "bg-bm-brand text-bm-on-brand" : "text-bm-text-muted dark:text-bm-text-muted hover:text-bm-text"
              }`}
            >
              Sellers
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <section className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle dark:text-bm-text-subtle">Hidden collections</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-bm-text dark:text-bm-text">
                Manage hidden listings and sellers.
              </h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-bm-text-muted dark:text-bm-text-muted leading-relaxed font-medium">
                Use the tabs above to switch between listings and sellers. Unhide anything you do not want hidden anymore.
              </p>
            </div>

            <div className="rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-5 py-4 min-w-[220px]">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-bm-text-subtle dark:text-bm-text-subtle">Total hidden</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-bm-text dark:text-bm-text">
                {readHiddenListingIds().length + readHiddenSellerUids().length}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-5 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bm-text-subtle dark:text-bm-text-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search hidden ${activeTab}...`}
              className="w-full pl-12 pr-4 py-3 bg-bm-surface-muted dark:bg-bm-surface-subtle border border-bm-border dark:border-bm-border rounded-2xl text-sm text-bm-text dark:text-bm-text-muted placeholder:text-bm-text-subtle dark:placeholder:text-bm-text-subtle shadow-sm focus:border-bm-brand focus:ring-4 focus:ring-bm-focus outline-none transition-all"
            />
          </div>
        </section>

        {error ? (
          <section className="mt-6 rounded-2xl border border-bm-danger/25 bg-bm-danger-bg px-4 py-3 text-sm text-bm-danger">
            {error}
          </section>
        ) : null}

        <section className="mt-6">
          {loading ? (
            <div className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-10 shadow-sm flex items-center justify-center gap-3 text-bm-text-subtle dark:text-bm-text-subtle font-medium">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading hidden items...
            </div>
          ) : activeTab === "listings" ? (
            filteredListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredListings.map((listing) => {
                  const isAvailable = Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0)) > 0;
                  return (
                    <div
                      key={listing.id}
                      className="rounded-[1.75rem] border border-bm-border dark:border-bm-border bg-bm-surface p-4 shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => navigateToListingDetails(listing.id, 0)}
                        className="w-full text-left"
                      >
                        <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-bm-surface-muted dark:bg-bm-surface-muted border border-bm-border dark:border-bm-border mb-4">
                          <img
                            src={listing.photos?.[0] || `https://picsum.photos/seed/${listing.id}/600/450`}
                            alt={listing.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-lg font-extrabold text-bm-text dark:text-bm-text line-clamp-1">{listing.name}</h2>
                            <p className="text-sm text-bm-text-subtle dark:text-bm-text-subtle line-clamp-1">{listing.business_name}</p>
                          </div>
                          {listing.is_verified ? (
                            <ShieldCheck className="w-4 h-4 text-bm-success flex-shrink-0" />
                          ) : null}
                        </div>

                        <p className="mt-3 text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">
                          MK {Number(listing.price).toLocaleString()}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="px-3 py-1.5 rounded-full bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text-muted dark:text-bm-text-muted text-[11px] font-bold uppercase tracking-[0.12em]">
                            {listing.university}
                          </span>
                          <span className="px-3 py-1.5 rounded-full bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text-muted dark:text-bm-text-muted text-[11px] font-bold uppercase tracking-[0.12em]">
                            {listing.category}
                          </span>
                          <span
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] ${
                              isAvailable ? "bg-bm-success-bg text-bm-success" : "bg-bm-surface-raised dark:bg-bm-skeleton text-bm-text-muted dark:text-bm-text-muted"
                            }`}
                          >
                            {isAvailable ? "Available" : "Sold out"}
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUnhideListing(Number(listing.id))}
                        disabled={busyListingId === Number(listing.id)}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-4 py-3 text-sm font-extrabold text-bm-text dark:text-bm-text hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <EyeOff className="w-4 h-4" />
                        {busyListingId === Number(listing.id) ? "Unhiding..." : "Unhide listing"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-10 shadow-sm text-center">
                <div className="w-16 h-16 rounded-full bg-bm-surface-muted dark:bg-bm-surface-muted flex items-center justify-center mx-auto mb-4">
                  <Package className="w-7 h-7 text-bm-text-subtle dark:text-bm-text-subtle" />
                </div>
                <h2 className="text-xl font-extrabold text-bm-text dark:text-bm-text">No hidden listings</h2>
                <p className="mt-2 text-sm text-bm-text-subtle dark:text-bm-text-subtle max-w-md mx-auto">
                  Hidden listings will appear here when you hide them from the marketplace.
                </p>
              </div>
            )
          ) : filteredSellers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSellers.map((seller) => (
                <div
                  key={seller.uid}
                  className="rounded-[1.75rem] border border-bm-border dark:border-bm-border bg-bm-surface p-4 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => navigateToSellerProfile(seller.uid)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-bm-surface-muted dark:bg-bm-surface-muted border border-bm-border dark:border-bm-border flex items-center justify-center flex-shrink-0">
                        {seller.is_verified ? (
                          <ShieldCheck className="w-7 h-7 text-bm-success" />
                        ) : (
                          <Store className="w-7 h-7 text-bm-text-subtle dark:text-bm-text-subtle" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h2 className="text-lg font-extrabold text-bm-text dark:text-bm-text line-clamp-1">
                          {seller.business_name || "Hidden seller"}
                        </h2>
                        <p className="text-sm text-bm-text-subtle dark:text-bm-text-subtle line-clamp-1">
                          {seller.university || "University not set"}
                        </p>
                        <p className="mt-1 text-sm text-bm-text-muted dark:text-bm-text-muted line-clamp-2">
                          {seller.bio || seller.email || "No extra seller details available."}
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUnhideSeller(seller.uid)}
                    disabled={busySellerUid === seller.uid}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-4 py-3 text-sm font-extrabold text-bm-text dark:text-bm-text hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <EyeOff className="w-4 h-4" />
                    {busySellerUid === seller.uid ? "Unhiding..." : "Unhide seller"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
              <div className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-10 shadow-sm text-center">
                <div className="w-16 h-16 rounded-full bg-bm-surface-muted dark:bg-bm-surface-muted flex items-center justify-center mx-auto mb-4">
                  <UserRound className="w-7 h-7 text-bm-text-subtle dark:text-bm-text-subtle" />
                </div>
                <h2 className="text-xl font-extrabold text-bm-text dark:text-bm-text">
                  No matching hidden {activeTab}
                </h2>
              <p className="mt-2 text-sm text-bm-text-subtle dark:text-bm-text-subtle max-w-md mx-auto">
                Try a different search or clear hidden items from the marketplace.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

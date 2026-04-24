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
  whatsapp_number?: string | null;
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
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigateBackOrPath(SAVED_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("listings")}
              className={`px-4 py-2 rounded-full text-sm font-extrabold transition-colors ${
                activeTab === "listings" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Listings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sellers")}
              className={`px-4 py-2 rounded-full text-sm font-extrabold transition-colors ${
                activeTab === "sellers" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Sellers
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Hidden collections</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
                Manage hidden listings and sellers.
              </h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">
                Use the tabs above to switch between listings and sellers. Unhide anything you do not want hidden anymore.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 min-w-[220px]">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">Total hidden</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-zinc-900">
                {readHiddenListingIds().length + readHiddenSellerUids().length}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search hidden ${activeTab}...`}
              className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-300 rounded-2xl text-sm text-zinc-800 placeholder:text-zinc-400 shadow-sm focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/10 outline-none transition-all"
            />
          </div>
        </section>

        {error ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </section>
        ) : null}

        <section className="mt-6">
          {loading ? (
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm flex items-center justify-center gap-3 text-zinc-500 font-medium">
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
                      className="rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => navigateToListingDetails(listing.id, 0)}
                        className="w-full text-left"
                      >
                        <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 mb-4">
                          <img
                            src={listing.photos?.[0] || `https://picsum.photos/seed/${listing.id}/600/450`}
                            alt={listing.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-lg font-extrabold text-zinc-900 line-clamp-1">{listing.name}</h2>
                            <p className="text-sm text-zinc-500 line-clamp-1">{listing.business_name}</p>
                          </div>
                          {listing.is_verified ? (
                            <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          ) : null}
                        </div>

                        <p className="mt-3 text-2xl font-black tracking-tight text-zinc-900">
                          MK {Number(listing.price).toLocaleString()}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-bold uppercase tracking-[0.12em]">
                            {listing.university}
                          </span>
                          <span className="px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-bold uppercase tracking-[0.12em]">
                            {listing.category}
                          </span>
                          <span
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] ${
                              isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-zinc-200 text-zinc-600"
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
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <EyeOff className="w-4 h-4" />
                        {busyListingId === Number(listing.id) ? "Unhiding..." : "Unhide listing"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                  <Package className="w-7 h-7 text-zinc-400" />
                </div>
                <h2 className="text-xl font-extrabold text-zinc-900">No hidden listings</h2>
                <p className="mt-2 text-sm text-zinc-500 max-w-md mx-auto">
                  Hidden listings will appear here when you hide them from the marketplace.
                </p>
              </div>
            )
          ) : filteredSellers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSellers.map((seller) => (
                <div
                  key={seller.uid}
                  className="rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => navigateToSellerProfile(seller.uid)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center flex-shrink-0">
                        {seller.is_verified ? (
                          <ShieldCheck className="w-7 h-7 text-blue-500" />
                        ) : (
                          <Store className="w-7 h-7 text-zinc-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h2 className="text-lg font-extrabold text-zinc-900 line-clamp-1">
                          {seller.business_name || "Hidden seller"}
                        </h2>
                        <p className="text-sm text-zinc-500 line-clamp-1">
                          {seller.university || "University not set"}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600 line-clamp-2">
                          {seller.bio || seller.email || "No extra seller details available."}
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUnhideSeller(seller.uid)}
                    disabled={busySellerUid === seller.uid}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <EyeOff className="w-4 h-4" />
                    {busySellerUid === seller.uid ? "Unhiding..." : "Unhide seller"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                  <UserRound className="w-7 h-7 text-zinc-400" />
                </div>
                <h2 className="text-xl font-extrabold text-zinc-900">
                  No matching hidden {activeTab}
                </h2>
              <p className="mt-2 text-sm text-zinc-500 max-w-md mx-auto">
                Try a different search or clear hidden items from the marketplace.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

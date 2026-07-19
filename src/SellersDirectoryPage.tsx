import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2, Search, ShieldCheck, Star } from "lucide-react";

import { apiFetch } from "./lib/api";
import {
  EXPLORE_PATH,
  HOME_PATH,
  navigateBackOrPath,
  navigateToPath,
  navigateToSellerProfile,
} from "./lib/appNavigation";

import type { Listing, RatingSummary } from "./types";

type SellerDirectoryProfile = {
  uid: string;
  email?: string;
  business_name?: string | null;
  business_logo?: string | null;
  bio?: string | null;
  university?: string | null;
  is_verified?: boolean;
  join_date?: string | null;
  profile_views?: number;
  ratingSummary?: RatingSummary | null;
};

type SellerCard = {
  uid: string;
  sellerName: string;
  logoUrl: string | null;
  description: string;
  rating: number;
  ratingCount: number;
  joinedAt: string | null;
  listingCount: number;
  isVerified: boolean;
};

type ListingsResponse = { items?: Listing[] } | Listing[] | null;

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function normalizeListingsResponse(payload: ListingsResponse): Listing[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}

function fallbackInitials(uid: string, description?: string | null) {
  const seed = (description || uid).trim();
  const parts = seed.split(/\s+/).filter(Boolean);
  const initials = parts.length > 0 ? parts.map((part) => part[0]).join("") : uid.slice(0, 2);
  return initials.slice(0, 2).toUpperCase();
}

export default function SellersDirectoryPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cards, setCards] = useState<SellerCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSellers = async () => {
      setLoading(true);
      setError(null);

      try {
        const listingsPayload = await apiFetch("/api/listings?sortBy=newest&pageSize=200");
        const listings = normalizeListingsResponse(listingsPayload as ListingsResponse);

        const sellerBuckets = new Map<
          string,
          {
            listingCount: number;
            representativeListing: Listing;
          }
        >();

        for (const listing of listings) {
          if (!listing?.seller_uid) continue;
          const current = sellerBuckets.get(listing.seller_uid);
          if (current) {
            current.listingCount += 1;
            continue;
          }
          sellerBuckets.set(listing.seller_uid, {
            listingCount: 1,
            representativeListing: listing,
          });
        }

        const sellerEntries = await Promise.all(
          Array.from(sellerBuckets.entries()).map(async ([uid, bucket]) => {
            const [profileResult, ratingResult] = await Promise.allSettled([
              apiFetch(`/api/users/${uid}`),
              apiFetch(`/api/users/${uid}/rating-summary`),
            ]);

            const profile =
              profileResult.status === "fulfilled" && profileResult.value
                ? (profileResult.value as SellerDirectoryProfile)
                : null;
            const ratingSummary =
              ratingResult.status === "fulfilled" && ratingResult.value
                ? (ratingResult.value as RatingSummary)
                : null;

            const sellerName =
              profile?.business_name?.trim() ||
              bucket.representativeListing.business_name?.trim() ||
              profile?.email?.trim() ||
              bucket.representativeListing.name?.trim() ||
              "Seller";

            const description =
              profile?.bio?.trim() ||
              profile?.university?.trim() ||
              "Approved seller on BuyMesho.";

            return {
              uid,
              sellerName,
              logoUrl: profile?.business_logo || bucket.representativeListing.business_logo || null,
              description,
              rating: profile?.ratingSummary?.averageRating ?? ratingSummary?.averageRating ?? 0,
              ratingCount: profile?.ratingSummary?.ratingCount ?? ratingSummary?.ratingCount ?? 0,
              joinedAt: profile?.join_date || bucket.representativeListing.created_at || null,
              listingCount: bucket.listingCount,
              isVerified: !!(profile?.is_verified || bucket.representativeListing.is_verified),
            } satisfies SellerCard;
          })
        );

        if (!mounted) return;
        setCards(
          sellerEntries.sort((a, b) => {
            if (b.isVerified !== a.isVerified) return Number(b.isVerified) - Number(a.isVerified);
            if (b.rating !== a.rating) return b.rating - a.rating;
            if (b.listingCount !== a.listingCount) return b.listingCount - a.listingCount;
            return String(a.joinedAt || "").localeCompare(String(b.joinedAt || ""));
          })
        );
      } catch (loadErr) {
        console.error("Failed to load sellers directory", loadErr);
        if (!mounted) return;
        setError("We could not load the sellers directory right now.");
        setCards([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadSellers();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCards = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return cards;
    return cards.filter((card) => {
      const joined = formatDate(card.joinedAt).toLowerCase();
      const ratingText = `${card.rating.toFixed(1)} ${card.ratingCount}`.toLowerCase();
      return (
        card.sellerName.toLowerCase().includes(term) ||
        card.description.toLowerCase().includes(term) ||
        joined.includes(term) ||
        ratingText.includes(term) ||
        String(card.listingCount).includes(term)
      );
    });
  }, [cards, search]);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <button
            type="button"
            onClick={() => navigateToPath(HOME_PATH)}
            className="flex min-w-0 items-center gap-2.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-900 text-xl font-extrabold text-white shadow-lg shadow-red-900/20">
              B
            </div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Sellers</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateBackOrPath(EXPLORE_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-900 bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Directory</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">
                Approved sellers.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
                Sellers appear here after approval and public sync. Each card shows the seller logo,
                a short description, rating, joining date, and how many listings they have.
              </p>
            </div>

            <div className="w-full max-w-md">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                Search sellers
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by description, rating, or listings"
                  className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm">
            <div className="flex items-center justify-center gap-3 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading approved sellers…
            </div>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-black tracking-tight text-zinc-900">No sellers found</h2>
            <p className="mt-3 text-sm text-zinc-500">
              Approved sellers will show up here once they have public listings.
            </p>
          </div>
        ) : (
          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCards.map((card) => (
              <button
                key={card.uid}
                type="button"
                onClick={() => navigateToSellerProfile(card.uid)}
                className="group rounded-[2rem] border border-zinc-200 bg-white p-5 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-100">
                      {card.logoUrl ? (
                        <img
                          src={card.logoUrl}
                          alt="Seller logo"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-sm font-black tracking-tight text-zinc-500">
                          {fallbackInitials(card.uid, card.description)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-base font-black tracking-tight text-zinc-900">
                          {card.sellerName}
                        </p>
                        {card.isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs font-bold text-zinc-500">
                        Joined {formatDate(card.joinedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {card.rating ? card.rating.toFixed(1) : "New"}
                  </div>
                </div>

                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-600">
                  {card.description}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 text-xs font-bold text-zinc-500">
                  <span>{card.listingCount} listing{card.listingCount === 1 ? "" : "s"}</span>
                  <span>{card.ratingCount} rating{card.ratingCount === 1 ? "" : "s"}</span>
                </div>
              </button>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

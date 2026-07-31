import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, ShieldCheck, Star } from "lucide-react";

import Header from "./components/Header";
import { apiFetch } from "./lib/api";
import {
  getMarketChipFromLocation,
  navigateToCreateListing,
  navigateToMarketChip,
  navigateToPath,
  navigateToSellerProfile,
  PROFILE_PATH,
} from "./lib/appNavigation";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { useAuthUser } from "./hooks/useAuthUser";
import { normalizeRatingSummary } from "./components/ratings/ratingSummaryUtils";

import type { Listing, RatingSummary } from "./types";

type SellerDirectoryProfile = {
  uid?: string;
  email?: string;
  business_name?: string | null;
  business_logo?: string | null;
  bio?: string | null;
  university?: string | null;
  is_verified?: boolean;
  join_date?: string | null;
  profile_views?: number;
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

function getRatingDisplay(rating: number) {
  const safeRating = Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0;
  const fullStars = Math.floor(safeRating);
  const fraction = safeRating - fullStars;

  if (fraction > 0.7) {
    return { fullStars: Math.min(5, fullStars + 1), showHalfStar: false };
  }

  return { fullStars, showHalfStar: fraction > 0 };
}

function RatingStars({ rating }: { rating: number }) {
  const { fullStars, showHalfStar } = useMemo(() => getRatingDisplay(rating), [rating]);

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rating ${rating.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => {
        const starIndex = index + 1;
        if (starIndex <= fullStars) {
          return <Star key={starIndex} className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />;
        }

        if (starIndex === fullStars + 1 && showHalfStar) {
          return (
            <span key={starIndex} className="relative inline-flex h-3.5 w-3.5">
              <Star className="absolute inset-0 h-3.5 w-3.5 text-amber-500" />
              <Star
                className="absolute inset-0 h-3.5 w-3.5 fill-amber-400 text-amber-500"
                style={{ clipPath: "inset(0 50% 0 0)" }}
              />
            </span>
          );
        }

        return <Star key={starIndex} className="h-3.5 w-3.5 text-zinc-300" />;
      })}
    </span>
  );
}

async function fetchSellerProfile(sellerUid: string) {
  try {
    return (await apiFetch(`/api/sellers/${sellerUid}`)) as SellerDirectoryProfile;
  } catch {
    return (await apiFetch(`/api/users/${sellerUid}`)) as SellerDirectoryProfile;
  }
}

async function fetchSellerRatingSummary(sellerUid: string) {
  try {
    return (await apiFetch(`/api/sellers/${sellerUid}/rating-summary`)) as RatingSummary;
  } catch {
    return (await apiFetch(`/api/users/${sellerUid}/rating-summary`)) as RatingSummary;
  }
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 px-3 py-2 shadow-sm backdrop-blur-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-black tracking-tight text-zinc-900">{value}</p>
    </div>
  );
}

export default function SellersDirectoryPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cards, setCards] = useState<SellerCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { user: firebaseUser } = useAuthUser();
  const { profile: userProfile } = useAccountProfile();
  const activeChip = getMarketChipFromLocation(window.location);

  useEffect(() => {
    let mounted = true;

    const loadSellers = async () => {
      setLoading(true);
      setError(null);

      try {
        const listingsPayload = await apiFetch("/api/listings?sortBy=newest&pageSize=200");
        const listings = normalizeListingsResponse(listingsPayload as ListingsResponse);

        const sellerBuckets = new Map<string, { listingCount: number; representativeListing: Listing }>();

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
              fetchSellerProfile(uid),
              fetchSellerRatingSummary(uid),
            ]);

            const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
            const ratingSummary =
              ratingResult.status === "fulfilled"
                ? normalizeRatingSummary(ratingResult.value as RatingSummary)
                : normalizeRatingSummary(null);

            const sellerName =
              profile?.business_name?.trim() ||
              profile?.email?.trim() ||
              bucket.representativeListing.business_name?.trim() ||
              bucket.representativeListing.name?.trim() ||
              "Seller";

            return {
              uid,
              sellerName,
              logoUrl: profile?.business_logo || bucket.representativeListing.business_logo || null,
              description: profile?.bio?.trim() || "",
              rating: ratingSummary.averageRating,
              ratingCount: ratingSummary.ratingCount,
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
      const ratingText = `${card.rating.toFixed(1)} (${card.ratingCount})`.toLowerCase();
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
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <Header
        searchValue={search}
        onSearch={setSearch}
        onAddListing={navigateToCreateListing}
        onProfileClick={() => navigateToPath(PROFILE_PATH)}
        userProfile={userProfile}
        firebaseUser={firebaseUser}
        activeChip={activeChip}
        onChipChange={navigateToMarketChip}
      />

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 pb-6 pt-6 sm:pt-8">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Explore</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">
                  Seller Directory.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
                  Browse approved sellers, compare their listings, and open any profile directly from the directory.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
                <StatPill label="Sellers" value={`${cards.length}`} />
                <StatPill label="Showing" value={`${filteredCards.length}`} />
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="mx-auto mt-0 max-w-7xl px-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="mx-auto mt-0 max-w-7xl px-4 pb-8">
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm">
              <div className="flex items-center justify-center gap-3 text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading approved sellers…
              </div>
            </div>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="mx-auto mt-0 max-w-7xl px-4 pb-8">
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-xl font-black tracking-tight text-zinc-900">No sellers found</h2>
              <p className="mt-3 text-sm text-zinc-500">
                Approved sellers will show up here once they have public listings.
              </p>
            </div>
          </div>
        ) : (
          <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 pb-8 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCards.map((card) => (
              <button
                key={card.uid}
                type="button"
                onClick={() => navigateToSellerProfile(card.uid)}
                className="group relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-5 text-left shadow-[0_18px_50px_-28px_rgba(0,0,0,0.28)] transition-all duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_26px_70px_-30px_rgba(0,0,0,0.38)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(127,29,29,0.10),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(24,24,27,0.05),transparent_26%)]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-900 via-amber-500 to-zinc-200" />

                <div className="relative flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-[1.75rem] bg-red-900/10 blur-xl" />
                    <div className="relative flex h-18 w-18 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/70 bg-zinc-100 ring-1 ring-zinc-200">
                      {card.logoUrl ? (
                        <img src={card.logoUrl} alt="Seller logo" className="h-full w-full object-cover" />
                      ) : (
                        <div className="text-lg font-black tracking-tight text-zinc-500">
                          {fallbackInitials(card.uid, card.description)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-black tracking-tight text-zinc-950 sm:text-xl">
                          {card.sellerName}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
                          <span>Joined {formatDate(card.joinedAt)}</span>
                          {card.isVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 font-black text-blue-700">
                              <ShieldCheck className="h-3 w-3" />
                              Verified
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-600">
                      {card.description || "This seller has not added a bio yet."}
                    </p>
                  </div>
                </div>

                <div className="relative mt-5 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4">
                  <StatPill label="Listings" value={`${card.listingCount}`} />
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Rating</p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <RatingStars rating={card.rating} />
                      </div>
                      <span className="text-sm font-black tracking-tight text-amber-700">
                        {card.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-zinc-500">
                      {card.ratingCount} review{card.ratingCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2, Search, ShieldCheck, Star } from "lucide-react";
import type { Listing, RatingSummary } from "./types";
import { apiFetch } from "./lib/api";
import { useAuthUser } from "./hooks/useAuthUser";
import { normalizeRatingSummary } from "./components/ratings/ratingSummaryUtils";
import {
  EXPLORE_PATH,
  HOME_PATH,
  SETTINGS_PATH,
  getSellerUidFromUrl,
  navigateToListingDetails,
  navigateToPath,
  navigateBackOrPath,
} from "./lib/appNavigation";

type SellerProfile = {
  uid?: string;
  business_name?: string;
  business_logo?: string;
  bio?: string;
  is_verified?: boolean;
  join_date?: string;
  profile_views?: number;
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function ratingTierLabel(averageRating: number) {
  if (averageRating >= 4.5) return "Excellent";
  if (averageRating >= 4) return "Very good";
  if (averageRating >= 3) return "Good";
  if (averageRating >= 2) return "Fair";
  return "Needs improvement";
}

async function fetchSellerProfile(sellerUid: string) {
  try {
    return (await apiFetch(`/api/sellers/${sellerUid}`)) as SellerProfile;
  } catch {
    return (await apiFetch(`/api/users/${sellerUid}`)) as SellerProfile;
  }
}

async function fetchSellerListings(sellerUid: string) {
  try {
    const listings = await apiFetch(`/api/sellers/${sellerUid}/listings`);
    return Array.isArray(listings) ? listings : [];
  } catch {
    const listings = await apiFetch(`/api/users/${sellerUid}/listings`);
    return Array.isArray(listings) ? listings : [];
  }
}

async function fetchSellerRatingSummary(sellerUid: string) {
  try {
    return (await apiFetch(`/api/sellers/${sellerUid}/rating-summary`)) as RatingSummary;
  } catch {
    return (await apiFetch(`/api/users/${sellerUid}/rating-summary`)) as RatingSummary;
  }
}

async function trackSellerProfileView(sellerUid: string, viewerUid: string | null) {
  try {
    return await apiFetch(`/api/sellers/${sellerUid}/profile-view`, {
      method: "POST",
      body: JSON.stringify({ viewer_uid: viewerUid }),
    });
  } catch {
    return await apiFetch(`/api/users/${sellerUid}/profile-view`, {
      method: "POST",
      body: JSON.stringify({ viewer_uid: viewerUid }),
    });
  }
}

async function saveSellerRating(sellerUid: string, stars: number) {
  try {
    return await apiFetch(`/api/sellers/${sellerUid}/rating`, {
      method: "POST",
      body: JSON.stringify({ stars }),
    });
  } catch {
    return await apiFetch(`/api/users/${sellerUid}/rating`, {
      method: "POST",
      body: JSON.stringify({ stars }),
    });
  }
}

async function deleteSellerRating(sellerUid: string) {
  try {
    return await apiFetch(`/api/sellers/${sellerUid}/rating`, {
      method: "DELETE",
    });
  } catch {
    return await apiFetch(`/api/users/${sellerUid}/rating`, {
      method: "DELETE",
    });
  }
}

function SellerRatingBlock({
  ratingSummary,
  profileViews,
  isAuthenticated,
  canRate,
  ratingLoading,
  ratingSubmitting,
  onRate,
  onRemoveRating,
}: {
  ratingSummary: RatingSummary | null;
  profileViews: number;
  isAuthenticated: boolean;
  canRate: boolean;
  ratingLoading: boolean;
  ratingSubmitting: boolean;
  onRate: (stars: number) => Promise<void> | void;
  onRemoveRating: () => Promise<void> | void;
}) {
  const normalized = useMemo(() => normalizeRatingSummary(ratingSummary), [ratingSummary]);

  return (
    <div className="mt-6 border-t border-zinc-200 pt-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">Ratings</p>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <span className="text-4xl font-black tracking-tight text-zinc-900">
              {normalized.hasRatings ? normalized.averageRating.toFixed(1) : "—"}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-600">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              {normalized.hasRatings
                ? `${normalized.ratingCount} rating${normalized.ratingCount === 1 ? "" : "s"}`
                : "No ratings yet"}
            </span>
            {normalized.hasRatings ? (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-700">
                {ratingTierLabel(normalized.averageRating)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Profile views</p>
          <p className="mt-1 text-2xl font-black text-zinc-900">{profileViews}</p>
        </div>
      </div>

      {ratingLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading rating...</p>
      ) : (
        <div className="mt-5 space-y-2">
          {normalized.distribution.map((row) => (
            <div key={row.stars} className="grid grid-cols-[52px_minmax(0,1fr)_46px] items-center gap-2">
              <span className="text-xs font-bold text-zinc-600">{row.stars} ★</span>
              <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${row.percentage}%` }} />
              </div>
              <span className="text-xs text-zinc-500 text-right">{row.count}</span>
            </div>
          ))}
          {!normalized.hasRatings ? <p className="pt-1 text-sm text-zinc-500">No ratings yet.</p> : null}
        </div>
      )}

      <div className="mt-5 border-t border-zinc-200 pt-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Your rating</p>
        {!isAuthenticated ? (
          <p className="mt-2 text-sm text-zinc-500">Log in to leave a seller rating.</p>
        ) : !canRate ? (
          <p className="mt-2 text-sm text-zinc-500">You cannot rate your own seller account.</p>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (normalized.myRating ?? 0) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => void onRate(star)}
                    disabled={ratingSubmitting}
                    className={`p-1 rounded-md ${active ? "text-amber-500" : "text-zinc-300"} ${
                      ratingSubmitting ? "opacity-60" : "hover:text-amber-500"
                    }`}
                    aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                  >
                    <Star className={`w-5 h-5 ${active ? "fill-amber-400" : ""}`} />
                  </button>
                );
              })}
            </div>
            {normalized.myRating ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-600">Your rating: {normalized.myRating}/5</p>
                <button
                  type="button"
                  onClick={() => void onRemoveRating()}
                  disabled={ratingSubmitting}
                  className="text-xs font-bold text-zinc-600 hover:text-zinc-900 underline underline-offset-2 disabled:opacity-50"
                >
                  Remove rating
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">Select a star to rate this seller.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SellerProfilePage() {
  const { user: firebaseUser } = useAuthUser();
  const [sellerUid, setSellerUid] = useState(() => getSellerUidFromUrl() || "");
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [listingSearch, setListingSearch] = useState("");

  useEffect(() => {
    const syncSellerUid = () => setSellerUid(getSellerUidFromUrl() || "");
    window.addEventListener("popstate", syncSellerUid);
    return () => window.removeEventListener("popstate", syncSellerUid);
  }, []);

  useEffect(() => {
    const loadSeller = async () => {
      if (!sellerUid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [profileResult, listingsResult, ratingResult] = await Promise.allSettled([
          fetchSellerProfile(sellerUid),
          fetchSellerListings(sellerUid),
          fetchSellerRatingSummary(sellerUid),
        ]);

        const loadedProfile = profileResult.status === "fulfilled" ? profileResult.value : null;
        setProfile(loadedProfile);
        setListings(
          listingsResult.status === "fulfilled" && Array.isArray(listingsResult.value)
            ? listingsResult.value
            : []
        );
        setRatingSummary(ratingResult.status === "fulfilled" ? ratingResult.value : null);

        if (loadedProfile) {
          const viewTrackResult = await trackSellerProfileView(sellerUid, firebaseUser?.uid ?? null).catch(
            () => null
          );

          if (viewTrackResult && !viewTrackResult.skipped) {
            setProfile((prev) =>
              prev
                ? {
                    ...prev,
                    profile_views: (prev.profile_views ?? 0) + 1,
                  }
                : prev
            );
          }
        }
      } catch (error) {
        console.error("Failed to load seller profile page", error);
        setProfile(null);
        setListings([]);
        setRatingSummary(null);
      } finally {
        setLoading(false);
      }
    };

    void loadSeller();
  }, [sellerUid, firebaseUser?.uid]);

  const refreshRatingSummary = async () => {
    if (!sellerUid) return;
    setRatingLoading(true);
    try {
      const summary = await fetchSellerRatingSummary(sellerUid);
      setRatingSummary(summary);
    } catch (error) {
      console.error("Failed to load rating summary", error);
    } finally {
      setRatingLoading(false);
    }
  };

  useEffect(() => {
    void refreshRatingSummary();
  }, [sellerUid, firebaseUser?.uid]);

  const filteredListings = useMemo(() => {
    const term = listingSearch.trim().toLowerCase();
    if (!term) return listings;
    return listings.filter((listing) =>
      [listing.name, listing.description, listing.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [listings, listingSearch]);

  const canRateSeller = !!firebaseUser && !!sellerUid && firebaseUser.uid !== sellerUid;

  const handleRateSeller = async (stars: number) => {
    if (!sellerUid || !firebaseUser) return;
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) return;
    setRatingSubmitting(true);
    try {
      await saveSellerRating(sellerUid, stars);
      await refreshRatingSummary();
    } catch (error) {
      console.error("Failed to save seller rating", error);
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleRemoveRating = async () => {
    if (!sellerUid || !firebaseUser) return;
    setRatingSubmitting(true);
    try {
      await deleteSellerRating(sellerUid);
      await refreshRatingSummary();
    } catch (error) {
      console.error("Failed to remove seller rating", error);
    } finally {
      setRatingSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigateToPath(HOME_PATH)}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-900/20">
              B
            </div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Seller profile</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateToPath(SETTINGS_PATH)}
              className="hidden sm:inline-flex px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => navigateBackOrPath(EXPLORE_PATH)}
              className="px-4 py-2.5 rounded-2xl border border-zinc-900 bg-black text-white text-sm font-bold hover:bg-zinc-800"
            >
              Back
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {loading ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm flex items-center justify-center gap-3 text-zinc-500 font-medium">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading seller profile...
          </div>
        ) : !sellerUid || !profile ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Seller profile not found</h1>
            <p className="mt-3 text-sm text-zinc-500">This seller could not be loaded or may no longer be available.</p>
            <button
              type="button"
              onClick={() => navigateBackOrPath(EXPLORE_PATH)}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-extrabold text-black hover:bg-zinc-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        ) : (
          <>
            <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col gap-6">
                <div className="flex flex-row items-start gap-4 sm:gap-5">
                  <div className="w-28 h-28 rounded-[2rem] overflow-hidden border border-zinc-200 bg-zinc-100 shadow-sm flex items-center justify-center shrink-0">
                    {profile.business_logo ? (
                      <img
                        src={profile.business_logo}
                        alt={profile.business_name || "Seller"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-black text-zinc-500 px-3 text-center">
                        {(profile.business_name || "Seller")
                          .split(" ")
                          .map((word) => word[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-900 break-words">
                      {profile.business_name || "Seller Profile"}
                    </h1>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {profile.is_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                          <ShieldCheck className="w-4 h-4" />
                          Verified
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="space-y-2 text-sm sm:text-base leading-6 text-zinc-600">
                    <p>
                      <span className="font-black text-zinc-900">Joined:</span> {formatDate(profile.join_date)}
                    </p>

                    {profile.bio ? (
                      <p className="max-w-2xl whitespace-pre-wrap">
                        <span className="font-black text-zinc-900">Description:</span> {profile.bio}
                      </p>
                    ) : null}

                    <p>
                      <span className="font-black text-zinc-900">Listings:</span> {listings.length} listing
                      {listings.length === 1 ? "" : "s"}
                    </p>

                    <p>
                      <span className="font-black text-zinc-900">Profile Views:</span> {profile.profile_views ?? 0}
                    </p>
                  </div>

                  <SellerRatingBlock
                    ratingSummary={ratingSummary}
                    profileViews={profile.profile_views ?? 0}
                    isAuthenticated={!!firebaseUser}
                    canRate={canRateSeller}
                    ratingLoading={ratingLoading}
                    ratingSubmitting={ratingSubmitting}
                    onRate={handleRateSeller}
                    onRemoveRating={handleRemoveRating}
                  />
                </div>
              </div>
            </section>

            <section className="mt-6 space-y-4">
              <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <Search className="w-4 h-4 text-zinc-400" />
                  <input
                    value={listingSearch}
                    onChange={(e) => setListingSearch(e.target.value)}
                    placeholder="Search seller listings"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-black text-zinc-900">Listings</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {filteredListings.length} result{filteredListings.length === 1 ? "" : "s"}
                      {listingSearch.trim() ? ` for “${listingSearch.trim()}”` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredListings.length > 0 ? (
                    filteredListings.map((listing) => (
                      <button
                        key={listing.id}
                        type="button"
                        onClick={() => navigateToListingDetails(listing.id)}
                        className="group rounded-3xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100">
                          {listing.photos?.[0] ? (
                            <img
                              src={listing.photos[0]}
                              alt={listing.name}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            />
                          ) : null}
                        </div>
                        <div className="mt-3 space-y-1">
                          <h3 className="line-clamp-1 text-sm font-extrabold text-zinc-900">{listing.name}</h3>
                          <p className="text-sm font-bold text-red-900">MK{Number(listing.price).toLocaleString()}</p>
                          <p className="text-xs text-zinc-500 line-clamp-2">{listing.description}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="col-span-full rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                      No listings found for this seller.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

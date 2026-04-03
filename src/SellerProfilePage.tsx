import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, ShieldCheck, Star } from "lucide-react";
import type { Listing } from "./types";
import { apiFetch } from "./lib/api";
import { useAuthUser } from "./hooks/useAuthUser";
import {
  EXPLORE_PATH,
  HOME_PATH,
  SETTINGS_PATH,
  getSellerUidFromUrl,
  navigateToListingDetails,
  navigateToPath,
} from "./lib/appNavigation";

type SellerRatingSummary = {
  averageRating: number;
  ratingCount: number;
  myRating: number | null;
  distribution?: Array<{
    stars: number;
    count: number;
    percentage: number;
  }>;
};

type SellerProfile = {
  uid?: string;
  business_name?: string;
  business_logo?: string;
  university?: string;
  bio?: string;
  is_verified?: boolean;
  join_date?: string;
  whatsapp_number?: string;
  profile_views?: number;
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default function SellerProfilePage() {
  const { user: firebaseUser } = useAuthUser();
  const [sellerUid, setSellerUid] = useState(() => getSellerUidFromUrl() || "");
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [ratingSummary, setRatingSummary] = useState<SellerRatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const ratingTierLabel = (averageRating: number) => {
    if (averageRating >= 4.5) return "Excellent";
    if (averageRating >= 4) return "Very good";
    if (averageRating >= 3) return "Good";
    if (averageRating >= 2) return "Fair";
    return "Needs improvement";
  };

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
          apiFetch(`/api/users/${sellerUid}`),
          apiFetch(`/api/users/${sellerUid}/listings`),
          apiFetch(`/api/users/${sellerUid}/rating-summary`),
        ]);

        setProfile(profileResult.status === "fulfilled" ? profileResult.value : null);
        setListings(
          listingsResult.status === "fulfilled" && Array.isArray(listingsResult.value)
            ? listingsResult.value
            : []
        );
        setRatingSummary(ratingResult.status === "fulfilled" ? ratingResult.value : null);
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
  }, [sellerUid]);

  useEffect(() => {
    const loadRatingSummary = async () => {
      if (!sellerUid || !firebaseUser) return;
      setRatingLoading(true);
      try {
        const summary = await apiFetch(`/api/users/${sellerUid}/rating-summary`);
        setRatingSummary(summary);
      } catch (error) {
        console.error("Failed to load rating summary", error);
      } finally {
        setRatingLoading(false);
      }
    };

    void loadRatingSummary();
  }, [sellerUid, firebaseUser]);

  const handleRateSeller = async (stars: number) => {
    if (!sellerUid || !firebaseUser) return;
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) return;
    setRatingSubmitting(true);
    try {
      const summary = await apiFetch(`/api/users/${sellerUid}/rating`, {
        method: "POST",
        body: JSON.stringify({ stars }),
      });
      setRatingSummary(summary);
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
      const summary = await apiFetch(`/api/users/${sellerUid}/rating`, {
        method: "DELETE",
      });
      setRatingSummary(summary);
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
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                Seller profile
              </p>
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
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50"
            >
              Back to Explore
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
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
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              <ChevronLeft className="w-4 h-4" />
              Return to Explore
            </button>
          </div>
        ) : (
          <>
            <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-[auto_minmax(0,1fr)_auto] gap-6 items-start">
                <div className="w-28 h-28 rounded-[2rem] overflow-hidden border border-zinc-200 bg-zinc-100 shadow-sm flex items-center justify-center">
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

                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
                    {profile.business_name || "Seller Profile"}
                  </h1>

                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    {profile.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-500">
                        <ShieldCheck className="w-4 h-4" />
                        Verified
                      </span>
                    ) : null}
                  </div>

                  {profile.bio ? (
                    <p className="mt-4 max-w-2xl text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">
                      {profile.bio}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 min-w-[220px]">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">Seller snapshot</p>
                  <div className="mt-3 space-y-2 text-sm text-zinc-600">
                    <p>
                      <span className="font-bold text-zinc-900">Campus:</span> {profile.university || "Not set"}
                    </p>
                    <p>
                      <span className="font-bold text-zinc-900">Joined:</span> {formatDate(profile.join_date)}
                    </p>
                    <p>
                      <span className="font-bold text-zinc-900">Listings:</span> {listings.length}
                    </p>
                    <p>
                      <span className="font-bold text-zinc-900">Profile views:</span> {profile.profile_views ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-6">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Rating</p>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <div className="text-4xl font-black tracking-tight text-zinc-900">
                    {ratingSummary ? ratingSummary.averageRating.toFixed(1) : "—"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 min-w-[160px]">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                    {ratingSummary ? `${ratingSummary.ratingCount} rating${ratingSummary.ratingCount === 1 ? "" : "s"}` : "No ratings yet"}
                  </div>
                  {ratingSummary && ratingSummary.ratingCount > 0 ? (
                    <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold uppercase tracking-[0.1em]">
                      {ratingTierLabel(ratingSummary.averageRating)}
                    </span>
                  ) : null}
                </div>

                {ratingLoading ? (
                  <p className="mt-4 text-sm text-zinc-500">Loading rating...</p>
                ) : ratingSummary?.distribution?.length ? (
                  <div className="mt-5 space-y-2">
                    {ratingSummary.distribution.map((row) => (
                      <div key={row.stars} className="grid grid-cols-[52px_minmax(0,1fr)_46px] items-center gap-2">
                        <span className="text-xs font-bold text-zinc-600">{row.stars} ★</span>
                        <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                          <div className="h-full bg-amber-400" style={{ width: `${row.percentage}%` }} />
                        </div>
                        <span className="text-xs text-zinc-500 text-right">{row.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500">No ratings yet.</p>
                )}

                <div className="mt-5 border-t border-zinc-200 pt-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Your rating</p>
                  {!firebaseUser ? (
                    <p className="mt-2 text-sm text-zinc-500">Log in to leave a seller rating.</p>
                  ) : firebaseUser.uid === profile.uid ? (
                    <p className="mt-2 text-sm text-zinc-500">You cannot rate your own seller account.</p>
                  ) : (
                    <>
                      <div className="mt-3 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const active = (ratingSummary?.myRating ?? 0) >= star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => void handleRateSeller(star)}
                              disabled={ratingSubmitting}
                              className={`p-1 rounded-md ${active ? "text-amber-500" : "text-zinc-300"} ${ratingSubmitting ? "opacity-60" : "hover:text-amber-500"}`}
                              aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                            >
                              <Star className={`w-5 h-5 ${active ? "fill-amber-400" : ""}`} />
                            </button>
                          );
                        })}
                      </div>
                      {ratingSummary?.myRating ? (
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-sm text-zinc-600">Your rating: {ratingSummary.myRating}/5</p>
                          <button
                            type="button"
                            onClick={() => void handleRemoveRating()}
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

              <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Listings</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">Items from this seller</h2>
                  </div>
                  <div className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-600">
                    {listings.length} item{listings.length === 1 ? "" : "s"}
                  </div>
                </div>

                {listings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {listings.map((listing) => {
                      const availableQuantity = Math.max(
                        0,
                        Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0)
                      );

                      return (
                        <button
                          key={listing.id}
                          type="button"
                          onClick={() => navigateToListingDetails(listing.id, 0)}
                          className="text-left rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 hover:bg-zinc-100 transition-colors"
                        >
                          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 mb-4">
                            <img
                              src={listing.photos?.[0] || `https://picsum.photos/seed/${listing.id}/600/450`}
                              alt={listing.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <h3 className="text-lg font-extrabold text-zinc-900 line-clamp-1">{listing.name}</h3>
                          <p className="mt-1 text-sm text-zinc-500 line-clamp-2">{listing.description}</p>
                          <p className="mt-3 text-2xl font-black tracking-tight text-zinc-900">
                            MK {Number(listing.price).toLocaleString()}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="px-3 py-1.5 rounded-full bg-white text-zinc-700 text-[11px] font-bold uppercase tracking-[0.12em] border border-zinc-200">
                              {listing.category}
                            </span>
                            <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] ${availableQuantity > 0 && listing.status !== "sold" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>
                              {availableQuantity > 0 && listing.status !== "sold" ? `${availableQuantity} left` : "Sold out"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                    This seller has no active listings to show right now.
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  Expand,
  ExternalLink,
  Eye,
  Loader2,
  Lock,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import type { Listing, RatingSummary } from "./types";
import { apiFetch } from "./lib/api";
import {
  EXPLORE_PATH,
  HOME_PATH,
  SETTINGS_PATH,
  navigateToListingDetails,
  navigateToPath,
  navigateToSellerProfile,
} from "./lib/appNavigation";
import {
  buildListingShareUrl,
  getListingParamsFromUrl,
  syncListingParamsInUrl,
} from "./lib/listingUrl";
import { getListingItemConfig } from "./listingSchemas";
import { useAuthUser } from "./hooks/useAuthUser";
import { fetchListingById } from "./lib/listings";
import {
  isListingSaved,
  subscribeToSavedListingChanges,
  toggleSavedListingId,
} from "./lib/savedListings";

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

function formatSpecValue(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default function ListingDetailsPage() {
  const { user: firebaseUser } = useAuthUser();
  const [routeState, setRouteState] = useState(() => getListingParamsFromUrl());
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saved, setSaved] = useState(false);

  const listingId = routeState.listing || "";

  useEffect(() => {
    const syncRouteState = () => setRouteState(getListingParamsFromUrl());
    window.addEventListener("popstate", syncRouteState);
    return () => window.removeEventListener("popstate", syncRouteState);
  }, []);

  useEffect(() => {
    const syncSavedState = () => {
      if (!listingId) {
        setSaved(false);
        return;
      }
      setSaved(isListingSaved(listingId, firebaseUser?.uid));
    };

    syncSavedState();
    return subscribeToSavedListingChanges(syncSavedState);
  }, [listingId, firebaseUser?.uid]);

  useEffect(() => {
    const loadListing = async () => {
      if (!listingId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const found = await fetchListingById(listingId);
        setListing(found);

        if (!found) {
          setSeller(null);
          setRatingSummary(null);
          setRelatedListings([]);
          return;
        }

        try {
          await fetch(`/api/listings/${found.id}/view`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Failed to track listing view", error);
        }

        const [sellerResult, ratingResult, relatedResult] = await Promise.allSettled([
          apiFetch(`/api/users/${found.seller_uid}`),
          apiFetch(`/api/users/${found.seller_uid}/rating-summary`),
          apiFetch(`/api/listings/${found.id}/related?limit=6`),
        ]);

        setSeller(sellerResult.status === "fulfilled" ? sellerResult.value : null);
        setRatingSummary(ratingResult.status === "fulfilled" ? ratingResult.value : null);
        setRelatedListings(
          relatedResult.status === "fulfilled" && Array.isArray(relatedResult.value)
            ? relatedResult.value
            : []
        );
      } catch (error) {
        console.error("Failed to load listing details page", error);
        setListing(null);
        setSeller(null);
        setRatingSummary(null);
        setRelatedListings([]);
      } finally {
        setLoading(false);
      }
    };

    void loadListing();
  }, [listingId]);

  const galleryImages = useMemo(() => {
    if (!listing) return [];
    return Array.isArray(listing.photos) && listing.photos.length > 0
      ? listing.photos
      : [`https://picsum.photos/seed/${listing.id}/900/900`];
  }, [listing]);

  const currentGalleryIndex = Math.min(
    Math.max(routeState.imageIndex || 0, 0),
    Math.max(galleryImages.length - 1, 0)
  );

  useEffect(() => {
    if (!listing || galleryImages.length === 0) return;
    if (currentGalleryIndex !== (routeState.imageIndex || 0)) {
      syncListingParamsInUrl(listing.id, currentGalleryIndex);
    }
  }, [listing, galleryImages.length, currentGalleryIndex, routeState.imageIndex]);

  const itemConfig = useMemo(() => {
    if (!listing?.category || !listing.subcategory || !listing.item_type) return null;
    return getListingItemConfig(listing.category, listing.subcategory, listing.item_type);
  }, [listing]);

  const groupedSpecs = useMemo(() => {
    if (!listing?.spec_values || !itemConfig) return [];

    return itemConfig.fieldGroups
      .map((group) => {
        const rows = group.keys
          .map((key) => {
            const field = itemConfig.schema.fields.find((f) => f.key === key);
            if (!field) return null;
            const rawValue = listing.spec_values?.[key];
            if (
              rawValue === null ||
              rawValue === undefined ||
              rawValue === "" ||
              (Array.isArray(rawValue) && rawValue.length === 0)
            ) {
              return null;
            }
            return { key, label: field.label, value: formatSpecValue(rawValue) };
          })
          .filter(Boolean);

        if (!rows.length) return null;
        return {
          title: group.title,
          rows: rows as Array<{ key: string; label: string; value: string }>,
        };
      })
      .filter(Boolean) as Array<{
      title: string;
      rows: Array<{ key: string; label: string; value: string }>;
    }>;
  }, [listing, itemConfig]);

  const availableQuantity = listing
    ? Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0))
    : 0;

  const currentImage = galleryImages[currentGalleryIndex] || galleryImages[0] || "";

  const handleShare = async () => {
    if (!listing) return;
    const shareUrl = buildListingShareUrl(listing.id, currentGalleryIndex);
    const shareText = `BuyMesho Listing\n${listing.name}\nPrice: MK ${Number(
      listing.price
    ).toLocaleString()}\nCampus: ${listing.university}\nWhatsApp: ${
      listing.whatsapp_number
    }\n\nOpen this listing: ${shareUrl}`;

    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title: `BuyMesho: ${listing.name}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      alert("Share text copied.");
    } catch {
      prompt("Copy to share:", shareText);
    }
  };

  const handleToggleSaved = () => {
    if (!listing) return;
    const nextSaved = toggleSavedListingId(listing.id, firebaseUser?.uid);
    setSaved(nextSaved);
  };

  const handleContactSeller = async () => {
    if (!listing) return;

    if (!firebaseUser) {
      navigateToPath("/login");
      return;
    }

    try {
      await fetch(`/api/listings/${listing.id}/whatsapp-click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to track WhatsApp click", error);
    }

    window.open(
      `https://wa.me/${listing.whatsapp_number}?text=${encodeURIComponent(
        `Hi, I'm interested in your "${listing.name}" on BuyMesho. Is it still available?\n\nListing: ${buildListingShareUrl(
          listing.id,
          currentGalleryIndex
        )}`
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
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
                Listing details
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
            Loading listing details...
          </div>
        ) : !listing ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Listing not found</h1>
            <p className="mt-3 text-sm text-zinc-500">
              This listing could not be loaded or may no longer be available.
            </p>
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
            <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-6">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="relative rounded-[1.5rem] overflow-hidden bg-zinc-100 h-[360px] sm:h-[460px] md:h-[540px]">
                  <img src={currentImage} alt={listing.name} className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(true)}
                    className="absolute top-4 right-4 h-11 w-11 rounded-full bg-white/90 hover:bg-white border border-zinc-200 shadow flex items-center justify-center"
                  >
                    <Expand className="w-5 h-5" />
                  </button>
                  {galleryImages.length > 1 && (
                    <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/75 text-white text-xs font-bold">
                      {currentGalleryIndex + 1} / {galleryImages.length}
                    </div>
                  )}
                </div>

                {galleryImages.length > 1 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {galleryImages.map((url, idx) => (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => {
                          syncListingParamsInUrl(listing.id, idx);
                          setRouteState((prev) => ({ ...prev, imageIndex: idx }));
                        }}
                        className={`w-16 h-16 rounded-xl overflow-hidden border flex-shrink-0 ${
                          idx === currentGalleryIndex ? "border-zinc-900" : "border-zinc-200"
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {listing.video_url ? (
                  <div className="mt-4 rounded-[1.5rem] overflow-hidden border bg-black">
                    <video src={listing.video_url} controls className="w-full" />
                  </div>
                ) : null}
              </div>

              <div className="space-y-6">
                <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                        {listing.category}
                      </p>
                      <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">
                        {listing.name}
                      </h1>
                      <p className="mt-3 text-3xl font-black tracking-tight text-zinc-900">
                        MK {Number(listing.price).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide ${
                        listing.status === "sold" || availableQuantity === 0
                          ? "bg-zinc-200 text-zinc-600"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {listing.status === "sold" || availableQuantity === 0
                        ? "Sold out"
                        : `${availableQuantity} left`}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-bold uppercase tracking-[0.12em]">
                      {listing.university}
                    </span>
                    {listing.subcategory ? (
                      <span className="px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-bold uppercase tracking-[0.12em]">
                        {listing.subcategory}
                      </span>
                    ) : null}
                    {listing.item_type ? (
                      <span className="px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-bold uppercase tracking-[0.12em]">
                        {listing.item_type}
                      </span>
                    ) : null}
                    {listing.condition ? (
                      <span className="px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-bold uppercase tracking-[0.12em]">
                        {listing.condition}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6 space-y-3">
                    <button
                      type="button"
                      onClick={handleContactSeller}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
                    >
                      {firebaseUser ? <MessageCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      {firebaseUser ? "Contact on WhatsApp" : "Log in to Contact"}
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleToggleSaved}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${
                          saved
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
                        {saved ? "Saved" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Share
                      </button>
                    </div>
                  </div>
                </section>

                <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                    Description
                  </p>
                  <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed whitespace-pre-wrap">
                    {listing.description}
                  </p>
                </section>

                <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                        Seller
                      </p>
                      <button
                        type="button"
                        onClick={() => seller?.uid && navigateToSellerProfile(seller.uid)}
                        className="mt-2 flex items-center gap-2 text-left hover:opacity-80"
                      >
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100">
                          {seller?.business_logo ? (
                            <img
                              src={seller.business_logo}
                              alt={seller.business_name || "Seller"}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black tracking-tight text-zinc-900">
                              {seller?.business_name || listing.business_name}
                            </h2>
                            {seller?.is_verified || listing.is_verified ? (
                              <ShieldCheck className="w-4 h-4 text-blue-500" />
                            ) : null}
                          </div>
                          <p className="text-sm text-zinc-500">
                            {seller?.university || listing.university}
                          </p>
                        </div>
                      </button>
                    </div>
                    <div className="text-right text-sm text-zinc-500">
                      <p>
                        Joined:{" "}
                        <span className="font-semibold text-zinc-900">{formatDate(seller?.join_date)}</span>
                      </p>
                      <p className="mt-1">
                        Profile views:{" "}
                        <span className="font-semibold text-zinc-900">{seller?.profile_views ?? 0}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-4">
                      <p className="text-xs font-bold uppercase text-zinc-400 mb-1">Rating</p>
                      <p className="text-lg font-black text-zinc-900">
                        {ratingSummary ? ratingSummary.averageRating.toFixed(1) : "—"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-4">
                      <p className="text-xs font-bold uppercase text-zinc-400 mb-1">Ratings</p>
                      <p className="text-lg font-black text-zinc-900">{ratingSummary?.ratingCount ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-4">
                      <p className="text-xs font-bold uppercase text-zinc-400 mb-1">Views</p>
                      <p className="inline-flex items-center gap-2 text-lg font-black text-zinc-900">
                        <Eye className="w-4 h-4" />
                        {listing.views_count ?? 0}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </section>

            <section className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                  Specifications
                </p>
                {groupedSpecs.length > 0 ? (
                  <div className="mt-5 space-y-5">
                    {groupedSpecs.map((group) => (
                      <div key={group.title}>
                        <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                          {group.title}
                        </h3>
                        <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 divide-y divide-zinc-200 overflow-hidden">
                          {group.rows.map((row) => (
                            <div
                              key={row.key}
                              className="px-4 py-3 grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-4 items-start"
                            >
                              <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide border-r border-zinc-200 pr-4">
                                {row.label}
                              </p>
                              <p className="text-sm font-semibold text-zinc-900 text-right break-words">
                                {row.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
                    No structured specifications were added for this listing.
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                      Related
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
                      You may also want these
                    </h2>
                  </div>
                  <div className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-600">
                    {relatedListings.length} item{relatedListings.length === 1 ? "" : "s"}
                  </div>
                </div>

                {relatedListings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {relatedListings.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigateToListingDetails(item.id, 0)}
                        className="text-left rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 hover:bg-zinc-100 transition-colors"
                      >
                        <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 mb-4">
                          <img
                            src={item.photos?.[0] || `https://picsum.photos/seed/${item.id}/600/450`}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h3 className="text-lg font-extrabold text-zinc-900 line-clamp-1">
                          {item.name}
                        </h3>
                        <p className="mt-2 text-sm text-zinc-500 line-clamp-2">{item.description}</p>
                        <p className="mt-3 text-2xl font-black tracking-tight text-zinc-900">
                          MK {Number(item.price).toLocaleString()}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                    No related listings available right now.
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {isFullscreen && listing && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-5 right-5 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            ×
          </button>
          <div
            className="max-w-[95vw] max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={currentImage} alt={listing.name} className="max-w-full max-h-full object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

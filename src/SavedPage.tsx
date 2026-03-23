import { Bookmark, ChevronLeft, Loader2, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Listing, UserProfile } from "./types";
import { apiFetch } from "./lib/api";
import { EXPLORE_PATH, HOME_PATH, navigateToExploreListing, navigateToPath } from "./lib/appNavigation";

function getSavedListingIds() {
  try {
    const guestRaw = localStorage.getItem("savedListingIds:guest");
    const guestParsed = guestRaw ? JSON.parse(guestRaw) : [];
    const guestIds = Array.isArray(guestParsed)
      ? guestParsed.filter((x) => Number.isInteger(x))
      : [];

    const keys = Object.keys(localStorage).filter((key) => key.startsWith("savedListingIds:"));
    const merged = new Set<number>(guestIds);

    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        parsed.forEach((value) => {
          if (Number.isInteger(value)) {
            merged.add(value);
          }
        });
      }
    });

    return Array.from(merged);
  } catch {
    return [];
  }
}

export default function SavedPage() {
  const [savedIds, setSavedIds] = useState<number[]>(() => getSavedListingIds());
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSavedIds(getSavedListingIds());
  }, []);

  useEffect(() => {
    const loadSavedListings = async () => {
      if (!savedIds.length) {
        setListings([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await apiFetch("/api/listings?page=1&pageSize=120");
        const allItems = Array.isArray(data?.items) ? data.items : [];
        setListings(allItems.filter((item: Listing) => savedIds.includes(item.id)));
      } catch (error) {
        console.error("Failed to load saved listings", error);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    void loadSavedListings();
  }, [savedIds]);

  const filteredListings = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return listings;

    return listings.filter((listing) => {
      return [listing.name, listing.business_name, listing.category, listing.university]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [listings, search]);

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
                Saved listings
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3">
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
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Saved</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
                Keep track of listings you may want later.
              </h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">
                Your saved listings now live in a dedicated page instead of a floating modal, making navigation feel more deliberate and serious.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 min-w-[220px]">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">Saved count</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-zinc-900">{savedIds.length}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved listings..."
              className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-300 rounded-2xl text-sm text-zinc-800 placeholder:text-zinc-400 shadow-sm focus:border-red-900 focus:ring-4 focus:ring-red-900/10 focus:shadow-md outline-none transition-all"
            />
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm flex items-center justify-center gap-3 text-zinc-500 font-medium">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading saved listings...
            </div>
          ) : filteredListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredListings.map((listing) => {
                const isAvailable = Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0)) > 0;
                return (
                  <button
                    key={listing.id}
                    type="button"
                    onClick={() => navigateToExploreListing(listing.id, 0)}
                    className="text-left rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50 transition-colors"
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
                      <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] ${isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>
                        {isAvailable ? "Available" : "Sold out"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : savedIds.length === 0 ? (
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                <Bookmark className="w-7 h-7 text-zinc-400" />
              </div>
              <h2 className="text-xl font-extrabold text-zinc-900">No saved listings yet</h2>
              <p className="mt-2 text-sm text-zinc-500 max-w-md mx-auto">
                Save useful items while exploring so you can return to them quickly from a dedicated page.
              </p>
              <button
                type="button"
                onClick={() => navigateToPath(EXPLORE_PATH)}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
              >
                <ChevronLeft className="w-4 h-4 rotate-180" />
                Go to Explore
              </button>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
              <h2 className="text-xl font-extrabold text-zinc-900">No saved listings match this search</h2>
              <p className="mt-2 text-sm text-zinc-500">Try a different keyword or go back to Explore for more options.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

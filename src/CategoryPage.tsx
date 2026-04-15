import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Loader2,
  Search,
  ShoppingBag,
  Smartphone,
  BookOpen,
  Store,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "./lib/api";
import {
  BECOME_SELLER_PATH,
  LOGIN_PATH,
  navigateToCreateListing,
  navigateToExplore,
  navigateToPath,
} from "./lib/appNavigation";
import { getListingSubcategories } from "./listingSchemas/registry";
import CategoryListingCard from "./components/category/CategoryListingCard";
import FormDropdown from "./components/FormDropdown";
import FeedbackModal from "./components/FeedbackModal";
import { useAccountProfile } from "./hooks/useAccountProfile";

type CategoryKey = "phones" | "fashion" | "books" | "food" | "beauty";

type CategoryConfig = {
  key: CategoryKey;
  title: string;
  subtitle: string;
  description: string;
  heroIcon: ElementType;
  apiCategory: string;
  accent: string;
};

type ListingPreview = {
  id: number | string;
  name: string;
  price: number | string;
  description?: string | null;
  photos?: string[];
  category?: string;
  subcategory?: string | null;
  university?: string;
};

const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
  phones: {
    key: "phones",
    title: "Phones & Gadgets",
    subtitle: "Campus tech that moves fast",
    description:
      "Browse devices, chargers, earphones, accessories, and practical student tech posted in the marketplace.",
    heroIcon: Smartphone,
    apiCategory: "Electronics & Gadgets",
    accent: "from-red-900/10 to-zinc-100",
  },
  fashion: {
    key: "fashion",
    title: "Fashion & Clothing",
    subtitle: "Style for campus life",
    description:
      "Find clothes, bags, shoes, and everyday style pieces listed by students and campus sellers.",
    heroIcon: ShoppingBag,
    apiCategory: "Fashion & Clothing",
    accent: "from-zinc-900/10 to-zinc-100",
  },
  books: {
    key: "books",
    title: "Books & Study Tools",
    subtitle: "Academic essentials",
    description:
      "Books, calculators, stationery, and useful study tools grouped into one clean category page.",
    heroIcon: BookOpen,
    apiCategory: "Academic Services",
    accent: "from-amber-500/10 to-zinc-100",
  },
  food: {
    key: "food",
    title: "Eatery & Fast Foods",
    subtitle: "Campus meals, fast foods, and drinks",
    description:
      "Browse eatery options, fast foods, and drinks that students can discover quickly without digging through filters.",
    heroIcon: Store,
    apiCategory: "Food & Snacks",
    accent: "from-emerald-500/10 to-zinc-100",
  },
  beauty: {
    key: "beauty",
    title: "Beauty & Personal Care",
    subtitle: "Beauty products and personal care",
    description:
      "Browse beauty products, hair care, skincare, fragrances, and personal care essentials posted by campus sellers.",
    heroIcon: Sparkles,
    apiCategory: "Beauty & Personal Care",
    accent: "from-pink-500/10 to-zinc-100",
  },
};

export default function CategoryPage() {
  const { firebaseUser, profile, profileLoading } = useAccountProfile();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ListingPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("Newest first");
  const [campus, setCampus] = useState("All campuses");
  const [subcategory, setSubcategory] = useState("All subcategories");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [authGuardOpen, setAuthGuardOpen] = useState(false);

  const categoryKey = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("category");
    if (
      value === "phones" ||
      value === "fashion" ||
      value === "books" ||
      value === "food" ||
      value === "beauty"
    ) {
      return value;
    }
    return "phones";
  }, []);

  const config = CATEGORY_CONFIG[categoryKey];

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await apiFetch(
          `/api/listings?category=${encodeURIComponent(config.apiCategory)}&pageSize=24`
        );

        if (cancelled) return;

        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Could not load category listings.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [config.apiCategory]);

  const subcategoryOptions = useMemo(() => {
    const subs = getListingSubcategories(config.apiCategory);
    return ["All subcategories", ...subs];
  }, [config.apiCategory]);

  const campusOptions = useMemo(() => {
  const seen = new Set<string>();
  const campuses: string[] = [];

  for (const item of items) {
    const university = item.university?.trim();
    if (!university) continue;

    const normalized = university.toLowerCase();
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    campuses.push(university);
  }

  campuses.sort((a, b) => a.localeCompare(b));
  return ["All campuses", ...campuses];
}, [items]);

  const filteredAndSortedItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const normalizedCampus = campus.trim().toLowerCase();
    const normalizedSubcategory = subcategory.trim().toLowerCase();

    const filtered = items.filter((item) => {
      const campusMatch =
        normalizedCampus === "all campuses" ||
        (item.university || "").trim().toLowerCase() === normalizedCampus;

      if (!campusMatch) return false;

      const subcategoryMatch =
        normalizedSubcategory === "all subcategories" ||
        (item.subcategory || "").trim().toLowerCase() === normalizedSubcategory;

      if (!subcategoryMatch) return false;

      if (!q) return true;

      const haystack = [item.name, item.description, item.category, item.subcategory, item.university]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });

    const sorted = [...filtered].sort((a, b) => {
      const aPrice = Number(a.price) || 0;
      const bPrice = Number(b.price) || 0;

      if (sortBy === "Price: low to high") return aPrice - bPrice;
      if (sortBy === "Price: high to low") return bPrice - aPrice;

      const aId = Number(a.id) || 0;
      const bId = Number(b.id) || 0;
      return bId - aId;
    });

    return sorted;
  }, [items, search, sortBy, campus, subcategory]);

  const handleSellClick = () => {
    if (!firebaseUser) {
      setAuthGuardOpen(true);
      return;
    }

    if (profileLoading) return;

    if (profile?.is_seller) {
      navigateToCreateListing();
      return;
    }

    navigateToPath(BECOME_SELLER_PATH);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigateToPath("/")}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </button>

          <button
            type="button"
            onClick={() => navigateToExplore()}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
          >
            Market
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main>
        <section className={`bg-gradient-to-br ${config.accent} border-b border-zinc-200`}>
          <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-500"
            >
              Category landing page
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 text-4xl sm:text-5xl font-black tracking-[-0.05em] leading-[0.95]"
            >
              {config.title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-sm sm:text-base text-zinc-600 max-w-2xl leading-relaxed"
            >
              {config.description}
            </motion.p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigateToExplore()}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-red-800"
              >
                Browse all filters
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSellClick}
                disabled={profileLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Sell
                <Store className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => navigateToPath("/")}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
              >
                Back to homepage
              </button>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search in ${config.title.toLowerCase()}...`}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-200 bg-white text-sm outline-none focus:border-red-900 focus:ring-4 focus:ring-red-900/10"
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((value) => !value)}
              className="mt-3 w-full inline-flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm font-extrabold text-zinc-900 hover:bg-zinc-100 transition-colors"
              aria-label="Toggle filter options"
              aria-expanded={filtersOpen}
              aria-controls="category-filter-panel"
            >
              <span>Filter</span>
              <ChevronDown
                className={`w-4 h-4 text-zinc-600 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
              />
            </button>

            {filtersOpen ? (
              <div
                id="category-filter-panel"
                className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3"
              >
                <FormDropdown
                  label="Subcategory"
                  value={subcategory}
                  onChange={(value) => setSubcategory(value)}
                  placeholder="Choose subcategory"
                  searchPlaceholder="Search subcategories..."
                  options={subcategoryOptions}
                />

                <FormDropdown
                  label="Campus"
                  value={campus}
                  onChange={(value) => setCampus(value)}
                  placeholder="Choose campus"
                  searchPlaceholder="Search campuses..."
                  options={campusOptions}
                />

                <FormDropdown
                  label="Sort by"
                  value={sortBy}
                  onChange={(value) => setSortBy(value)}
                  placeholder="Choose sort order"
                  searchPlaceholder="Search sort order..."
                  options={[
                    "Newest first",
                    "Price: low to high",
                    "Price: high to low",
                  ]}
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-end justify-between gap-3 mb-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                Featured listings
              </p>
              <h3 className="mt-2 text-2xl font-black tracking-tight">
                Real cards from this category
              </h3>
            </div>
            <span className="text-sm font-bold text-zinc-500">
              {filteredAndSortedItems.length} item{filteredAndSortedItems.length === 1 ? "" : "s"}
            </span>
          </div>

          {error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {error}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full rounded-3xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading listings...
              </div>
            ) : filteredAndSortedItems.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">
                No listings found in this category.
              </div>
            ) : (
              filteredAndSortedItems.map((item) => (
                <div key={item.id}>
                  <CategoryListingCard item={item} categoryLabel={config.title} />
                </div>
              ))
            )}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="rounded-[2rem] bg-zinc-900 text-white p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Need the full marketplace view?</h3>
                <p className="mt-2 text-sm text-zinc-300">
                  Open Market for all filters, sorting, and broader browsing.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigateToExplore()}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
              >
                Open Market
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <FeedbackModal
        open={authGuardOpen}
        type="error"
        title="Login required"
        message="Log in to continue."
        onClose={() => setAuthGuardOpen(false)}
        actions={[
          {
            label: "Log in",
            onClick: () => {
              setAuthGuardOpen(false);
              navigateToPath(LOGIN_PATH);
            },
          },
          {
            label: "Cancel",
            onClick: () => setAuthGuardOpen(false),
            variant: "secondary",
          },
        ]}
      />
    </div>
  );
}

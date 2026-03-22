import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  MapPin,
  RefreshCw,
  Search,
  Tag,
  Funnel,
  X,
} from "lucide-react";
import { UNIVERSITIES, CATEGORIES } from "../constants";
import { getListingItemTypes, getListingSubcategories } from "../listingSchemas";

type FilterSectionProps = {
  selectedUniv: string;
  setSelectedUniv: (v: string) => void;
  selectedCat: string;
  setSelectedCat: (v: string) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (v: string) => void;
  selectedItemType: string;
  setSelectedItemType: (v: string) => void;
  selectedCondition: string;
  setSelectedCondition: (v: string) => void;
  hideSoldOut: boolean;
  setHideSoldOut: (v: boolean) => void;
  minPrice: string;
  setMinPrice: (v: string) => void;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
};

export default function FilterSection({
  selectedUniv,
  setSelectedUniv,
  selectedCat,
  setSelectedCat,
  selectedSubcategory,
  setSelectedSubcategory,
  selectedItemType,
  setSelectedItemType,
  selectedCondition,
  setSelectedCondition,
  hideSoldOut,
  setHideSoldOut,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  sortBy,
  setSortBy,
}: FilterSectionProps) {
  const [openDropdown, setOpenDropdown] = useState<
    | "university"
    | "category"
    | "subcategory"
    | "itemType"
    | "condition"
    | "sort"
    | null
  >(null);
  const [universityQuery, setUniversityQuery] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-filter-dropdown]")) {
        setOpenDropdown(null);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (openDropdown !== "university") {
      setUniversityQuery("");
    }
  }, [openDropdown]);

  const filteredUniversities = useMemo(() => {
    const trimmed = universityQuery.trim().toLowerCase();

    if (!trimmed) return UNIVERSITIES;

    return UNIVERSITIES.filter((u) => u.toLowerCase().includes(trimmed));
  }, [universityQuery]);

  const activeExtraFilterCount = [
    selectedCat,
    selectedSubcategory,
    selectedItemType,
    selectedCondition,
    hideSoldOut ? "sold_out_hidden" : "",
    minPrice,
    maxPrice,
    sortBy !== "newest" ? sortBy : "",
  ].filter(Boolean).length;

  const activeFilterCount =
    activeExtraFilterCount + (selectedUniv ? 1 : 0);

  const clearExtraFilters = () => {
    setSelectedCat("");
    setSelectedSubcategory("");
    setSelectedItemType("");
    setSelectedCondition("");
    setHideSoldOut(false);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
    setOpenDropdown(null);
  };

  const clearAllFilters = () => {
    setSelectedUniv("");
    clearExtraFilters();
  };

  useEffect(() => {
    if (!showMoreFilters) {
      if (
        openDropdown === "category" ||
        openDropdown === "subcategory" ||
        openDropdown === "itemType" ||
        openDropdown === "condition" ||
        openDropdown === "sort"
      ) {
        setOpenDropdown(null);
      }
    }
  }, [showMoreFilters, openDropdown]);

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "popular", label: "Most Popular" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
  ];

  const conditionOptions = ["new", "used", "refurbished"];
  const subcategoryOptions = getListingSubcategories(selectedCat);
  const itemTypeOptions = getListingItemTypes(selectedCat, selectedSubcategory);
  const activeFilterChips = [
    selectedUniv
      ? {
          key: "university",
          label: `University: ${selectedUniv}`,
          onRemove: () => setSelectedUniv(""),
        }
      : null,
    selectedCat
      ? {
          key: "category",
          label: `Category: ${selectedCat}`,
          onRemove: () => setSelectedCat(""),
        }
      : null,
    selectedCondition
      ? {
          key: "condition",
          label: `Condition: ${selectedCondition}`,
          onRemove: () => setSelectedCondition(""),
        }
      : null,
    minPrice
      ? {
          key: "minPrice",
          label: `Min: MK ${minPrice}`,
          onRemove: () => setMinPrice(""),
        }
      : null,
    maxPrice
      ? {
          key: "maxPrice",
          label: `Max: MK ${maxPrice}`,
          onRemove: () => setMaxPrice(""),
        }
      : null,
    sortBy !== "newest"
      ? {
          key: "sort",
          label: `Sort: ${
            sortOptions.find((option) => option.value === sortBy)?.label || "Newest First"
          }`,
          onRemove: () => setSortBy("newest"),
        }
      : null,
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  const triggerBase =
    "w-full flex items-center justify-between gap-3 bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 transition-all";
  const menuShell =
    "absolute top-[calc(100%+0.5rem)] left-0 w-full bg-white border border-zinc-200 rounded-2xl shadow-xl z-30 overflow-hidden";
  const menuBase = "max-h-64 overflow-y-auto p-2";
  const itemBase =
    "w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors capitalize";
  const activeItem = "bg-zinc-900 text-white";
  const inactiveItem = "text-zinc-700 hover:bg-zinc-100";
  const searchWrap = "p-2 border-b border-zinc-100 bg-white";
  const searchInput =
    "w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-zinc-300";

  return (
     <>
  <div className="py-6 space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
      <div className="space-y-2 relative" data-filter-dropdown>
        <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-primary" /> University
        </label>

        <button
          type="button"
          onClick={() =>
            setOpenDropdown(openDropdown === "university" ? null : "university")
          }
          className={triggerBase}
        >
          <span className="truncate text-left">
            {selectedUniv || "All Universities"}
          </span>
          <ChevronRight
            className={`w-4 h-4 text-zinc-400 transition-transform ${
              openDropdown === "university" ? "rotate-90" : "rotate-0"
            }`}
          />
        </button>

        {openDropdown === "university" && (
          <div className={menuShell}>
            <div className={searchWrap}>
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={universityQuery}
                  onChange={(e) => setUniversityQuery(e.target.value)}
                  placeholder="Search university..."
                  className={searchInput}
                />
              </div>
            </div>

            <div className={menuBase}>
              <button
                type="button"
                onClick={() => {
                  setSelectedUniv("");
                  setOpenDropdown(null);
                  setUniversityQuery("");
                }}
                className={`${itemBase} ${
                  selectedUniv === "" ? activeItem : inactiveItem
                }`}
              >
                All Universities
              </button>

              {filteredUniversities.length > 0 ? (
                filteredUniversities.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      setSelectedUniv(u);
                      setOpenDropdown(null);
                      setUniversityQuery("");
                    }}
                    className={`${itemBase} ${
                      selectedUniv === u ? activeItem : inactiveItem
                    }`}
                  >
                    {u}
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-sm text-zinc-500">
                  No universities found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => {
            setShowMoreFilters((prev) => !prev);
            setOpenDropdown(null);
          }}
          className={`relative inline-flex items-center gap-2 h-[52px] px-5 rounded-2xl border text-sm font-extrabold transition-all shadow-sm ${
            showMoreFilters || activeExtraFilterCount > 0
              ? "bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800"
              : "bg-amber-50 text-zinc-900 border-amber-200 hover:bg-amber-100"
          }`}
        >
          <Funnel className="w-4 h-4" />
          Filters

          {activeExtraFilterCount > 0 && (
            <span
              className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-black ${
                showMoreFilters
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-900 text-white"
              }`}
            >
              {activeExtraFilterCount}
            </span>
          )}
        </button>
      </div>
    </div>

    {activeFilterCount > 0 && (
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 md:p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
            Active Filters ({activeFilterCount})
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-bold text-zinc-600 hover:text-zinc-900"
          >
            Clear all
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 transition-colors"
            >
              <span className="max-w-[220px] truncate">{chip.label}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>
    )}

    {showMoreFilters && (
      <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
              More Filters
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              Narrow down listings faster
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowMoreFilters(false);
              setOpenDropdown(null);
            }}
            className="h-10 w-10 rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 flex items-center justify-center"
            aria-label="Close filters"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="space-y-2 relative" data-filter-dropdown>
            <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-primary" /> Category
            </label>

            <button
              type="button"
              onClick={() =>
                setOpenDropdown(openDropdown === "category" ? null : "category")
              }
              className={triggerBase}
            >
              <span className="truncate text-left">
                {selectedCat || "All Categories"}
              </span>
              <ChevronRight
                className={`w-4 h-4 text-zinc-400 transition-transform ${
                  openDropdown === "category" ? "rotate-90" : "rotate-0"
                }`}
              />
            </button>

            {openDropdown === "category" && (
              <div className={menuShell}>
                <div className={menuBase}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCat("");
                      setOpenDropdown(null);
                    }}
                    className={`${itemBase} ${
                      selectedCat === "" ? activeItem : inactiveItem
                    }`}
                  >
                    All Categories
                  </button>

                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setSelectedCat(c);
                        setSelectedSubcategory("");
                        setSelectedItemType("");
                        setOpenDropdown(null);
                      }}
                      className={`${itemBase} ${
                        selectedCat === c ? activeItem : inactiveItem
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedCat && (
            <div className="space-y-2 relative" data-filter-dropdown>
              <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-primary" /> Subcategory
              </label>

              <button
                type="button"
                onClick={() =>
                  setOpenDropdown(
                    openDropdown === "subcategory" ? null : "subcategory"
                  )
                }
                className={triggerBase}
              >
                <span className="truncate text-left">
                  {selectedSubcategory || "All Subcategories"}
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-zinc-400 transition-transform ${
                    openDropdown === "subcategory" ? "rotate-90" : "rotate-0"
                  }`}
                />
              </button>

              {openDropdown === "subcategory" && (
                <div className={menuShell}>
                  <div className={menuBase}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubcategory("");
                        setSelectedItemType("");
                        setOpenDropdown(null);
                      }}
                      className={`${itemBase} ${
                        selectedSubcategory === "" ? activeItem : inactiveItem
                      }`}
                    >
                      All Subcategories
                    </button>

                    {subcategoryOptions.map((subcategory) => (
                      <button
                        key={subcategory}
                        type="button"
                        onClick={() => {
                          setSelectedSubcategory(subcategory);
                          setSelectedItemType("");
                          setOpenDropdown(null);
                        }}
                        className={`${itemBase} ${
                          selectedSubcategory === subcategory
                            ? activeItem
                            : inactiveItem
                        }`}
                      >
                        {subcategory}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedCat && selectedSubcategory && (
            <div className="space-y-2 relative" data-filter-dropdown>
              <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-primary" /> Item Type
              </label>

              <button
                type="button"
                onClick={() =>
                  setOpenDropdown(openDropdown === "itemType" ? null : "itemType")
                }
                className={triggerBase}
              >
                <span className="truncate text-left">
                  {selectedItemType || "All Item Types"}
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-zinc-400 transition-transform ${
                    openDropdown === "itemType" ? "rotate-90" : "rotate-0"
                  }`}
                />
              </button>

              {openDropdown === "itemType" && (
                <div className={menuShell}>
                  <div className={menuBase}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItemType("");
                        setOpenDropdown(null);
                      }}
                      className={`${itemBase} ${
                        selectedItemType === "" ? activeItem : inactiveItem
                      }`}
                    >
                      All Item Types
                    </button>

                    {itemTypeOptions.map((itemType) => (
                      <button
                        key={itemType}
                        type="button"
                        onClick={() => {
                          setSelectedItemType(itemType);
                          setOpenDropdown(null);
                        }}
                        className={`${itemBase} ${
                          selectedItemType === itemType ? activeItem : inactiveItem
                        }`}
                      >
                        {itemType}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 relative" data-filter-dropdown>
            <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-primary" /> Condition
            </label>

            <button
              type="button"
              onClick={() =>
                setOpenDropdown(openDropdown === "condition" ? null : "condition")
              }
              className={triggerBase}
            >
              <span className="truncate text-left">
                {selectedCondition || "All Conditions"}
              </span>
              <ChevronRight
                className={`w-4 h-4 text-zinc-400 transition-transform ${
                  openDropdown === "condition" ? "rotate-90" : "rotate-0"
                }`}
              />
            </button>

            {openDropdown === "condition" && (
              <div className={menuShell}>
                <div className={menuBase}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCondition("");
                      setOpenDropdown(null);
                    }}
                    className={`${itemBase} ${
                      selectedCondition === "" ? activeItem : inactiveItem
                    }`}
                  >
                    All Conditions
                  </button>

                  {conditionOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setSelectedCondition(c);
                        setOpenDropdown(null);
                      }}
                      className={`${itemBase} ${
                        selectedCondition === c ? activeItem : inactiveItem
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-primary" /> Price Range
            </label>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-semibold text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="number"
                min="0"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-semibold text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-2 relative" data-filter-dropdown>
            <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-primary" /> Sort
            </label>

            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === "sort" ? null : "sort")}
              className={triggerBase}
            >
              <span className="truncate text-left">
                {sortOptions.find((option) => option.value === sortBy)?.label ||
                  "Newest First"}
              </span>
              <ChevronRight
                className={`w-4 h-4 text-zinc-400 transition-transform ${
                  openDropdown === "sort" ? "rotate-90" : "rotate-0"
                }`}
              />
            </button>

            {openDropdown === "sort" && (
              <div className={menuShell}>
                <div className={menuBase}>
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSortBy(option.value);
                        setOpenDropdown(null);
                      }}
                      className={`${itemBase} ${
                        sortBy === option.value ? activeItem : inactiveItem
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <label className="inline-flex items-center gap-3 text-sm font-semibold text-zinc-700">
          <input
            type="checkbox"
            checked={hideSoldOut}
            onChange={(e) => setHideSoldOut(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
          />
          Hide sold-out listings
        </label>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={clearExtraFilters}
            className="px-4 py-2 rounded-xl bg-zinc-100 border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-200"
          >
            Clear Filters
          </button>
        </div>
      </div>
    )}
  </div>
</>
  );
}

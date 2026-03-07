import { useEffect, useState } from "react";
import { ChevronRight, MapPin, RefreshCw, Tag } from "lucide-react";
import { UNIVERSITIES, CATEGORIES } from "../constants";

type FilterSectionProps = {
  selectedUniv: string;
  setSelectedUniv: (v: string) => void;
  selectedCat: string;
  setSelectedCat: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
};

export default function FilterSection({
  selectedUniv,
  setSelectedUniv,
  selectedCat,
  setSelectedCat,
  sortBy,
  setSortBy,
}: FilterSectionProps) {
  const [openDropdown, setOpenDropdown] = useState<"university" | "category" | "sort" | null>(null);

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

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
  ];

  const triggerBase =
    "w-full flex items-center justify-between gap-3 bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 transition-all";
  const menuBase =
    "absolute top-[calc(100%+0.5rem)] left-0 w-full bg-white border border-zinc-200 rounded-2xl shadow-xl z-30 max-h-64 overflow-y-auto p-2";
  const itemBase =
    "w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors";
  const activeItem = "bg-zinc-900 text-white";
  const inactiveItem = "text-zinc-700 hover:bg-zinc-100";

  return (
    <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2 relative" data-filter-dropdown>
        <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-primary" /> University
        </label>

        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === "university" ? null : "university")}
          className={triggerBase}
        >
          <span>{selectedUniv || "All Universities"}</span>
          <ChevronRight
            className={`w-4 h-4 text-zinc-400 transition-transform ${
              openDropdown === "university" ? "rotate-90" : "rotate-0"
            }`}
          />
        </button>

        {openDropdown === "university" && (
          <div className={menuBase}>
            <button
              type="button"
              onClick={() => {
                setSelectedUniv("");
                setOpenDropdown(null);
              }}
              className={`${itemBase} ${selectedUniv === "" ? activeItem : inactiveItem}`}
            >
              All Universities
            </button>

            {UNIVERSITIES.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => {
                  setSelectedUniv(u);
                  setOpenDropdown(null);
                }}
                className={`${itemBase} ${selectedUniv === u ? activeItem : inactiveItem}`}
              >
                {u}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 relative" data-filter-dropdown>
        <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-primary" /> Category
        </label>

        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
          className={triggerBase}
        >
          <span>{selectedCat || "All Categories"}</span>
          <ChevronRight
            className={`w-4 h-4 text-zinc-400 transition-transform ${
              openDropdown === "category" ? "rotate-90" : "rotate-0"
            }`}
          />
        </button>

        {openDropdown === "category" && (
          <div className={menuBase}>
            <button
              type="button"
              onClick={() => {
                setSelectedCat("");
                setOpenDropdown(null);
              }}
              className={`${itemBase} ${selectedCat === "" ? activeItem : inactiveItem}`}
            >
              All Categories
            </button>

            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setSelectedCat(c);
                  setOpenDropdown(null);
                }}
                className={`${itemBase} ${selectedCat === c ? activeItem : inactiveItem}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
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
          <span>{sortOptions.find((option) => option.value === sortBy)?.label || "Newest First"}</span>
          <ChevronRight
            className={`w-4 h-4 text-zinc-400 transition-transform ${
              openDropdown === "sort" ? "rotate-90" : "rotate-0"
            }`}
          />
        </button>

        {openDropdown === "sort" && (
          <div className={menuBase}>
            {sortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSortBy(option.value);
                  setOpenDropdown(null);
                }}
                className={`${itemBase} ${sortBy === option.value ? activeItem : inactiveItem}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
          }

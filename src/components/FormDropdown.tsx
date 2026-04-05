import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";

type FormDropdownProps = {
  label: string;
  value: string;
  options: readonly string[] | string[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
};

export default function FormDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  disabled = false,
}: FormDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-form-dropdown]")) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setQuery("");
    }
  }, [disabled]);

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) return options;

    return options.filter((option) =>
      option.toLowerCase().includes(trimmed)
    );
  }, [options, query]);

  const triggerBase =
    "w-full flex items-center justify-between gap-3 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-white transition-all";
  const menuWrapper =
    "absolute top-[calc(100%+0.5rem)] left-0 w-full bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 overflow-hidden";
  const searchWrap =
    "p-2 border-b border-zinc-100 bg-white sticky top-0 z-10";
  const searchInput =
    "w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-zinc-300";
  const listWrap = "max-h-64 overflow-y-auto p-2";
  const itemBase =
    "w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors";
  const activeItem = "bg-zinc-900 text-white";
  const inactiveItem = "text-zinc-700 hover:bg-zinc-100";

  return (
    <div className="space-y-2 relative" data-form-dropdown>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
        {label}
      </label>

      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
          }
        }}
        disabled={disabled}
        className={`${triggerBase} ${disabled ? "cursor-not-allowed bg-zinc-100 text-zinc-500 hover:border-zinc-200 hover:bg-zinc-100" : ""}`}
      >
        <span className="truncate text-left">{value || placeholder}</span>
        <ChevronRight
          className={`w-4 h-4 text-zinc-400 transition-transform flex-shrink-0 ${
            open ? "rotate-90" : "rotate-0"
          }`}
        />
      </button>

      {open && (
        <div className={menuWrapper}>
          <div className={searchWrap}>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className={searchInput}
              />
            </div>
          </div>

          <div className={listWrap}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`${itemBase} ${
                    value === option ? activeItem : inactiveItem
                  }`}
                >
                  {option}
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-sm text-zinc-500">
                No results found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
 }

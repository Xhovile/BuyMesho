import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export type PremiumDropdownOption = {
  label: string;
  value: string;
};

type PremiumDropdownProps = {
  label?: string;
  value: string;
  options: PremiumDropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function PremiumDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Select an option",
  className = "",
}: PremiumDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const activeOption = options.find((option) => option.value === value);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label ? (
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">
          {label}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-4 focus:ring-red-900/10"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={activeOption ? "text-zinc-900" : "text-zinc-400"}>
          {activeOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <div className="max-h-64 overflow-auto p-1">
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                    selected
                      ? "bg-red-900 text-white"
                      : "text-zinc-800 hover:bg-zinc-100"
                  }`}
                >
                  <span className="font-medium">{option.label}</span>
                  {selected ? <Check className="h-4 w-4" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

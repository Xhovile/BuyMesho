import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

type FormDropdownProps = {
  label: string;
  value: string;
  options: readonly string[] | string[];
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function FormDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Select an option",
}: FormDropdownProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-form-dropdown]")) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const triggerBase =
    "w-full flex items-center justify-between gap-3 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-white transition-all";
  const menuBase =
    "absolute top-[calc(100%+0.5rem)] left-0 w-full bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto p-2";
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
        onClick={() => setOpen((prev) => !prev)}
        className={triggerBase}
      >
        <span>{value || placeholder}</span>
        <ChevronRight
          className={`w-4 h-4 text-zinc-400 transition-transform ${
            open ? "rotate-90" : "rotate-0"
          }`}
        />
      </button>

      {open && (
        <div className={menuBase}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`${itemBase} ${
                value === option ? activeItem : inactiveItem
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
 }

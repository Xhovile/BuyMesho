import { useEffect, useLayoutEffect, useRef } from "react";

import { QUICK_CHIPS, type HeaderChip } from "../../constants";

const CHIP_SCROLL_STORAGE_KEY = "__buymesho_header_chip_scroll_left";

type HeaderChipsProps = {
  selectedChip: HeaderChip;
  onChipChange?: (chip: HeaderChip) => void;
};

export default function HeaderChips({ selectedChip, onChipChange }: HeaderChipsProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const restoreRafRef = useRef<number | null>(null);

  const persistScrollPosition = () => {
    const el = scrollRef.current;
    if (!el) return;

    try {
      window.sessionStorage.setItem(CHIP_SCROLL_STORAGE_KEY, String(el.scrollLeft));
    } catch {
      // Ignore storage failures.
    }
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const restore = () => {
      try {
        const stored = window.sessionStorage.getItem(CHIP_SCROLL_STORAGE_KEY);
        if (stored === null) return;

        const next = Number(stored);
        if (Number.isFinite(next) && next >= 0) {
          el.scrollLeft = next;
        }
      } catch {
        // Ignore storage failures and keep the current viewport position.
      }
    };

    restore();
    restoreRafRef.current = window.requestAnimationFrame(restore);

    return () => {
      if (restoreRafRef.current !== null) {
        window.cancelAnimationFrame(restoreRafRef.current);
        restoreRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      persistScrollPosition();
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      persistScrollPosition();
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const activeButton = el.querySelector<HTMLButtonElement>(
      `[data-header-chip="${CSS.escape(selectedChip)}"]`
    );
    if (!activeButton) return;

    activeButton.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
    persistScrollPosition();
  }, [selectedChip]);

  return (
    <div className="px-3 py-1.5 bg-zinc-100 border-t border-zinc-200">
      <div className="mx-auto max-w-7xl">
        <div
          ref={scrollRef}
          className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex min-w-max items-center gap-4 pb-0.5">
            {QUICK_CHIPS.map((chip) => {
              const isActive = chip === selectedChip;
              return (
                <button
                  key={chip}
                  type="button"
                  data-header-chip={chip}
                  onPointerDown={persistScrollPosition}
                  onClick={() => {
                    persistScrollPosition();
                    onChipChange?.(chip);
                  }}
                  className={`inline-flex items-center whitespace-nowrap border-b-2 px-0 py-0.5 text-base font-bold font-sans leading-none transition-all ${
                    isActive
                      ? "border-red-900 text-red-900 drop-shadow-[0_0_6px_rgba(127,29,29,0.35)]"
                      : "border-transparent text-zinc-700 hover:text-red-900"
                  }`}
                  aria-pressed={isActive}
                  aria-label={chip}
                >
                  <span>{chip}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

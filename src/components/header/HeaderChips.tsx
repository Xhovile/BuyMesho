import { QUICK_CHIPS, type HeaderChip } from "../../constants";

type HeaderChipsProps = {
  selectedChip: HeaderChip;
  onChipChange?: (chip: HeaderChip) => void;
};

export default function HeaderChips({ selectedChip, onChipChange }: HeaderChipsProps) {
  return (
    <div className="px-3 py-1.5 bg-zinc-100 border-t border-zinc-200">
      <div className="mx-auto max-w-7xl">
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center gap-4 pb-0.5">
            {QUICK_CHIPS.map((chip) => {
              const isActive = chip === selectedChip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onChipChange?.(chip)}
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

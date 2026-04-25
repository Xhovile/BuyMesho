import { TabButton } from "./ListingDetailsShared";

type SectionKey = "details" | "explore" | "reviews";

const SECTION_LABELS: Record<SectionKey, string> = {
  details: "Details",
  explore: "Explore",
  reviews: "Reviews",
};

export default function ListingSectionTabs({
  activeSection,
  onNavigate,
}: {
  activeSection: SectionKey;
  onNavigate: (section: SectionKey) => void;
}) {
  return (
    <div className="sticky top-[73px] z-30 -mx-4 mt-8 border-y border-zinc-200 bg-white/90 px-4 backdrop-blur-sm sm:top-[77px]">
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-4 overflow-x-auto">
        <div className="flex gap-6">
          <TabButton active={activeSection === "details"} onClick={() => onNavigate("details")}>Details</TabButton>
          <TabButton active={activeSection === "explore"} onClick={() => onNavigate("explore")}>Explore</TabButton>
          <TabButton active={activeSection === "reviews"} onClick={() => onNavigate("reviews")}>Reviews</TabButton>
        </div>

        <div className="hidden shrink-0 items-center gap-2 pb-3 sm:flex">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Viewing</span>
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-900">
            {SECTION_LABELS[activeSection]}
          </span>
        </div>
      </div>
    </div>
  );
}

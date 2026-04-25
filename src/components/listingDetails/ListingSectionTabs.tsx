import { TabButton } from "./ListingDetailsShared";

type SectionKey = "details" | "explore" | "reviews";

export default function ListingSectionTabs({
  activeSection,
  onNavigate,
}: {
  activeSection: SectionKey;
  onNavigate: (section: SectionKey) => void;
}) {
  return (
    <div className="sticky top-[73px] z-30 -mx-4 mt-8 border-y border-zinc-200 bg-white/90 px-4 backdrop-blur-sm sm:top-[77px]">
      <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto">
        <TabButton active={activeSection === "details"} onClick={() => onNavigate("details")}>Details</TabButton>
        <TabButton active={activeSection === "explore"} onClick={() => onNavigate("explore")}>Explore</TabButton>
        <TabButton active={activeSection === "reviews"} onClick={() => onNavigate("reviews")}>Reviews</TabButton>
      </div>
    </div>
  );
}

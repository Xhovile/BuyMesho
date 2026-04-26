import { useEffect, useState } from "react";
import { TabButton } from "./ListingDetailsShared";

type SectionKey = "details" | "explore" | "reviews";

const SECTION_LABELS: Record<SectionKey, string> = {
  details: "Details",
  explore: "Explore",
  reviews: "Reviews",
};

const SECTION_ORDER: SectionKey[] = ["details", "explore", "reviews"];

export default function ListingSectionTabs({
  activeSection,
  onNavigate,
}: {
  activeSection: SectionKey;
  onNavigate: (section: SectionKey) => void;
}) {
  const [scrollActiveSection, setScrollActiveSection] = useState<SectionKey>(activeSection);

  useEffect(() => {
    const getSectionElement = (section: SectionKey) => document.getElementById(section);

    const updateActiveSection = () => {
      const threshold = 180;
      const scrollPosition = window.scrollY + threshold;
      let nextActive: SectionKey = "details";

      for (const section of SECTION_ORDER) {
        const element = getSectionElement(section);
        if (!element) continue;
        if (scrollPosition >= element.offsetTop) nextActive = section;
      }

      setScrollActiveSection(nextActive);
    };

    let rafId = 0;
    const onScroll = () => {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.cancelAnimationFrame(rafId);
    };
  }, [activeSection]);

  const displaySection = scrollActiveSection ?? activeSection;

  return (
    <div className="sticky top-[73px] z-30 -mx-4 mt-8 border-y border-zinc-200 bg-white/90 px-4 backdrop-blur-sm sm:top-[77px]">
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-4 overflow-x-auto">
        <div className="flex gap-6">
          <TabButton active={displaySection === "details"} onClick={() => onNavigate("details")}>Details</TabButton>
          <TabButton active={displaySection === "explore"} onClick={() => onNavigate("explore")}>Explore</TabButton>
          <TabButton active={displaySection === "reviews"} onClick={() => onNavigate("reviews")}>Reviews</TabButton>
        </div>

        <div className="hidden shrink-0 items-center gap-2 pb-3 sm:flex">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Viewing</span>
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-900">
            {SECTION_LABELS[displaySection]}
          </span>
        </div>
      </div>
    </div>
  );
}

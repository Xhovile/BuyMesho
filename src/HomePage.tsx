import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  navigateToLoginWithReturnPath,
  navigateToPath,
  ABOUT_PATH,
  EXPLORE_PATH,
  MARKET_CHIP_PATHS,
  PRIVACY_PATH,
  REPORT_PATH,
  SAFETY_PATH,
  SIGNUP_PATH,
  TERMS_PATH,
} from "./lib/appNavigation";
import FeedbackModal from "./components/FeedbackModal";
import FloatingCartButton from "./components/FloatingCartButton";
import CategorySection from "./components/home/CategorySection";
import EventsStrip from "./components/home/EventsStrip";
import HomeHeader from "./components/home/HomeHeader";
import HomeHero from "./components/home/HomeHero";
import HomeMobileDrawer from "./components/home/HomeMobileDrawer";
import ListingStrip from "./components/home/ListingStrip";
import { featuredSections } from "./home/home.constants";
import { useHomePageController } from "./hooks/useHomePageController";

function DeferredHomeSkeleton() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="h-3 w-28 rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-6 w-56 max-w-full rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-4 w-[min(100%,26rem)] rounded-full bg-zinc-200 animate-pulse" />
            </div>
            <div className="h-10 w-28 rounded-2xl bg-zinc-200 animate-pulse" />
          </div>
        </div>

        <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
          <div className="w-[220px] shrink-0 rounded-3xl border border-zinc-200 bg-white shadow-sm sm:w-[260px]">
            <div className="aspect-[4/3] bg-zinc-100 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-3/4 rounded-full bg-zinc-100 animate-pulse" />
              <div className="h-3 w-full rounded-full bg-zinc-100 animate-pulse" />
              <div className="h-3 w-5/6 rounded-full bg-zinc-100 animate-pulse" />
              <div className="h-10 w-full rounded-2xl bg-zinc-100 animate-pulse" />
            </div>
          </div>
          <div className="w-[220px] shrink-0 rounded-3xl border border-zinc-200 bg-white shadow-sm sm:w-[260px]">
            <div className="aspect-[4/3] bg-zinc-100 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-3/4 rounded-full bg-zinc-100 animate-pulse" />
              <div className="h-3 w-full rounded-full bg-zinc-100 animate-pulse" />
              <div className="h-3 w-5/6 rounded-full bg-zinc-100 animate-pulse" />
              <div className="h-10 w-full rounded-2xl bg-zinc-100 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-4">
          <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
            <div className="space-y-3">
              <div className="h-3 w-24 rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-5 w-52 max-w-full rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-4 w-[min(100%,28rem)] rounded-full bg-zinc-200 animate-pulse" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 sm:p-5 space-y-3 min-h-[112px]">
              <div className="h-3 w-20 rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-4 w-full rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-4 w-5/6 rounded-full bg-zinc-200 animate-pulse" />
            </div>
            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 sm:p-5 space-y-3 min-h-[112px]">
              <div className="h-3 w-20 rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-4 w-full rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-4 w-5/6 rounded-full bg-zinc-200 animate-pulse" />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 sm:p-5 min-h-[84px] space-y-3">
            <div className="h-3 w-28 rounded-full bg-zinc-200 animate-pulse" />
            <div className="h-4 w-[min(100%,32rem)] rounded-full bg-zinc-200 animate-pulse" />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-zinc-900 p-6 shadow-xl shadow-zinc-400/20 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-3">
            <div className="h-3 w-24 rounded-full bg-white/15 animate-pulse" />
            <div className="h-7 w-56 max-w-full rounded-full bg-white/15 animate-pulse" />
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <div className="h-12 w-32 rounded-2xl bg-white/15 animate-pulse" />
            <div className="h-12 w-28 rounded-2xl bg-white/15 animate-pulse" />
            <div className="h-12 w-32 rounded-2xl bg-white/15 animate-pulse" />
          </div>
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  const controller = useHomePageController();
  const deferredAnchorRef = useRef<HTMLDivElement | null>(null);
  const [showDeferredContent, setShowDeferredContent] = useState(false);

  useEffect(() => {
    const target = deferredAnchorRef.current;
    if (!target) return;

    if (showDeferredContent) return;

    if (typeof IntersectionObserver === "undefined") {
      setShowDeferredContent(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setShowDeferredContent(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin: "320px 0px", threshold: 0.01 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [showDeferredContent]);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <FloatingCartButton isLoggedIn={controller.isLoggedIn} />
      <HomeHeader controller={controller} />
      <HomeMobileDrawer controller={controller} />

      <FeedbackModal
        open={controller.authGuardOpen}
        type="error"
        title="Login required"
        message="You need to be logged in to access this page. Sign in or create an account to continue."
        onClose={() => {
          controller.setAuthGuardOpen(false);
          controller.setAuthReturnPath(null);
        }}
        actions={[
          {
            label: "Log in",
            onClick: () => {
              controller.setAuthGuardOpen(false);
              navigateToLoginWithReturnPath(controller.authReturnPath ?? undefined);
              controller.setAuthReturnPath(null);
            },
          },
          {
            label: "Cancel",
            onClick: () => {
              controller.setAuthGuardOpen(false);
              controller.setAuthReturnPath(null);
            },
            variant: "secondary",
          },
        ]}
      />

      <main>
        <HomeHero onBrowseMarket={() => navigateToPath(EXPLORE_PATH)} />

        {controller.error ? (
          <section className="mx-auto max-w-7xl px-4 pb-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {controller.error}
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
            <div className="space-y-6">
              <section>
                <h2 className="mb-5 text-2xl font-black tracking-[-0.04em] text-zinc-950 sm:text-4xl">
                  FEATURED CATEGORIES
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {featuredSections.map((section) => {
                    const listings = controller.filteredSectionListings[section.key] || [];
                    return (
                      <CategorySection
                        key={section.key}
                        title={section.title}
                        description={section.description}
                        categoryKey={section.key}
                        icon={section.icon}
                        listings={listings}
                        loading={controller.loading}
                      />
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section>
                <div className="grid grid-cols-1 gap-4">
                  <ListingStrip
                    title="Picked for you"
                    description="Campus-aware picks based on what is active and relevant now."
                    listings={controller.filteredRecommendedListings}
                    loading={controller.loading}
                    maxItems={8}
                    variant="featured"
                    viewMorePath={EXPLORE_PATH}
                  />
                  <ListingStrip
                    title="Deals"
                    description="Discounted listings and special offers."
                    listings={controller.filteredDealListings}
                    loading={controller.loading}
                    maxItems={8}
                    variant="featured"
                    viewMorePath={MARKET_CHIP_PATHS.Deals}
                  />

                  <div ref={deferredAnchorRef} className="h-px w-full" />

                  {showDeferredContent ? (
                    <EventsStrip
                      events={controller.eventsListings}
                      loading={controller.eventsLoading}
                      viewMorePath={MARKET_CHIP_PATHS.Events}
                    />
                  ) : (
                    <DeferredHomeSkeleton />
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-20 border-t border-zinc-100 bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-900 text-sm font-extrabold text-white">
              B
            </div>
            <span className="text-sm font-bold text-zinc-900">
              <span className="text-red-900">Buy</span><span className="text-zinc-700">Mesho</span> Malawi
            </span>
          </div>

          <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <button
              type="button"
              onClick={() => navigateToPath(ABOUT_PATH)}
              className="transition-colors hover:text-primary"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(PRIVACY_PATH)}
              className="transition-colors hover:text-primary"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(TERMS_PATH)}
              className="transition-colors hover:text-primary"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(SAFETY_PATH)}
              className="transition-colors hover:text-primary"
            >
              Safety
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(REPORT_PATH)}
              className="transition-colors hover:text-primary"
            >
              Report
            </button>
          </div>

          <div className="text-xs font-bold text-zinc-300">© 2026 Crafted for Students</div>
        </div>
      </footer>
    </div>
  );
}

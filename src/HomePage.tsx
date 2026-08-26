import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  ABOUT_PATH,
  EXPLORE_PATH,
  MARKET_CHIP_PATHS,
  SIGNUP_PATH,
  navigateToLoginWithReturnPath,
  navigateToPath,
} from "./lib/appNavigation";
import AppFooter from "./components/AppFooter";
import FeedbackModal from "./components/FeedbackModal";
import FloatingCartButton from "./components/FloatingCartButton";
import CategorySection from "./components/home/CategorySection";
import EventsStrip from "./components/home/EventsStrip";
import HomeHeader from "./components/home/HomeHeader";
import HomeHero from "./components/home/HomeHero";
import HomeMobileDrawer from "./components/home/HomeMobileDrawer";
import ListingStrip from "./components/home/ListingStrip";
import { HOME_CATEGORY_KEYS, featuredSections } from "./home/home.constants";
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
            <div className="space-y-3 p-4">
              <div className="h-4 w-3/4 rounded-full bg-zinc-100 animate-pulse" />
              <div className="h-3 w-full rounded-full bg-zinc-100 animate-pulse" />
              <div className="h-3 w-5/6 rounded-full bg-zinc-100 animate-pulse" />
              <div className="h-10 w-full rounded-2xl bg-zinc-100 animate-pulse" />
            </div>
          </div>
          <div className="w-[220px] shrink-0 rounded-3xl border border-zinc-200 bg-white shadow-sm sm:w-[260px]">
            <div className="aspect-[4/3] bg-zinc-100 animate-pulse" />
            <div className="space-y-3 p-4">
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
            <div className="min-h-[112px] space-y-3 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
              <div className="h-3 w-20 rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-4 w-full rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-4 w-5/6 rounded-full bg-zinc-200 animate-pulse" />
            </div>
            <div className="min-h-[112px] space-y-3 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
              <div className="h-3 w-20 rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-4 w-full rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-4 w-5/6 rounded-full bg-zinc-200 animate-pulse" />
            </div>
          </div>

          <div className="min-h-[84px] space-y-3 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
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
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => setIsMobileViewport(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const target = deferredAnchorRef.current;
    if (!target || showDeferredContent) return;

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

  const mobileFeaturedKeys = new Set<string>([
    HOME_CATEGORY_KEYS.phones,
    HOME_CATEGORY_KEYS.fashion,
    HOME_CATEGORY_KEYS.beauty,
  ]);

  const visibleFeaturedSections = isMobileViewport
    ? featuredSections.filter((section) => mobileFeaturedKeys.has(section.key))
    : featuredSections;

  return (
    <div className="min-h-screen bg-zinc-100 pb-20 text-zinc-900">
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

        <section className="relative left-1/2 w-screen -translate-x-1/2 border-y border-zinc-200 bg-white py-6 sm:py-8">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-5 text-2xl font-black tracking-[-0.04em] text-zinc-950 sm:text-4xl">
              FEATURED CATEGORIES
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {visibleFeaturedSections.map((section) => (
              <CategorySection
                key={section.key}
                title={section.title}
                description={section.description}
                categoryKey={section.key}
                listings={controller.filteredSectionListings[section.key] || []}
                loading={controller.loading}
              />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          <div className="space-y-6">
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

        <section className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
          <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.18)] sm:p-7 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(127,29,29,0.10),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(24,24,27,0.05),transparent_28%)] md:hidden" />
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Why BuyMesho</p>
                <span className="h-2.5 w-2.5 rounded-full bg-red-900" />
              </div>

              <div className="mt-4 grid gap-3 sm:gap-4 md:mt-6 md:gap-8">
                <div className="rounded-[1.5rem] border border-red-950/10 bg-zinc-900 p-4 text-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] sm:p-5 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:max-w-4xl">
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-red-200/80 md:text-red-900">Main point</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-100 sm:text-base md:mt-4 md:text-2xl md:font-black md:leading-tight md:tracking-[-0.03em] md:text-zinc-950">
                    BuyMesho is a platform meant to enhance the exposure of student entrepreneurship while also serving as a marketplace for sellers offering student-friendly products and services.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3 md:gap-8 md:border-t md:border-zinc-200 md:pt-7">
                  <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5 md:rounded-none md:border-0 md:border-t-0 md:bg-transparent md:p-0">
                    <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">01 — Access</p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-700 sm:text-base md:mt-4 md:text-base md:text-zinc-800">
                      Everyone can buy on BuyMesho.
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5 md:rounded-none md:border-0 md:border-l md:border-zinc-200 md:bg-transparent md:p-0 md:pl-6">
                    <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">02 — Purpose</p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-700 sm:text-base md:mt-4 md:text-base md:text-zinc-800">
                      Seller restrictions apply only because the platform&apos;s primary goal is to help student entrepreneurs develop and grow.
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5 md:rounded-none md:border-0 md:border-l md:border-zinc-200 md:bg-transparent md:p-0 md:pl-6">
                    <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">03 — Structure</p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-700 sm:text-base md:mt-4 md:text-base md:text-zinc-800">
                      List once, get discovered faster, and build trust through a structured marketplace designed for real commerce.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pt-10 pb-16">
          <div className="rounded-[2rem] bg-zinc-900 p-6 text-white shadow-xl shadow-zinc-400/20 sm:p-8 lg:p-10">
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Seller call</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Are you ready to sell?</h2>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <button
                  type="button"
                  onClick={() => navigateToPath(ABOUT_PATH)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/10"
                >
                  About BuyMesho
                  <ArrowRight className="h-4 w-4" />
                </button>

                {controller.isLoggedIn ? (
                  <button
                    type="button"
                    onClick={controller.handleStartSelling}
                    disabled={controller.isSellerProfileLoading}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {controller.isSellerProfileLoading
                      ? "Loading..."
                      : controller.isSeller
                        ? "List Item"
                        : "Sell"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => navigateToLoginWithReturnPath()}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/10"
                    >
                      Log in
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToPath(SIGNUP_PATH)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/10"
                    >
                      Sign up
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

import { ArrowRight } from "lucide-react";

import {
  navigateToLoginWithReturnPath,
  navigateToPath,
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

export default function HomePage() {
  const controller = useHomePageController();

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
                  <EventsStrip
                    events={controller.eventsListings}
                    loading={controller.eventsLoading}
                    viewMorePath={MARKET_CHIP_PATHS.Events}
                  />
                </div>
              </section>

              <section>
                <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.18)] sm:p-7">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(127,29,29,0.10),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(24,24,27,0.05),transparent_28%)]" />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                        Why BuyMesho
                      </p>
                      <span className="h-2.5 w-2.5 rounded-full bg-red-900" />
                    </div>

                    <div className="mt-4 grid gap-3 sm:gap-4">
                      <div className="rounded-[1.5rem] border border-red-950/10 bg-zinc-900 p-4 text-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] sm:p-5 md:col-span-2">
                        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-red-200/80">
                          Main point
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-100 sm:text-base">
                          BuyMesho is a platform meant to enhance the exposure of student entrepreneurship while also serving as a marketplace for sellers offering student-friendly products and services.
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5">
                          <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">
                            Everyone can buy on BuyMesho.
                          </p>
                        </div>

                        <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5">
                          <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">
                            Seller restrictions apply only because the platform&apos;s primary goal is to help student entrepreneurs develop and grow.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5">
                        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">
                          List once, get discovered faster, and build trust through a structured marketplace designed for real commerce.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pt-10 pb-16">
          <div className="rounded-[2rem] bg-zinc-900 p-6 text-white shadow-xl shadow-zinc-400/20 sm:p-8 lg:p-10">
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                  Seller call
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  Are you ready to sell?
                </h2>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                {controller.isLoggedIn ? (
                  <button
                    type="button"
                    onClick={controller.handleStartSelling}
                    disabled={controller.isSellerProfileLoading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {controller.isSellerProfileLoading ? "Loading..." : "Get Started"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigateToPath(SIGNUP_PATH)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
                  >
                    Sign Up
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigateToPath(EXPLORE_PATH)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/10"
                >
                  Explore First
                </button>
              </div>
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

import { ArrowRight, BadgeCheck, Sparkles, Users } from "lucide-react";

import { navigateToLoginWithReturnPath, navigateToPath, EXPLORE_PATH, PRIVACY_PATH, REPORT_PATH, SAFETY_PATH, SIGNUP_PATH, TERMS_PATH } from "./lib/appNavigation";
import FeedbackModal from "./components/FeedbackModal";
import FloatingCartButton from "./components/FloatingCartButton";
import CategorySection from "./components/home/CategorySection";
import HomeHeader from "./components/home/HomeHeader";
import HomeHero from "./components/home/HomeHero";
import HomeMobileDrawer from "./components/home/HomeMobileDrawer";
import ListingStrip from "./components/home/ListingStrip";
import { featuredSections } from "./home/home.constants";
import { useHomePageController } from "./hooks/useHomePageController";

const whyBuyMeshoHighlights = [
  {
    icon: Users,
    title: "Student-first discovery",
    description: "Built to give student entrepreneurs a cleaner path to visibility and trust.",
  },
  {
    icon: BadgeCheck,
    title: "Buyer access stays open",
    description: "Anyone can browse and buy. The seller side stays curated for student growth.",
  },
  {
    icon: Sparkles,
    title: "List once, look premium",
    description: "A structured marketplace presentation helps products feel organized and credible.",
  },
] as const;

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
                  />

                  <ListingStrip
                    title="Trending now"
                    description=""
                    listings={controller.filteredFeaturedListings}
                    loading={controller.loading}
                    maxItems={6}
                    variant="supporting"
                  />

                  <ListingStrip
                    title="New"
                    description=""
                    listings={controller.filteredNewestListings}
                    loading={controller.loading}
                    maxItems={6}
                    variant="supporting"
                  />
                </div>
              </section>

              <section>
                <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.18)] sm:p-8">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(127,29,29,0.10),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(24,24,27,0.06),transparent_28%)]" />
                  <div className="relative">
                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                      Why BuyMesho
                    </p>
                    <h2 className="mt-2 max-w-xl text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
                      Built to make student commerce look sharper, feel more credible, and get discovered faster.
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
                      Everyone can buy on BuyMesho. Seller restrictions apply only because the platform&apos;s primary goal is to help student entrepreneurs develop and grow.
                    </p>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      {whyBuyMeshoHighlights.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.title}
                            className="rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/80 p-4 shadow-sm"
                          >
                            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-950/10">
                              <Icon className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-black text-zinc-950">{item.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.description}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-zinc-950 px-4 py-4 text-white sm:px-5">
                      <p className="text-sm font-semibold leading-relaxed text-zinc-200">
                        List once, get discovered faster, and build trust through a structured marketplace designed for student commerce.
                      </p>
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
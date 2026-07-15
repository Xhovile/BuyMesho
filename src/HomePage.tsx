import { ArrowRight } from "lucide-react";

import { navigateToLoginWithReturnPath, navigateToPath, EXPLORE_PATH, PRIVACY_PATH, REPORT_PATH, SAFETY_PATH, SIGNUP_PATH, TERMS_PATH } from "./lib/appNavigation";
import FeedbackModal from "./components/FeedbackModal";
import FloatingCartButton from "./components/FloatingCartButton";
import CategorySection from "./components/home/CategorySection";
import HomeHeader from "./components/home/HomeHeader";
import HomeHero from "./components/home/HomeHero";
import HomeMobileDrawer from "./components/home/HomeMobileDrawer";
import ListingStrip from "./components/home/ListingStrip";
import { featuredSections, trustPills } from "./home/home.constants";
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

              <section className="border-t border-zinc-200 pt-6 sm:pt-8">
                <div className="grid gap-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                      Why BuyMesho
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
                      A campus marketplace built for real sellers.
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
                      List once, get discovered faster, and build trust through a structured marketplace designed for student commerce.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {trustPills.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-600"
                      >
                        {item}
                      </span>
                    ))}
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
                  Seller call to action
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  Ready to sell with more structure?
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                  Create a stronger storefront, reach the right buyers, and keep every listing organized in one place.
                </p>
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

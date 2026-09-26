import { ArrowRight, CalendarDays, PackageSearch, ShieldCheck, Store } from "lucide-react";

import AppFooter from "./components/AppFooter";
import BrandMark from "./components/BrandMark";
import { navigateToPath } from "./lib/appNavigation";
import {
  EVENTS_PATH,
  EXPLORE_PATH,
  SELLER_PATH,
} from "./lib/appNavigation.paths";

const categoryLinks = [
  { label: "Phones & Gadgets", href: "/category?category=phones" },
  { label: "Fashion & Clothing", href: "/category?category=fashion" },
  { label: "Books & Study Tools", href: "/category?category=books" },
  { label: "Eatery & Fast Foods", href: "/category?category=food" },
  { label: "Beauty & Personal Care", href: "/category?category=beauty" },
];

export default function BuyOnlineMalawiPage() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <button
            type="button"
            onClick={() => navigateToPath(EXPLORE_PATH)}
            aria-label="Open BuyMesho marketplace"
          >
            <BrandMark subtitle="marketplace" />
          </button>
          <a
            href={EXPLORE_PATH}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            Browse Market
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main>
        <section className="border-b border-zinc-200 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 text-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
              BuyMesho marketplace
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-[-0.06em] leading-[0.92] sm:text-6xl lg:text-7xl">
              Buy Online in Malawi.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              Discover products, services, deals, sellers, and event tickets on
              BuyMesho, a public online marketplace built for shoppers across Malawi.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={EXPLORE_PATH}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-extrabold text-zinc-950 hover:bg-zinc-100"
              >
                Explore the marketplace
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/explore/sellers"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-extrabold text-white hover:bg-white/15"
              >
                Browse sellers
                <Store className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: PackageSearch,
                title: "Products and services",
                text: "Search marketplace listings and compare what sellers are offering.",
              },
              {
                icon: ShieldCheck,
                title: "A secure marketplace",
                text: "BuyMesho provides a structured marketplace experience for buyers and sellers.",
              },
              {
                icon: CalendarDays,
                title: "Events and tickets",
                text: "Discover public events and event listings through the BuyMesho events directory.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 text-xl font-black tracking-tight">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{item.text}</p>
                </article>
              );
            })}
          </div>

          <section className="mt-12 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
              Shop by category
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              Browse popular BuyMesho categories.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
              Start with a focused category, then open the full marketplace when
              you need broader filters and search.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categoryLinks.map((category) => (
                <a
                  key={category.href}
                  href={category.href}
                  className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-extrabold text-zinc-900 hover:border-zinc-300 hover:bg-white"
                >
                  {category.label}
                  <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
                </a>
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <article className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-black tracking-tight">
                How to buy on BuyMesho
              </h2>
              <ol className="mt-5 space-y-4 text-sm leading-6 text-zinc-600">
                <li><strong className="text-zinc-900">1. Explore.</strong> Search listings or open a category that matches what you need.</li>
                <li><strong className="text-zinc-900">2. Review.</strong> Open listing details and seller information before deciding what to buy.</li>
                <li><strong className="text-zinc-900">3. Continue.</strong> Use the marketplace checkout and order flow available for the listing.</li>
              </ol>
            </article>

            <aside className="rounded-[2rem] bg-zinc-950 p-6 text-white shadow-xl sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">
                More on BuyMesho
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight">
                Keep exploring.
              </h2>
              <div className="mt-5 space-y-3">
                <a href={EVENTS_PATH} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/15">
                  Events in Malawi <ArrowRight className="h-4 w-4" />
                </a>
                <a href="/explore/sellers" className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/15">
                  Seller profiles <ArrowRight className="h-4 w-4" />
                </a>
                <a href="/sell-online-malawi" className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-black text-zinc-950 hover:bg-zinc-100">
                  Sell online in Malawi <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </aside>
          </section>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

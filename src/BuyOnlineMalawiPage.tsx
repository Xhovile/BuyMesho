import { ArrowRight, CalendarDays, PackageSearch, ShieldCheck, Store } from "lucide-react";

import AppFooter from "./components/AppFooter";
import BrandMark from "./components/BrandMark";
import { EVENTS_PATH, EXPLORE_PATH } from "./lib/appNavigation.paths";

const categoryLinks = [
  { label: "Phones & Gadgets", href: "/category?category=phones" },
  { label: "Fashion & Clothing", href: "/category?category=fashion" },
  { label: "Books & Study Tools", href: "/category?category=books" },
  { label: "Eatery & Fast Foods", href: "/category?category=food" },
  { label: "Beauty & Personal Care", href: "/category?category=beauty" },
];

const marketplaceFeatures = [
  {
    icon: PackageSearch,
    title: "Products and services",
    text: "Search marketplace listings and compare what sellers are offering.",
  },
  {
    icon: ShieldCheck,
    title: "A structured marketplace",
    text: "Discover listings, seller information, and the purchase path in one place.",
  },
  {
    icon: CalendarDays,
    title: "Events and tickets",
    text: "Find public events and event listings through the BuyMesho events directory.",
  },
];

export default function BuyOnlineMalawiPage() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href={EXPLORE_PATH} aria-label="Open BuyMesho marketplace">
            <BrandMark subtitle="Public Marketplace" />
          </a>
          <a
            href={EXPLORE_PATH}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
          >
            Browse Market
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="border-b border-zinc-200 py-10 sm:py-14 lg:py-16">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">
            BuyMesho marketplace
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
            Buy Online in Malawi.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-700 sm:text-lg">
            Discover products, services, deals, sellers, and event tickets on BuyMesho,
            a public online marketplace built for shoppers across Malawi.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={EXPLORE_PATH}
              className="inline-flex items-center gap-2 rounded-xl bg-red-900 px-5 py-3.5 text-sm font-extrabold text-white hover:bg-red-950"
            >
              Explore the marketplace
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/explore/sellers"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
            >
              Browse sellers
              <Store className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section className="border-b border-zinc-200 py-10 sm:py-12">
          <div className="grid divide-y divide-zinc-200 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {marketplaceFeatures.map(({ icon: Icon, title, text }) => (
              <article key={title} className="py-6 lg:px-7 first:pt-0 lg:first:pl-0 lg:first:pt-6 last:pb-0 lg:last:pr-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-white">
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="mt-4 text-lg font-extrabold tracking-tight">{title}</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-600">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-b border-zinc-200 py-10 sm:py-12">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">
            Shop by category
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Browse popular BuyMesho categories.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            Start with a focused category, then open the full marketplace when you need broader
            filters and search.
          </p>

          <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
            {categoryLinks.map((category) => (
              <a
                key={category.href}
                href={category.href}
                className="group flex items-center justify-between border-t border-zinc-200 py-4 text-sm font-extrabold text-zinc-900 transition-colors hover:text-red-900"
              >
                <span>{category.label}</span>
                <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
              </a>
            ))}
          </div>
        </section>

        <section className="border-b border-zinc-200 py-10 sm:py-12">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">
                How to buy
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                How to buy on BuyMesho
              </h2>
              <ol className="mt-6 max-w-2xl space-y-5 text-sm leading-6 text-zinc-700 sm:text-base">
                <li className="flex gap-4">
                  <span className="mt-0.5 shrink-0 text-sm font-black text-red-900">01</span>
                  <span><strong className="text-zinc-950">Explore.</strong> Search listings or open a category that matches what you need.</span>
                </li>
                <li className="flex gap-4">
                  <span className="mt-0.5 shrink-0 text-sm font-black text-red-900">02</span>
                  <span><strong className="text-zinc-950">Review.</strong> Open listing details and seller information before deciding what to buy.</span>
                </li>
                <li className="flex gap-4">
                  <span className="mt-0.5 shrink-0 text-sm font-black text-red-900">03</span>
                  <span><strong className="text-zinc-950">Continue.</strong> Use the marketplace checkout and order flow available for the listing.</span>
                </li>
              </ol>
            </div>

            <aside className="border-l border-zinc-200 pl-6 sm:pl-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">
                Keep exploring
              </p>
              <div className="mt-4 space-y-3">
                <a href={EVENTS_PATH} className="group flex items-center justify-between py-2 text-sm font-bold text-zinc-800 hover:text-red-900">
                  Events in Malawi
                  <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a href="/explore/sellers" className="group flex items-center justify-between border-t border-zinc-200 py-3 text-sm font-bold text-zinc-800 hover:text-red-900">
                  Seller profiles
                  <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a href="/sell-online-malawi" className="group flex items-center justify-between border-t border-zinc-200 py-3 text-sm font-bold text-zinc-800 hover:text-red-900">
                  Sell online in Malawi
                  <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            </aside>
          </div>
        </section>

        <section className="py-10 sm:py-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">
                BuyMesho marketplace
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Start with the marketplace.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                Browse current listings and continue from there.
              </p>
            </div>
            <a
              href={EXPLORE_PATH}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              Open Market
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

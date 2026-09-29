import { ArrowRight } from "lucide-react";

import AppFooter from "./components/AppFooter";
import BrandMark from "./components/BrandMark";
import { EXPLORE_PATH } from "./lib/appNavigation.paths";

const categoryLinks = [
  { label: "Phones & Gadgets", href: "/category?category=phones" },
  { label: "Fashion & Clothing", href: "/category?category=fashion" },
  { label: "Books & Study Tools", href: "/category?category=books" },
  { label: "Eatery & Fast Foods", href: "/category?category=food" },
  { label: "Beauty & Personal Care", href: "/category?category=beauty" },
];

const buyingSteps = [
  { number: "01", title: "Discover", text: "Search listings or open a category that matches what you need." },
  { number: "02", title: "Review", text: "Check the listing details and seller information before you buy." },
  { number: "03", title: "Buy", text: "Continue through the marketplace checkout and order flow." },
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
        <section className="relative overflow-hidden border-b border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-red-50/40 py-10 sm:py-14 lg:py-16">
          <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-red-900/5 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">BuyMesho marketplace</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              Buy Online in Malawi.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-700 sm:text-lg">
              Discover products, services, deals, sellers, and event tickets on BuyMesho,
              a public online marketplace built for shoppers across Malawi.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a
                href={EXPLORE_PATH}
                className="inline-flex items-center gap-2 rounded-xl bg-red-900 px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_30px_-18px_rgba(127,29,29,0.7)] hover:bg-red-950"
              >
                Explore the marketplace
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/explore/sellers"
                className="group inline-flex items-center gap-1.5 py-2 text-sm font-extrabold text-zinc-800 hover:text-blue-700"
              >
                Browse sellers
                <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" />
              </a>
            </div>
          </div>
        </section>

        <section className="py-9 sm:py-11">
          <div className="rounded-3xl border border-zinc-200 bg-white shadow-[0_18px_50px_-35px_rgba(0,0,0,0.35)]">
            <div className="border-b border-zinc-200 px-5 py-5 sm:px-7">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">How buying works</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Find it. Check it. Buy it.</h2>
            </div>

            <div className="grid lg:grid-cols-3">
              {buyingSteps.map((step) => (
                <article
                  key={step.number}
                  className="border-b border-zinc-200 px-5 py-6 last:border-b-0 sm:px-7 sm:py-7 lg:border-b-0 lg:border-r lg:last:border-r-0"
                >
                  <p className="text-sm font-black tracking-tight text-blue-600">{step.number}</p>
                  <h3 className="mt-3 text-lg font-extrabold tracking-tight">{step.title}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-600">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-200 py-10 sm:py-12">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">Shop by category</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Browse popular BuyMesho categories.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            Start with a focused category, then open the full marketplace when you need broader filters and search.
          </p>

          <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
            {categoryLinks.map((category) => (
              <a
                key={category.href}
                href={category.href}
                className="group flex items-center justify-between border-t border-zinc-200 py-4 text-sm font-extrabold text-zinc-900 transition-colors hover:text-blue-700"
              >
                <span>{category.label}</span>
                <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" />
              </a>
            ))}
          </div>
        </section>

        <section className="border-t border-zinc-200 py-10 sm:py-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">BuyMesho marketplace</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Start with the marketplace.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                Browse current listings, compare what is available, and continue when you find what you need.
              </p>
            </div>
            <a
              href={EXPLORE_PATH}
              className="group inline-flex shrink-0 items-center gap-2 py-2 text-sm font-extrabold text-zinc-900 hover:text-blue-700"
            >
              Open Market
              <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" />
            </a>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

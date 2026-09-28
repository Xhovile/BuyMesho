import { ArrowRight, ClipboardList, Search, Store } from "lucide-react";

import AppFooter from "./components/AppFooter";
import BrandMark from "./components/BrandMark";
import { EXPLORE_PATH } from "./lib/appNavigation.paths";

const sellingSteps = [
  {
    icon: ClipboardList,
    title: "Create your account",
    text: "Start with a BuyMesho account so your seller activity has a dedicated profile.",
  },
  {
    icon: Store,
    title: "Become a seller",
    text: "Use the seller onboarding flow to set up the information needed to sell on the marketplace.",
  },
  {
    icon: Search,
    title: "List and reach buyers",
    text: "Publish marketplace listings that buyers can discover, open, and act on.",
  },
];

export default function SellOnlineMalawiPage() {
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
            BuyMesho for sellers
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
            Sell Online in Malawi.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-700 sm:text-lg">
            Use BuyMesho to publish products and services, build a public seller presence,
            and reach buyers through a Malawi-focused online marketplace.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-red-900 px-5 py-3.5 text-sm font-extrabold text-white hover:bg-red-950"
            >
              Create an account
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/become-seller"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
            >
              Become a seller
              <Store className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section className="border-b border-zinc-200 py-10 sm:py-12">
          <div className="grid divide-y divide-zinc-200 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {sellingSteps.map(({ icon: Icon, title, text }) => (
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
            Why use a marketplace
          </p>
          <h2 className="mt-2 max-w-4xl text-2xl font-black tracking-tight sm:text-3xl">
            Put your listing where buyers are already looking.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">
            BuyMesho brings listing discovery, seller profiles, search, categories, events,
            and the wider marketplace into one public web experience.
          </p>

          <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
            <a
              href="/explore/sellers"
              className="group flex items-center justify-between border-t border-zinc-200 py-4 text-sm font-extrabold text-zinc-900 hover:text-red-900"
            >
              <span>Browse seller profiles</span>
              <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href={EXPLORE_PATH}
              className="group flex items-center justify-between border-t border-zinc-200 py-4 text-sm font-extrabold text-zinc-900 hover:text-red-900"
            >
              <span>See marketplace listings</span>
              <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </section>

        <section className="py-10 sm:py-12">
          <div className="border-t border-zinc-200 pt-8">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">
                Start selling
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Build your presence on BuyMesho.
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
                Create an account, complete seller onboarding, and use the marketplace
                listing flow to put your products or services in front of buyers.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
              >
                Create account
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/buy-online-malawi"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
              >
                See the buyer guide
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <a href={EXPLORE_PATH} aria-label="Open BuyMesho marketplace">
            <BrandMark subtitle="seller marketplace" />
          </a>
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
        <section className="border-b border-zinc-200 bg-gradient-to-br from-red-950 via-zinc-950 to-zinc-900 text-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
              BuyMesho for sellers
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-[-0.06em] leading-[0.92] sm:text-6xl lg:text-7xl">
              Sell Online in Malawi.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              Use BuyMesho to publish products and services, build a public seller
              presence, and reach buyers through a Malawi-focused online marketplace.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-extrabold text-zinc-950 hover:bg-zinc-100"
              >
                Create an account
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/become-seller"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-extrabold text-white hover:bg-white/15"
              >
                Become a seller
                <Store className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="grid gap-4 md:grid-cols-3">
            {sellingSteps.map((step) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.title}
                  className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 text-xl font-black tracking-tight">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{step.text}</p>
                </article>
              );
            })}
          </div>

          <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
              Why use a marketplace
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              Put your listing where buyers are already looking.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
              BuyMesho brings listing discovery, seller profiles, search, categories,
              events, and the wider marketplace into one public web experience.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href="/explore/sellers"
                className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-extrabold text-zinc-900 hover:bg-white"
              >
                Browse seller profiles
              </a>
              <a
                href={EXPLORE_PATH}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-extrabold text-zinc-900 hover:bg-white"
              >
                See marketplace listings
              </a>
            </div>
          </section>

          <section className="mt-8 rounded-[2rem] bg-zinc-950 p-7 text-white shadow-xl sm:p-9">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">
                Start selling
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Build your presence on BuyMesho.
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/70 sm:text-base">
                Create an account, complete seller onboarding, and use the marketplace
                listing flow to put your products or services in front of buyers.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-zinc-950 hover:bg-zinc-100"
                >
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="/buy-online-malawi"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15"
                >
                  See the buyer guide
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </section>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

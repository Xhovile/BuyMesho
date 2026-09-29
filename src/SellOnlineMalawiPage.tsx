import { ArrowRight } from "lucide-react";

import AppFooter from "./components/AppFooter";
import BrandMark from "./components/BrandMark";
import { EXPLORE_PATH } from "./lib/appNavigation.paths";

const sellingSteps = [
  { number: "01", title: "Create", text: "Set up your account and establish your public seller presence." },
  { number: "02", title: "List", text: "Publish products or services with clear details, pricing, and availability." },
  { number: "03", title: "Reach", text: "Make your listings discoverable to buyers across the marketplace." },
];

const sellerBenefits = [
  { title: "A public seller profile", text: "Give buyers a dedicated place to see your business information and marketplace activity." },
  { title: "Marketplace discovery", text: "Put your products and services alongside other public BuyMesho listings." },
  { title: "A structured selling flow", text: "Use the listing and marketplace tools to publish, manage, and grow your presence." },
];

export default function SellOnlineMalawiPage() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
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
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">BuyMesho for sellers</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              Sell Online in Malawi.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-700 sm:text-lg">
              Use BuyMesho to publish products and services, build a public seller presence,
              and reach buyers through a Malawi-focused online marketplace.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-red-900 px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_30px_-18px_rgba(127,29,29,0.7)] hover:bg-red-950"
              >
                Create an account
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/become-seller"
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_30px_-18px_rgba(24,24,27,0.7)] hover:bg-zinc-800"
              >
                Become Seller
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="py-9 sm:py-11">
          <div className="rounded-3xl border border-zinc-200 bg-white shadow-[0_18px_50px_-35px_rgba(0,0,0,0.35)]">
            <div className="border-b border-zinc-200 px-5 py-5 sm:px-7">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">Your selling path</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Create. List. Reach buyers.</h2>
            </div>

            <div className="grid lg:grid-cols-3">
              {sellingSteps.map((step) => (
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
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">Why sell on BuyMesho</p>
          <h2 className="mt-2 max-w-4xl text-2xl font-black tracking-tight sm:text-3xl">
            Put your business where buyers can discover it.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">
            BuyMesho gives sellers a public profile, marketplace listings, and a structured place to present what they offer.
          </p>

          <div className="mt-6 grid gap-x-8 sm:grid-cols-3">
            {sellerBenefits.map((benefit) => (
              <article key={benefit.title} className="border-t border-zinc-200 py-5">
                <h3 className="text-base font-extrabold tracking-tight">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{benefit.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-zinc-200 py-10 sm:py-12">
          <div className="flex flex-col gap-3">
            <a
              href={EXPLORE_PATH}
              className="group inline-flex items-center gap-1.5 py-2 text-sm font-extrabold text-zinc-900 hover:text-blue-700"
            >
              Browse marketplace
              <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" />
            </a>
            <a
              href="/buy-online-malawi"
              className="group inline-flex items-center gap-1.5 py-2 text-sm font-bold text-zinc-700 hover:text-blue-700"
            >
              Looking to buy instead?
              <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" />
            </a>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

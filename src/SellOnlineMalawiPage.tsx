import { ArrowRight } from "lucide-react";

import AppFooter from "./components/AppFooter";
import BrandMark from "./components/BrandMark";
import { EXPLORE_PATH } from "./lib/appNavigation.paths";

const sellingSteps = [
  { number: "01", eyebrow: "Account & setup", title: "Create your seller account.", text: "Set up your BuyMesho account and complete the information needed to establish your public seller presence." },
  { number: "02", eyebrow: "Listing products", title: "List what you sell.", text: "Publish products or services with clear titles, descriptions, prices, images, availability, and other relevant details." },
  { number: "03", eyebrow: "Marketplace discovery", title: "Reach buyers through the marketplace.", text: "Your published listings become part of BuyMesho's public marketplace, where buyers can search, inspect listings, and view your seller profile." },
];

const sellerBenefits = [
  { title: "A public seller profile", text: "Give buyers a dedicated place to see your business information and marketplace activity." },
  { title: "Marketplace discovery", text: "Put your products and services alongside other public BuyMesho listings." },
  { title: "A structured selling flow", text: "Use the listing and marketplace tools to publish, manage, and grow your presence." },
];

const sellerGuideLinks = [
  { href: EXPLORE_PATH, label: "Browse marketplace" },
  { href: "/explore/sellers", label: "View Sellers on BuyMesho" },
  { href: "/buy-online-malawi", label: "Looking to buy instead?" },
];

export default function SellOnlineMalawiPage() {
  return (
    <div className="guide-page min-h-screen bg-zinc-100 text-zinc-900">
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
            <h1 className="guide-display mt-3 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-zinc-950 sm:text-6xl lg:text-7xl">
              Sell Online in Malawi.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-[var(--guide-muted)] sm:text-lg sm:leading-8">
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
                className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3.5 text-[15px] font-bold text-white transition hover:bg-[#181313] sm:px-6 sm:text-base"
              >
                Become Seller
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-10">
          <div className="border-y border-zinc-200">
            <div className="border-b border-[var(--guide-line)] px-0 py-5 sm:py-7">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--guide-muted)]">Your selling path</p>
              <h2 className="guide-display mt-2 text-2xl font-semibold text-[var(--guide-accent)] sm:text-3xl">Create. List. Reach buyers.</h2>
            </div>
            <div>
              {sellingSteps.map((step) => (
                <article key={step.number} className="grid gap-4 border-b border-[var(--guide-line)] py-8 last:border-b-0 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[132px_minmax(0,1fr)] lg:gap-10 lg:py-11">
                  <p className="guide-chapter-number text-6xl leading-none sm:text-7xl lg:text-8xl">{step.number}</p>
                  <div className="max-w-5xl">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">{step.eyebrow}</p>
                    <h2 className="guide-display mt-2 max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-[var(--guide-accent)] sm:text-5xl lg:text-6xl">{step.title}</h2>
                    <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-700 sm:mt-7 sm:text-[17px] sm:leading-8">{step.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--guide-line)] py-10 sm:py-12">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--guide-muted)]">Why sell on BuyMesho</p>
          <h2 className="guide-display mt-2 max-w-4xl text-3xl font-semibold leading-[1.08] tracking-[-0.025em] text-[var(--guide-accent)] sm:text-4xl lg:text-5xl">
            Put your business where buyers can discover it.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--guide-muted)] sm:text-[17px] sm:leading-8">
            BuyMesho gives sellers a public profile, marketplace listings, and a structured place to present what they offer.
          </p>

          <div className="mt-6 grid gap-x-8 sm:grid-cols-3">
            {sellerBenefits.map((benefit) => (
              <article key={benefit.title} className="border-t border-[var(--guide-line)] py-5">
                <h3 className="text-base font-bold tracking-tight">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{benefit.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-zinc-200 py-10 sm:py-12">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--guide-muted)]">Continue on BuyMesho</p>
          <div className="mt-4 grid gap-x-8 sm:grid-cols-3">
            {sellerGuideLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3 border-t border-[var(--guide-line)] py-4 text-base font-bold text-zinc-900 transition-colors hover:text-blue-700 sm:text-lg"
              >
                {link.label}
                <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" />
              </a>
            ))}
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

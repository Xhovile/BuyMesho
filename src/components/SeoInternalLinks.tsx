import { ArrowRight, CalendarDays, ShoppingBag, Store } from "lucide-react";

type PublicMarketplaceLink = {
  href: string;
  label: string;
  description: string;
  icon: typeof ShoppingBag;
};

type SeoInternalLinksContext = "category" | "seller" | "events" | "marketplace";

const CONTEXTUAL_LINKS: Record<SeoInternalLinksContext, PublicMarketplaceLink[]> = {
  category: [
    { href: "/buy-online-malawi", label: "Buy products (guide)", description: "Learn how to discover products and complete a purchase on BuyMesho.", icon: ShoppingBag },
    { href: "/sell-online-malawi", label: "Sell products (guide)", description: "Learn how to publish listings and sell on BuyMesho.", icon: Store },
  ],
  seller: [
    { href: "/buy-online-malawi", label: "Buyer guide", description: "Learn how buyers discover listings and complete a purchase.", icon: ShoppingBag },
    { href: "/sell-online-malawi", label: "Seller guide", description: "Learn how sellers publish listings and manage sales.", icon: Store },
  ],
  events: [
    { href: "/buy-event-tickets-malawi", label: "Buy event tickets", description: "Learn how to find, buy, receive, and use event tickets.", icon: CalendarDays },
    { href: "/create-event-malawi", label: "Create an event", description: "Learn how to create, publish, manage, and receive payouts for events.", icon: CalendarDays },
  ],
  marketplace: [
    { href: "/buy-online-malawi", label: "Buyer guide", description: "Learn how to discover and buy through BuyMesho.", icon: ShoppingBag },
    { href: "/sell-online-malawi", label: "Seller guide", description: "Learn how to list products and sell through BuyMesho.", icon: Store },
  ],
};

const CONTEXTUAL_TITLES: Record<SeoInternalLinksContext, string> = {
  category: "How to",
  seller: "Learn how to",
  events: "How to",
  marketplace: "Learn how to",
};

export default function SeoInternalLinks({
  title,
  context = "marketplace",
}: {
  title?: string;
  context?: SeoInternalLinksContext;
}) {
  const links = CONTEXTUAL_LINKS[context];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-9 sm:px-6 sm:py-10 lg:px-8" aria-labelledby="buymesho-internal-links">
      <div className="w-full border border-zinc-200 bg-white/45 p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#74152f]">
              BuyMesho marketplace
            </p>
            <h2 id="buymesho-internal-links" className="mt-2 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
              {title || CONTEXTUAL_TITLES[context]}
            </h2>
          </div>

          <nav
            className="grid w-full gap-x-8 gap-y-2 sm:grid-cols-2 lg:w-auto lg:min-w-[520px] lg:grid-cols-3"
            aria-label="Contextual BuyMesho links"
          >
            {links.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="group inline-flex min-w-0 items-center gap-1.5 border-b border-zinc-200 py-2 text-sm font-bold text-zinc-700 transition-colors hover:border-blue-600/30 hover:text-blue-700"
              >
                <span className="truncate">{label}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" />
              </a>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}

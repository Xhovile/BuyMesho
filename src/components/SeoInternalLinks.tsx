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
    { href: "/explore", label: "Explore the marketplace", description: "See all public listings, filters, and discovery sections.", icon: ShoppingBag },
    { href: "/buy-online-malawi", label: "Buy online in Malawi", description: "Learn how to discover products, services, and tickets.", icon: ShoppingBag },
    { href: "/sell-online-malawi", label: "Sell online in Malawi", description: "See how sellers publish products and reach buyers.", icon: Store },
    { href: "/explore/sellers", label: "Browse sellers", description: "Compare public seller profiles and marketplace listings.", icon: Store },
    { href: "/explore/events", label: "Events in Malawi", description: "Find public events and ticket listings on BuyMesho.", icon: CalendarDays },
    { href: "/buy-event-tickets-malawi", label: "Buy event tickets", description: "Learn how to buy and validate event tickets on BuyMesho.", icon: CalendarDays },
    { href: "/create-event-malawi", label: "Create events", description: "Learn how event creators set up and manage events on BuyMesho.", icon: CalendarDays },
  ],
  seller: [
    { href: "/explore", label: "Explore marketplace listings", description: "Browse products and services from across BuyMesho.", icon: ShoppingBag },
    { href: "/buy-online-malawi", label: "Buy online in Malawi", description: "See how buyers discover listings and continue to checkout.", icon: ShoppingBag },
    { href: "/sell-online-malawi", label: "Sell online in Malawi", description: "Learn how to build a seller presence on BuyMesho.", icon: Store },
    { href: "/explore/events", label: "Events in Malawi", description: "Discover public events and ticket listings.", icon: CalendarDays },
    { href: "/buy-event-tickets-malawi", label: "Buy event tickets", description: "Learn how to buy and validate event tickets on BuyMesho.", icon: CalendarDays },
    { href: "/create-event-malawi", label: "Create events", description: "Learn how event creators set up and manage events on BuyMesho.", icon: CalendarDays },
  ],
  events: [
    { href: "/explore", label: "Explore marketplace listings", description: "Return to products, services, categories, and deals.", icon: ShoppingBag },
    { href: "/buy-online-malawi", label: "Buy online in Malawi", description: "Learn how BuyMesho supports online buying and tickets.", icon: ShoppingBag },
    { href: "/sell-online-malawi", label: "Sell online in Malawi", description: "Learn how sellers publish listings for buyers.", icon: Store },
    { href: "/explore/sellers", label: "Browse sellers", description: "Discover public sellers and businesses on BuyMesho.", icon: Store },
    { href: "/buy-event-tickets-malawi", label: "Buy event tickets", description: "Learn how to buy and validate event tickets on BuyMesho.", icon: CalendarDays },
    { href: "/create-event-malawi", label: "Create events", description: "Learn how event creators set up and manage events on BuyMesho.", icon: CalendarDays },
  ],
  marketplace: [
    { href: "/explore", label: "Explore the marketplace", description: "Browse public BuyMesho listings and discovery sections.", icon: ShoppingBag },
    { href: "/buy-online-malawi", label: "Buy online in Malawi", description: "Learn how to discover and buy through BuyMesho.", icon: ShoppingBag },
    { href: "/sell-online-malawi", label: "Sell online in Malawi", description: "Learn how to list products and services on BuyMesho.", icon: Store },
    { href: "/explore/sellers", label: "Browse sellers", description: "Discover public seller profiles and their marketplace listings.", icon: Store },
    { href: "/explore/events", label: "Events in Malawi", description: "Browse public BuyMesho event listings and tickets.", icon: CalendarDays },
  ],
};

const CONTEXTUAL_TITLES: Record<SeoInternalLinksContext, string> = {
  category: "Explore more of the Malawi marketplace",
  seller: "Discover more sellers and listings",
  events: "Explore more on BuyMesho",
  marketplace: "Keep exploring BuyMesho",
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
    <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-10 lg:px-8" aria-labelledby="buymesho-internal-links">
      <div className="border-t border-zinc-200 pt-6 sm:pt-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">
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

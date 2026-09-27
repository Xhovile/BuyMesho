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
    {
      href: "/explore",
      label: "Explore the marketplace",
      description: "See all public listings, filters, and discovery sections.",
      icon: ShoppingBag,
    },
    {
      href: "/buy-online-malawi",
      label: "Buy online in Malawi",
      description: "Learn how to discover products, services, and tickets.",
      icon: ShoppingBag,
    },
    {
      href: "/sell-online-malawi",
      label: "Sell online in Malawi",
      description: "See how sellers publish products and reach buyers.",
      icon: Store,
    },
    {
      href: "/explore/sellers",
      label: "Browse sellers",
      description: "Compare public seller profiles and marketplace listings.",
      icon: Store,
    },
    {
      href: "/explore/events",
      label: "Events in Malawi",
      description: "Find public events and ticket listings on BuyMesho.",
      icon: CalendarDays,
    },
  ],
  seller: [
    {
      href: "/explore",
      label: "Explore marketplace listings",
      description: "Browse products and services from across BuyMesho.",
      icon: ShoppingBag,
    },
    {
      href: "/buy-online-malawi",
      label: "Buy online in Malawi",
      description: "See how buyers discover listings and continue to checkout.",
      icon: ShoppingBag,
    },
    {
      href: "/sell-online-malawi",
      label: "Sell online in Malawi",
      description: "Learn how to build a seller presence on BuyMesho.",
      icon: Store,
    },
    {
      href: "/explore/events",
      label: "Events in Malawi",
      description: "Discover public events and ticket listings.",
      icon: CalendarDays,
    },
  ],
  events: [
    {
      href: "/explore",
      label: "Explore marketplace listings",
      description: "Return to products, services, categories, and deals.",
      icon: ShoppingBag,
    },
    {
      href: "/buy-online-malawi",
      label: "Buy online in Malawi",
      description: "Learn how BuyMesho supports online buying and tickets.",
      icon: ShoppingBag,
    },
    {
      href: "/sell-online-malawi",
      label: "Sell online in Malawi",
      description: "Learn how sellers publish listings for buyers.",
      icon: Store,
    },
    {
      href: "/explore/sellers",
      label: "Browse sellers",
      description: "Discover public sellers and businesses on BuyMesho.",
      icon: Store,
    },
  ],
  marketplace: [
    {
      href: "/explore",
      label: "Explore the marketplace",
      description: "Browse public BuyMesho listings and discovery sections.",
      icon: ShoppingBag,
    },
    {
      href: "/buy-online-malawi",
      label: "Buy online in Malawi",
      description: "Learn how to discover and buy through BuyMesho.",
      icon: ShoppingBag,
    },
    {
      href: "/sell-online-malawi",
      label: "Sell online in Malawi",
      description: "Learn how to list products and services on BuyMesho.",
      icon: Store,
    },
    {
      href: "/explore/sellers",
      label: "Browse sellers",
      description: "Discover public seller profiles and their marketplace listings.",
      icon: Store,
    },
    {
      href: "/explore/events",
      label: "Events in Malawi",
      description: "Browse public BuyMesho event listings and tickets.",
      icon: CalendarDays,
    },
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
    <section className="mx-auto mt-10 max-w-7xl px-4 pb-2" aria-labelledby="buymesho-internal-links">
      <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">BuyMesho marketplace</p>
          <h2 id="buymesho-internal-links" className="mt-2 text-2xl font-black tracking-tight text-zinc-950">
            {title || CONTEXTUAL_TITLES[context]}
          </h2>
        </div>

        <nav
          className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
          aria-label="Contextual BuyMesho links"
        >
          {links.map(({ href, label, description, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="group rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:border-zinc-300 hover:bg-white"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-white">
                  <Icon className="h-4 w-4" />
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="mt-4 block text-sm font-black text-zinc-950">{label}</span>
              <span className="mt-1 block text-xs leading-5 text-zinc-500">{description}</span>
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}

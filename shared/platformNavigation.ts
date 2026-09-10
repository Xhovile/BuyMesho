export type PlatformRouteAccess = "public" | "authenticated" | "seller" | "admin";

export type PlatformNavigationEntry = {
  id: string;
  name: string;
  description: string;
  path: string;
  access: PlatformRouteAccess;
  keywords: string[];
};

/**
 * Canonical semantic navigation targets for BuyMesho Assistant.
 * The Assistant may reference an id; the application owns the real URL.
 */
export const BUYMESHO_PLATFORM_NAVIGATION: readonly PlatformNavigationEntry[] = [
  { id: "home", name: "Home", description: "BuyMesho marketplace home.", path: "/", access: "public", keywords: ["home", "homepage", "market"] },
  { id: "explore", name: "Explore", description: "Browse marketplace listings and discovery sections.", path: "/explore", access: "public", keywords: ["explore", "browse", "listings", "marketplace"] },
  { id: "saved", name: "Saved", description: "View listings saved to your BuyMesho account.", path: "/saved", access: "authenticated", keywords: ["saved", "favorites", "favourites", "bookmarks"] },
  { id: "messages", name: "Messages", description: "Open your BuyMesho messages and conversations.", path: "/messages", access: "authenticated", keywords: ["messages", "inbox", "chat", "conversations", "message seller"] },
  { id: "cart", name: "Cart", description: "Review items in your shopping cart.", path: "/cart", access: "authenticated", keywords: ["cart", "shopping cart", "basket"] },
  { id: "tickets", name: "My Tickets", description: "View tickets purchased through BuyMesho.", path: "/tickets", access: "authenticated", keywords: ["tickets", "my tickets", "event tickets"] },
  { id: "payments", name: "Payments", description: "Open the BuyMesho payments hub.", path: "/payments", access: "authenticated", keywords: ["payments", "payment", "transactions", "pay"] },
  { id: "track-order", name: "Track Order", description: "Track an order using its reference.", path: "/payments/track-order", access: "authenticated", keywords: ["track order", "order tracking", "track my order", "where is my order"] },
  { id: "disputes", name: "Disputes", description: "View and manage eligible buyer disputes.", path: "/payments/disputes", access: "authenticated", keywords: ["dispute", "disputes", "report order problem", "order dispute"] },
  { id: "profile", name: "Profile", description: "View and manage your BuyMesho profile.", path: "/profile", access: "authenticated", keywords: ["profile", "my profile", "account profile"] },
  { id: "settings", name: "Settings", description: "Manage BuyMesho account settings.", path: "/settings", access: "authenticated", keywords: ["settings", "preferences", "account settings"] },
  { id: "become-seller", name: "Become a Seller", description: "Start the BuyMesho seller onboarding flow.", path: "/become-seller", access: "authenticated", keywords: ["become a seller", "become seller", "start selling", "sell on buymesho"] },
  { id: "seller-dashboard", name: "Seller Dashboard", description: "Manage seller activity and seller workspace functions.", path: "/seller-dashboard", access: "seller", keywords: ["seller dashboard", "seller workspace", "seller home"] },
  { id: "seller-payouts", name: "Seller Payouts", description: "Open the seller payouts area for payout and seller finance information.", path: "/seller/payouts", access: "seller", keywords: ["seller payouts", "payouts", "my payouts", "payout history", "seller earnings", "withdraw money", "seller finance"] },
  { id: "seller-orders", name: "Seller Orders", description: "Open the seller orders view.", path: "/seller/payouts?view=orders", access: "seller", keywords: ["seller orders", "my sales", "sales orders", "orders as seller"] },
  { id: "my-listings", name: "My Listings", description: "Manage listings you have posted for sale.", path: "/my-listings", access: "seller", keywords: ["my listings", "manage listings", "my products", "listings I posted"] },
  { id: "create-listing", name: "Create Listing", description: "Create a new marketplace listing.", path: "/create", access: "authenticated", keywords: ["create listing", "new listing", "post item", "list an item", "sell item"] },
  { id: "edit-profile", name: "Edit Profile", description: "Edit your BuyMesho profile information.", path: "/edit-profile", access: "authenticated", keywords: ["edit profile", "change profile"] },
  { id: "events", name: "Events", description: "Browse BuyMesho events.", path: "/explore/events", access: "public", keywords: ["events", "event directory", "browse events"] },
  { id: "event-create", name: "Create Event", description: "Create an event through the event creation flow.", path: "/explore/events/create", access: "authenticated", keywords: ["create event", "new event", "make an event"] },
  { id: "event-manage", name: "Manage Events", description: "Open the event creator management workspace.", path: "/explore/events/manage", access: "authenticated", keywords: ["manage events", "my events", "event dashboard"] },
  { id: "admin", name: "Admin", description: "Open the BuyMesho administration area.", path: "/admin", access: "admin", keywords: ["admin", "administration", "admin dashboard"] },
  { id: "admin-payments", name: "Admin Payments", description: "Open the administrative payment console.", path: "/admin/payments", access: "admin", keywords: ["admin payments", "payment console", "admin payment"] },
  { id: "admin-payouts", name: "Admin Payouts", description: "Open the administrative payouts manager.", path: "/admin/payouts", access: "admin", keywords: ["admin payouts", "payout manager", "manage payouts"] },
  { id: "admin-disputes", name: "Admin Disputes", description: "Open administrative dispute management.", path: "/admin/disputes", access: "admin", keywords: ["admin disputes", "dispute management"] },
];

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export function getPlatformNavigationEntry(id: string): PlatformNavigationEntry | undefined {
  return BUYMESHO_PLATFORM_NAVIGATION.find((entry) => entry.id === id);
}

export function resolvePlatformNavigation(query: string): PlatformNavigationEntry | undefined {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return undefined;

  const candidates = BUYMESHO_PLATFORM_NAVIGATION
    .map((entry) => {
      let score = 0;
      const normalizedName = normalize(entry.name);
      if (normalizedQuery === normalizedName) score += 100;
      if (normalizedQuery.includes(normalizedName)) score += 50;
      for (const keyword of entry.keywords) {
        const normalizedKeyword = normalize(keyword);
        if (normalizedQuery === normalizedKeyword) score += 90;
        else if (normalizedQuery.includes(normalizedKeyword)) score += 40;
      }
      return { entry, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.entry;
}

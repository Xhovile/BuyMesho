import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import AppFooter from "./components/AppFooter";
import FloatingCartButton from "./components/FloatingCartButton";
import Header from "./components/Header";
import ScrollToTopFab from "./components/ScrollToTopFab";
import EventDetailsPage from "./EventDetailsPage";
import EventsCreatePage from "./EventsCreatePage";
import EventsDirectoryPage from "./EventsDirectoryPage";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { useAuthUser } from "./hooks/useAuthUser";
import { EVENTS_CREATE_PATH, EVENTS_PATH, EXPLORE_PATH, getMarketChipFromLocation, navigateToCreateListing, navigateToMarketChip, navigateToPath } from "./lib/appNavigation";

function getComingSoonTitle(pathname: string) {
  if (pathname === "/explore/accommodation") return "Accommodation";
  if (pathname === "/explore/innovation") return "Innovation";
  if (pathname === "/explore/lay-by") return "Lay-by";
  if (pathname === "/explore/lending") return "Lending";
  return "Coming soon";
}

function ComingSoonBody({ title }: { title: string }) {
  return (
    <main className="flex-1">
      <section className="mx-auto flex min-h-[60vh] max-w-7xl items-center px-4 py-10 sm:py-14">
        <div className="w-full rounded-[2rem] border border-zinc-200 bg-white p-6 text-center shadow-sm shadow-zinc-200/50 sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Sparkles className="h-8 w-8" />
          </div>

          <p className="mt-6 text-[11px] font-black uppercase tracking-[0.28em] text-emerald-700">BuyMesho</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">{title}</h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg">
            {title} is coming soon. We’re working on bringing this experience to BuyMesho.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function MarketComingSoonPage() {
  const pathname = typeof window === "undefined" ? EXPLORE_PATH : window.location.pathname;
  const chip = typeof window === "undefined" ? "All" : getMarketChipFromLocation(window.location);
  const { user: firebaseUser } = useAuthUser();
  const { profile: userProfile } = useAccountProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const update = () => setShowBackToTop(window.scrollY > 300);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  if (pathname === EVENTS_PATH) {
    const params = new URLSearchParams(window.location.search);
    if (params.get("event")) {
      return <EventDetailsPage />;
    }
    return <EventsDirectoryPage />;
  }

  if (pathname === EVENTS_CREATE_PATH) {
    return <EventsCreatePage />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900 pb-20">
      <FloatingCartButton isLoggedIn={!!firebaseUser} />
      <Header
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        onAddListing={navigateToCreateListing}
        onProfileClick={() => navigateToPath("/profile")}
        userProfile={userProfile}
        firebaseUser={firebaseUser}
        activeChip={chip}
        onChipChange={navigateToMarketChip}
      />
      <ComingSoonBody title={getComingSoonTitle(pathname)} />
      <AppFooter />
      <ScrollToTopFab show={showBackToTop} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
    </div>
  );
}

import React from "react";
import { ArrowRight } from "lucide-react";
import AppFooter from "./AppFooter";
import Header from "./Header";
import HeroSection from "../sections/HeroSection";
import MarketSection from "../sections/MarketSection";
import AppLegacyOverlays from "./AppLegacyOverlays";
import { navigateToMarketChip, navigateToProfile } from "../lib/appNavigation";
import type { AppLegacyState } from "../hooks/useAppLegacyState";

export default function AppLegacyPage(props: AppLegacyState) {
  return (
    <div className="min-h-screen pb-20 bg-zinc-100">
      <Header
        searchValue={props.search}
        onSearch={props.setSearch}
        onAddListing={props.handleListItem}
        onProfileClick={navigateToProfile}
        userProfile={props.userProfile}
        firebaseUser={props.firebaseUser}
        activeChip={props.activeChip}
        subtitle={props.activeChip.toLowerCase()}
        onChipChange={navigateToMarketChip}
      />

      <main className="max-w-7xl mx-auto px-4">
        <HeroSection onListItem={props.handleListItem} />
        <MarketSection
          loading={props.loading}
          listings={props.listings}
          hiddenSellerUids={props.hiddenSellerUids}
          hiddenListingIds={props.hiddenListingIds}
          filters={props.marketFilters}
          setFilters={props.marketSetFilters}
          pagination={props.marketPagination}
          firebaseUserUid={props.firebaseUser?.uid}
          isLoggedIn={!!props.firebaseUser}
          savedListingIds={props.savedListingIds}
          actions={props.marketActions}
          activeChip={props.activeChip}
        />

        <section className="my-10 border-t border-zinc-200 pt-7">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">BuyMesho in Malawi</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">A public marketplace for buying and selling online.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">Search marketplace listings, browse categories, discover seller profiles, and find public events through BuyMesho. The marketplace connects buyers and sellers across Malawi in one online experience.</p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
            <a href="/buy-online-malawi" className="group inline-flex items-center gap-1.5 py-2 text-sm font-extrabold text-zinc-900 hover:text-blue-700">
              How to buy online in Malawi
              <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" />
            </a>
            <a href="/sell-online-malawi" className="group inline-flex items-center gap-1.5 py-2 text-sm font-extrabold text-zinc-900 hover:text-blue-700">
              How to sell online in Malawi
              <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" />
            </a>
          </div>
        </section>
      </main>

      <AppFooter />

      <AppLegacyOverlays
        reportListingId={props.reportListingId}
        setReportListingId={props.setReportListingId}
        editingListing={props.editingListing}
        setEditingListing={props.setEditingListing}
        confirmState={props.confirmState}
        setConfirmState={props.setConfirmState}
        feedback={props.feedback}
        setFeedback={props.setFeedback}
        handleUpdateListing={props.handleUpdateListing}
        showFeedback={props.showFeedback}
      />
    </div>
  );
}

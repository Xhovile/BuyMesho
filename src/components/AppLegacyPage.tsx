import React from "react";
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
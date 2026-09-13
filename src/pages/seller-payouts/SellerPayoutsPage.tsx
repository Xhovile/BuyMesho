import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import BrandMark from "../../components/BrandMark";
import ConfirmModal from "../../components/ConfirmModal";
import { EXPLORE_PATH, navigateToPath } from "../../lib/appNavigation";
import { getSellerCache } from "../../lib/sellerWorkspaceCache";
import SellerHubPage from "../../SellerHubPage";
import SellerOrdersPage from "../../SellerOrdersPage";
import SellerPayoutsAccessGate from "./components/SellerPayoutsAccessGate";
import SellerPayoutsDestinationsSection from "./components/SellerPayoutsDestinationsSection";
import SellerPayoutsHero from "./components/SellerPayoutsHero";
import SellerPayoutsHistorySection from "./components/SellerPayoutsHistorySection";
import SellerPayoutsNotice from "./components/SellerPayoutsNotice";
import { useSellerPayoutsPage } from "./useSellerPayoutsPage";

/**
 * The seller hub and seller orders are independent surfaces. Do not mount the
 * payout-management hook for them: that hook performs six authenticated API
 * reads and was unnecessarily blocking the workspace shell from rendering.
 */
export default function SellerPayoutsPage() {
  const view = new URLSearchParams(window.location.search).get("view");

  if (!view || view === "hub") return <SellerHubPage />;
  if (view === "orders") return <SellerOrdersPage />;

  return <SellerPayoutsManageView />;
}

function SellerPayoutsManageView() {
  const {
    profileLoading,
    isSeller,
    sellerId,
    loading,
    refreshing,
    notice,
    lastSaveDiagnostic,
    form,
    selectedDestinationId,
    destinationFormError,
    savingDestination,
    canEditSettings,
    canViewHistory,
    activeDestinations,
    providerMetadata,
    summary,
    earningsSummary,
    payouts,
    removeTarget,
    removeCountdown,
    setForm,
    resetForm,
    setRemoveTarget,
    startEdit,
    handleSaveDestination,
    handleMakeDefault,
    handleRemoveDestination: removeDestination,
    handleConfirmRemoveDestination,
    handleRefresh,
  } = useSellerPayoutsPage();

  const [destinationFormOpen, setDestinationFormOpen] = useState(false);
  const savingWasActive = useRef(false);

  const hasCachedPayoutData = Boolean(sellerId && getSellerCache(`payouts:${sellerId}`));
  const isAuthenticated = Boolean(sellerId);

  useEffect(() => {
    if (savingDestination) {
      savingWasActive.current = true;
      return;
    }

    if (savingWasActive.current) {
      savingWasActive.current = false;
      if (!destinationFormError) setDestinationFormOpen(false);
    }
  }, [savingDestination, destinationFormError]);

  if (!isAuthenticated && !profileLoading) {
    return <SellerPayoutsAccessGate loading={false} isSeller={false} isAuthenticated={false} onBack={() => navigateToPath(EXPLORE_PATH)} />;
  }

  if (profileLoading || (loading && !hasCachedPayoutData)) {
    return <SellerPayoutsAccessGate loading={profileLoading || loading} isSeller={isSeller} isAuthenticated={isAuthenticated} onBack={() => navigateToPath(EXPLORE_PATH)} />;
  }

  if (!isSeller) {
    return <SellerPayoutsAccessGate loading={false} isSeller={false} isAuthenticated={isAuthenticated} onBack={() => navigateToPath(EXPLORE_PATH)} />;
  }

  const providerOptions = [...providerMetadata.mobileMoneyOperators, ...providerMetadata.banks];
  const visibleNotice = notice && !notice.message.includes("Connect status") ? notice : null;

  const openAddDestination = () => {
    if (!canEditSettings) return;
    resetForm();
    setDestinationFormOpen(true);
  };

  const openReplaceDestination = (destination: typeof activeDestinations[number]) => {
    if (!canEditSettings) return;
    startEdit(destination);
    setDestinationFormOpen(true);
  };

  const closeDestinationForm = () => {
    if (savingDestination) return;
    setDestinationFormOpen(false);
    resetForm();
  };

  const handleDestinationRemove = (destination: typeof activeDestinations[number]) => {
    removeDestination(destination);
    if (destination.isDefault && canEditSettings) setDestinationFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <BrandMark />
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50 sm:flex-none"><ArrowLeft className="h-4 w-4" /> Back</button>
            <button type="button" onClick={() => void handleRefresh()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 sm:flex-none">{refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <SellerPayoutsHero summary={summary} earningsSummary={earningsSummary} canEditSettings={canEditSettings} />
        {visibleNotice ? <SellerPayoutsNotice type={visibleNotice.type} message={visibleNotice.message} details={lastSaveDiagnostic?.reasons} /> : null}

        <SellerPayoutsDestinationsSection
          form={form}
          onFormChange={setForm}
          onSave={handleSaveDestination}
          onCancel={closeDestinationForm}
          saving={savingDestination}
          error={destinationFormError}
          canEditSettings={canEditSettings}
          isEditing={Boolean(selectedDestinationId)}
          formOpen={destinationFormOpen}
          activeDestinations={activeDestinations}
          providerOptions={providerOptions}
          onAdd={openAddDestination}
          onReplace={openReplaceDestination}
          onRemove={handleDestinationRemove}
          onMakeDefault={handleMakeDefault}
        />

        <SellerPayoutsHistorySection payouts={payouts} canViewHistory={canViewHistory} />
      </main>

      <ConfirmModal
        open={Boolean(removeTarget)}
        title="Remove payout destination"
        message={removeTarget ? `Are you sure you want to remove ${removeTarget.providerName} from your payout destinations?` : "Are you sure you want to remove this payout destination?"}
        cancelText="Cancel"
        confirmText={removeCountdown > 0 ? `Confirm (${removeCountdown}s)` : "Confirm"}
        confirmDisabled={savingDestination || removeCountdown > 0}
        danger
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => void handleConfirmRemoveDestination()}
      />
    </div>
  );
}

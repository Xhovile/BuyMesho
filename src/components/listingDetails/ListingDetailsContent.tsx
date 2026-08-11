import { useState, type ReactNode } from "react";
import { useListingSEO } from "../../hooks/useListingSEO";
import ListingActionsMenu from "../ListingActionsMenu";
import ConfirmModal from "../ConfirmModal";
import FeedbackModal from "../FeedbackModal";
import ListingGallery from "./ListingGallery";
import ListingSummary from "./ListingSummary";
import ListingOffersBlock from "./ListingOffersBlock";
import ListingSpecsBlock from "./ListingSpecsBlock";
import ListingExploreBlock from "./ListingExploreBlock";
import ListingReviewsBlock from "./ListingReviewsBlock";
import ListingSectionTabs from "./ListingSectionTabs";
import ListingDetailsBlock from "./ListingDetailsBlock";
import ListingTrustBlock from "./ListingTrustBlock";
import ListingHeaderBar from "./ListingHeaderBar";
import ListingStatusPanel from "./ListingStatusPanel";
import CheckoutModal from "../CheckoutModal";
import FloatingCartButton from "../FloatingCartButton";
import { navigateToMessages, navigateToPath } from "../../lib/appNavigation";
import type { ListingDetailsPageState } from "../../hooks/useListingDetailsPage";

const BUYER_CART_KEY = "__buymesho_buyer_cart";
const BUYER_CART_UPDATED_EVENT = "buymesho:buyer-cart-updated";

function upsertLocalBuyerCartItem(uid: string, item: {
  listingId: string;
  listingTitle: string;
  listingImage?: string | null;
  listingDescription?: string | null;
  university?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availableQuantity?: number | null;
  addedAt: string;
}) {
  try {
    const storageKey = `${BUYER_CART_KEY}_${uid}`;
    const existingRaw = localStorage.getItem(storageKey);
    const current = existingRaw ? JSON.parse(existingRaw) as Array<Record<string, unknown>> : [];
    const next = current.filter((entry) => String(entry.listingId) !== String(item.listingId));
    next.unshift(item);
    localStorage.setItem(storageKey, JSON.stringify(next.slice(0, 20)));
    window.dispatchEvent(new CustomEvent(BUYER_CART_UPDATED_EVENT));
  } catch {
    // Ignore local storage failures.
  }
}

export default function ListingDetailsContent({
  firebaseUser,
  listing,
  seller,
  ratingSummary,
  loading,
  isFullscreen,
  saved,
  shareNoticeOpen,
  shareNoticeMessage,
  activeSection,
  checkoutOpen,
  authPromptOpen,
  authPromptAction,
  detailsRef,
  exploreRef,
  reviewsRef,
  galleryImages,
  currentGalleryIndex,
  currentImage,
  availableQuantity,
  groupedSpecs,
  showOffersBlock,
  sameCampusListings,
  sameCategoryListings,
  sellerOtherListings,
  handleToggleSaved,
  handleShare,
  handleBuyNow,
  handleAddToCart,
  handleMessageSeller,
  handleDetailEdit,
  handleDetailDelete,
  handleDetailHideSeller,
  handleDetailHideListing,
  handleDetailToggleStatus,
  handleDetailRecordSale,
  handleDetailRestock,
  handlePrevImage,
  handleNextImage,
  onSelectImage,
  onToggleFullscreen,
  scrollToSection,
  closeShareNotice,
  closeAuthPrompt,
  continueToAuth,
  setCheckoutOpen,
  reportPath,
  isLoggedIn,
  onRetry,
}: ListingDetailsPageState) {
  const [quickNoticeOpen, setQuickNoticeOpen] = useState(false);
  const [quickNoticeMessage, setQuickNoticeMessage] = useState("");

  useListingSEO(listing, seller?.business_name);
  const isOwner =
    !!firebaseUser?.uid &&
    !!listing?.seller_uid &&
    String(firebaseUser.uid).trim() === String(listing.seller_uid).trim();

  const detailActionsMenu = listing ? (
    <ListingActionsMenu
      listing={listing}
      currentUid={firebaseUser?.uid}
      isLoggedIn={!!firebaseUser}
      isSaved={saved}
      variant="detail"
      onReport={() => navigateToPath(reportPath)}
      onEdit={handleDetailEdit}
      onDelete={handleDetailDelete}
      onHideSeller={handleDetailHideSeller}
      onHideListing={handleDetailHideListing}
      onToggleStatus={handleDetailToggleStatus}
      onRecordSale={handleDetailRecordSale}
      onRestock={handleDetailRestock}
    />
  ) : null;

  const handleQuickAddToCart = () => {
    if (!listing) return;
    if (!firebaseUser?.uid) {
      handleAddToCart();
      return;
    }

    const unitPrice = Number(listing.price || 0);
    upsertLocalBuyerCartItem(firebaseUser.uid, {
      listingId: String(listing.id),
      listingTitle: listing.name,
      listingImage: listing.photos?.[0] ?? null,
      listingDescription: listing.description ?? null,
      university: listing.university ?? null,
      quantity: 1,
      unitPrice,
      totalPrice: unitPrice,
      availableQuantity,
      addedAt: new Date().toISOString(),
    });

    setQuickNoticeMessage("Added to cart.");
    setQuickNoticeOpen(true);
  };

  const handleQuickMessageSeller = () => {
    if (!listing) return;
    if (!firebaseUser?.uid) {
      handleMessageSeller();
      return;
    }

    navigateToMessages();
    void handleMessageSeller();
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <FloatingCartButton isLoggedIn={isLoggedIn} />
      <ListingHeaderBar />

      <main className="mx-auto max-w-[1500px] px-4 pb-12 pt-6 sm:pt-8">
        {loading ? (
          <ListingStatusPanel loading hasListing={!!listing} />
        ) : !listing ? (
          <ListingStatusPanel loading={false} hasListing={false} onRetry={onRetry} />
        ) : (
          <>
            <section className="grid gap-8 md:grid-cols-[minmax(165px,225px)_minmax(0,1fr)] md:items-stretch md:gap-7 lg:grid-cols-[minmax(182px,242px)_minmax(0,1fr)] lg:gap-9 xl:grid-cols-[minmax(194px,252px)_minmax(0,1fr)]">
              <div className="min-w-0 md:min-h-[clamp(28rem,68vh,40rem)]">
                <div className="md:sticky md:top-24 md:max-h-[calc(100vh-7rem)] md:overflow-hidden md:self-start">
                  <ListingGallery
                    listingName={listing.name}
                    galleryImages={galleryImages}
                    currentGalleryIndex={currentGalleryIndex}
                    currentImage={currentImage}
                    videoUrl={listing.video_url}
                    isFullscreen={isFullscreen}
                    saved={saved}
                    onToggleSaved={handleToggleSaved}
                    onOpenFullscreen={() => onToggleFullscreen(true)}
                    onCloseFullscreen={() => onToggleFullscreen(false)}
                    onPrevImage={handlePrevImage}
                    onNextImage={handleNextImage}
                    onSelectImage={onSelectImage}
                    actionsMenu={isOwner ? null : detailActionsMenu}
                  />
                </div>
              </div>

              <div className="min-w-0 space-y-7 lg:space-y-8">
                <ListingSummary
                  listing={listing}
                  seller={seller}
                  availableQuantity={availableQuantity}
                  isLoggedIn={!!firebaseUser}
                  currentUserUid={firebaseUser?.uid}
                  onMessageSeller={handleQuickMessageSeller}
                  onShare={handleShare}
                  onBuyNow={handleBuyNow}
                  onAddToCart={handleQuickAddToCart}
                  ownerActionsMenu={isOwner ? detailActionsMenu : null}
                />
                {showOffersBlock ? <ListingOffersBlock listing={listing} /> : null}
                <ListingDetailsBlock
                  description={listing.description}
                  sellerNote={seller?.bio?.trim() || "No seller note has been added yet."}
                  deliveryNote="Arrange collection, delivery, or campus handover directly through the in-app chat."
                />
              </div>
            </section>

            <ListingSectionTabs activeSection={activeSection} onNavigate={scrollToSection} />

            <section ref={detailsRef} id="details" className="scroll-mt-32 pt-10">
              <div className="space-y-6">
                <ListingSpecsBlock groups={groupedSpecs} />
              </div>
            </section>

            <section ref={exploreRef} id="explore" className="scroll-mt-32 pt-12">
              <ListingExploreBlock
                sameCampusListings={sameCampusListings}
                sameCategoryListings={sameCategoryListings}
                sellerOtherListings={sellerOtherListings}
              />
            </section>

            <section className="scroll-mt-32 pt-12">
              <div className="space-y-4">
                <div className="space-y-2 border-b border-zinc-200 pb-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-600">Seller Info</p>
                  <h2 className="font-serif text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                    Seller profile
                  </h2>
                  <p className="max-w-3xl text-sm leading-6 text-zinc-500">
                    View the seller&apos;s profile and trust signals before reading reviews.
                  </p>
                </div>
                <ListingTrustBlock listing={listing} seller={seller} ratingSummary={ratingSummary} />
              </div>
            </section>

            <section ref={reviewsRef} id="reviews" className="scroll-mt-32 pt-12">
              <ListingReviewsBlock ratingSummary={ratingSummary} listing={listing} seller={seller} />
            </section>
          </>
        )}
      </main>

      <FeedbackModal open={shareNoticeOpen} type="info" title="Notice" message={shareNoticeMessage} onClose={closeShareNotice} />
      <FeedbackModal open={quickNoticeOpen} type="info" title="Notice" message={quickNoticeMessage} onClose={() => setQuickNoticeOpen(false)} />

      <ConfirmModal
        open={authPromptOpen}
        title={
          authPromptAction === "buy"
            ? "Sign in to buy"
            : authPromptAction === "cart"
              ? "Sign in to use cart"
              : "Sign in to message"
        }
        message={
          authPromptAction === "buy"
            ? "You need to sign in or create an account before you can buy this listing."
            : authPromptAction === "cart"
              ? "You need to sign in or create an account before adding this listing to your cart."
              : "You need to sign in or create an account before you can message the seller."
        }
        confirmText={authPromptAction === "cart" ? "Login" : "Continue"}
        cancelText="Cancel"
        onCancel={closeAuthPrompt}
        onConfirm={continueToAuth}
      />

      {listing && (
        <CheckoutModal
          listing={listing}
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          buyerName={firebaseUser?.displayName}
          buyerEmail={firebaseUser?.email}
        />
      )}
    </div>
  );
}

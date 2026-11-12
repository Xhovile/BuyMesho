import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { ListingStudio } from "./listing-studio";
import FeedbackModal from "./components/FeedbackModal";
import BrandMark from "./components/BrandMark";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { invalidateHomepageCache } from "./hooks/useHomePageData";
import { apiFetch } from "./lib/api";
import {
  EXPLORE_PATH,
  HOME_PATH,
  getEditListingIdFromUrl,
  navigateBackOrPath,
  navigateToPath,
} from "./lib/appNavigation";
import { fetchListingById } from "./lib/listings";
import { resolveUniversity } from "./lib/university";
import type { CreateListingPayload, Listing, ListingDraft } from "./types";

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

function deriveListingMode(listing: Listing): import("./types").ListingMode {
  if (listing.is_wholesale) return "wholesale";
  if (listing.original_price || listing.discount_percent) return "deal";
  return "normal";
}

function toDraft(listing: Listing, fallbackUniversity?: string): ListingDraft {
  return {
    name: listing.name || "",
    price: String(listing.price ?? ""),
    description: listing.description || "",
    category: listing.category,
    subcategory: listing.subcategory || "",
    item_type: listing.item_type || "",
    spec_values: listing.spec_values || {},
    university: resolveUniversity(listing.university || fallbackUniversity),
    photos: Array.isArray(listing.photos) ? listing.photos : [],
    video_url: listing.video_url || "",
    status: listing.status || "available",
    condition: listing.condition || "used",
    quantity: String(listing.quantity ?? 1),
    sold_quantity: String(listing.sold_quantity ?? 0),
    listing_mode: listing.listing_mode || deriveListingMode(listing),
    original_price: listing.original_price ? String(listing.original_price) : "",
    discount_percent: listing.discount_percent ? String(listing.discount_percent) : "",
    deal_label: listing.deal_label || "",
    deal_expires_at: listing.deal_expires_at || "",
    is_wholesale: !!listing.is_wholesale,
    can_sell_individually: listing.can_sell_individually ?? undefined,
    pack_size: listing.pack_size ? String(listing.pack_size) : "",
    bulk_units: listing.bulk_units || "",
    single_item_price: listing.single_item_price ? String(listing.single_item_price) : "",
  };
}

export default function EditListingPage() {
  const { firebaseUser, authLoading, profile, profileLoading } = useAccountProfile();
  const [loadingListing, setLoadingListing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [redirectAfterFeedback, setRedirectAfterFeedback] = useState(false);

  const listingId = useMemo(() => getEditListingIdFromUrl(), []);
  const initialDraft = useMemo(() => {
    if (!listing) return null;
    return toDraft(listing, profile?.university);
  }, [listing, profile?.university]);

  useEffect(() => {
    const loadListing = async () => {
      if (!listingId) {
        setLoadingListing(false);
        return;
      }

      setLoadingListing(true);
      try {
        const found = await fetchListingById(listingId);
        setListing(found);
      } catch (error) {
        console.error("Failed to load listing for edit", error);
        setListing(null);
      } finally {
        setLoadingListing(false);
      }
    };

    void loadListing();
  }, [listingId]);

  const showFeedback = (type: "success" | "error" | "info", title: string, message: string) => {
    setFeedback({ open: true, type, title, message });
  };

  const closeFeedback = () => {
    setFeedback(null);
    if (redirectAfterFeedback) {
      setRedirectAfterFeedback(false);
      navigateBackOrPath(EXPLORE_PATH);
    }
  };

  const saveListing = async (payload: CreateListingPayload) => {
    if (!listing) {
      throw new Error("Listing not loaded.");
    }

    const body = JSON.stringify({
      ...payload,
      id: listing.id,
    });

    try {
      await apiFetch(`/api/listings/${listing.id}`, {
        method: "PUT",
        body,
      });
      return;
    } catch (error: any) {
      const message = String(error?.message || "").toLowerCase();
      if (!message.includes("seller profile")) {
        throw error;
      }

      await apiFetch("/api/profile/bootstrap", {
        method: "POST",
        body: JSON.stringify({
          university: resolveUniversity(profile?.university || listing.university || ""),
        }),
      });

      await apiFetch(`/api/listings/${listing.id}`, {
        method: "PUT",
        body,
      });
    }
  };

  const handleSave = async (payload: CreateListingPayload) => {
    if (!listing) {
      throw new Error("Listing not loaded.");
    }

    setSubmitting(true);
    try {
      await saveListing(payload);
      invalidateHomepageCache();
      setRedirectAfterFeedback(true);
      showFeedback("success", "Listing updated", "Your listing was updated successfully.");
    } catch (error: any) {
      showFeedback("error", "Update failed", error?.message || "We could not update your listing.");
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const canEdit = !!firebaseUser && !!profile?.is_seller && !!listing && listing.seller_uid === firebaseUser.uid;

  return (
    <div className="min-h-screen bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text dark:text-bm-text">
      <header className="buymesho-brand-header sticky top-0 z-40 border-b border-bm-border bg-bm-surface/90 dark:bg-bm-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <BrandMark subtitle="Edit listing" />
          <button
            type="button"
            onClick={() => navigateBackOrPath(EXPLORE_PATH)}
            className="rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-2.5 text-sm font-bold hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
          >
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-2 py-8 sm:px-4">
        {authLoading || profileLoading || loadingListing ? (
          <div className="flex items-center justify-center gap-3 border-b border-bm-border dark:border-bm-border bg-transparent px-0 py-20 font-medium text-bm-text-subtle dark:text-bm-text-subtle">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading listing editor...
          </div>
        ) : !firebaseUser ? (
          <div className="border-b border-bm-border dark:border-bm-border pb-12 pt-6 text-center">
            <h1 className="text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">Login required</h1>
            <p className="mt-3 text-sm text-bm-text-subtle dark:text-bm-text-subtle">You need to log in before editing a listing.</p>
            <button type="button" onClick={() => navigateToPath("/login")} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-5 py-3 text-sm font-extrabold text-bm-on-brand hover:bg-bm-brand-hover">Go to Login</button>
          </div>
        ) : !profile?.is_seller ? (
          <div className="border-b border-bm-border dark:border-bm-border pb-12 pt-6 text-center">
            <h1 className="text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">Seller account required</h1>
            <p className="mt-3 text-sm text-bm-text-subtle dark:text-bm-text-subtle">Only seller accounts can edit listings.</p>
            <button type="button" onClick={() => navigateBackOrPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-5 py-3 text-sm font-extrabold text-bm-on-brand hover:bg-bm-brand-hover"><ChevronLeft className="h-4 w-4" /> Return to Explore</button>
          </div>
        ) : !listing ? (
          <div className="border-b border-bm-border dark:border-bm-border pb-12 pt-6 text-center">
            <h1 className="text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">Listing not found</h1>
            <p className="mt-3 text-sm text-bm-text-subtle dark:text-bm-text-subtle">The listing could not be loaded or may no longer exist.</p>
            <button type="button" onClick={() => navigateBackOrPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-5 py-3 text-sm font-extrabold text-bm-on-brand hover:bg-bm-brand-hover"><ChevronLeft className="h-4 w-4" /> Back</button>
          </div>
        ) : listing.seller_uid !== firebaseUser.uid ? (
          <div className="border-b border-bm-border dark:border-bm-border pb-12 pt-6 text-center">
            <h1 className="text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">Access denied</h1>
            <p className="mt-3 text-sm text-bm-text-subtle dark:text-bm-text-subtle">This listing does not belong to your account.</p>
            <button type="button" onClick={() => navigateBackOrPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-5 py-3 text-sm font-extrabold text-bm-on-brand hover:bg-bm-brand-hover"><ChevronLeft className="h-4 w-4" /> Back</button>
          </div>
        ) : canEdit ? (
          <div className="pb-20">
            <div className="mb-6 border-b border-bm-border dark:border-bm-border pb-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle dark:text-bm-text-subtle">Listing studio</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-bm-text dark:text-bm-text">Edit your listing.</h1>
            </div>

            {initialDraft ? (
              <ListingStudio
                key={listing.id}
                mode="edit"
                initialData={initialDraft}
                draftStorageKey={`edit:${firebaseUser.uid}:${listing.id}`}
                onCancel={() => navigateBackOrPath(EXPLORE_PATH)}
                onSubmit={handleSave}
                showFeedback={showFeedback}
                isSubmitting={submitting}
                submitLabel="Save Changes"
                submitBusyLabel="Saving..."
              />
            ) : null}
          </div>
        ) : null}
      </main>

      {feedback ? (
        <FeedbackModal
          open={feedback.open}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={closeFeedback}
        />
      ) : null}
    </div>
  );
}

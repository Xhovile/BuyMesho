import { useMemo, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { ListingStudio } from "./listing-studio";
import FeedbackModal from "./components/FeedbackModal";
import BrandMark from "./components/BrandMark";
import { apiFetch } from "./lib/api";
import { EXPLORE_PATH, navigateBackOrPath, navigateToPath } from "./lib/appNavigation";
import { CATEGORIES } from "./constants";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { invalidateHomepageCache } from "./hooks/useHomePageData";
import { resolveUniversity } from "./lib/university";
import type { ListingDraft, UserProfile } from "./types";

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

const createInitialListingDraft = (userProfile?: UserProfile | null): ListingDraft => ({
  name: "",
  price: "",
  description: "",
  category: CATEGORIES[0],
  subcategory: "",
  item_type: "",
  spec_values: {},
  university: resolveUniversity(userProfile?.university),
  photos: [],
  video_url: "",
  status: "available",
  condition: "used",
  quantity: "1",
  sold_quantity: "0",
  listing_mode: "normal",
  original_price: "",
  discount_percent: "",
  deal_label: "",
  is_wholesale: false,
  pack_size: "",
  bulk_units: "",
});

export default function CreateListingPage() {
  const { firebaseUser, authLoading, profile, profileLoading, refreshProfile, emailVerified } = useAccountProfile();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [redirectAfterFeedback, setRedirectAfterFeedback] = useState(false);

  const listingDraft = useMemo(() => createInitialListingDraft(profile), [profile]);

  const showFeedback = (type: "success" | "error" | "info", title: string, message: string) => {
    setFeedback({ open: true, type, title, message });
  };

  const closeFeedback = () => {
    setFeedback(null);
    if (redirectAfterFeedback) {
      setRedirectAfterFeedback(false);
      navigateToPath(EXPLORE_PATH);
    }
  };

  const syncSellerRecord = async () => {
    if (!firebaseUser) return;

    await refreshProfile();

    await apiFetch("/api/sellers", {
      method: "POST",
      body: JSON.stringify({
        email: firebaseUser.email || "",
        business_name: profile?.business_name || "",
        business_logo: profile?.business_logo || "",
        university: profile?.university || listingDraft.university,
        bio: profile?.bio || "",
        is_verified: true,
        is_seller: true,
      }),
    });

    await refreshProfile();
  };

  const handleCreate = async (payload: any) => {
    setSubmitting(true);
    try {
      await refreshProfile();
      try {
        await apiFetch("/api/listings", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch (err: any) {
        const message = err instanceof Error ? err.message : String(err);

        if (message.includes("Seller profile not found")) {
          await apiFetch("/api/profile/bootstrap", {
            method: "POST",
            body: JSON.stringify({
              university: payload.university,
            }),
          });

          await apiFetch("/api/listings", {
            method: "POST",
            body: JSON.stringify(payload),
          });

          return;
        }

        throw err;
      }

      invalidateHomepageCache();
      setRedirectAfterFeedback(true);
      showFeedback("success", "Listing posted", "Your listing was created successfully.");
    } catch (err: any) {
      const message = String(err?.message || "");
      const needsSellerResync = /account not verified|2-factor authentication required|2-factor authentication needed|2fa/i.test(message);

      if (needsSellerResync) {
        try {
          await syncSellerRecord();
          await refreshProfile();
          await apiFetch("/api/listings", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          invalidateHomepageCache();
          setRedirectAfterFeedback(true);
          showFeedback("success", "Listing posted", "Your listing was created successfully.");
          return;
        } catch (retryErr: any) {
          showFeedback("error", "Listing creation failed", retryErr?.message || message || "We could not create your listing.");
          throw retryErr;
        }
      }

      showFeedback("error", "Listing creation failed", message || "We could not create your listing.");
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = !!firebaseUser && !!profile?.is_seller && !!emailVerified;
  const isBusy = authLoading || profileLoading;

  return (
    <div className="min-h-screen bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text dark:text-bm-text">
      <header className="sticky top-0 z-40 border-b border-bm-border bg-bm-surface/90 dark:bg-bm-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <BrandMark subtitle="Create listing" />
          <button type="button" onClick={() => navigateBackOrPath(EXPLORE_PATH)} className="rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-2.5 text-sm font-bold hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted">Back</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-2 py-8 sm:px-4">
        {isBusy ? (
          <div className="flex items-center justify-center gap-3 border-b border-bm-border dark:border-bm-border bg-transparent px-0 py-20 font-medium text-bm-text-subtle dark:text-bm-text-subtle">
            <Loader2 className="h-5 w-5 animate-spin" /> Preparing listing studio...
          </div>
        ) : !firebaseUser ? (
          <div className="border-b border-bm-border dark:border-bm-border pb-12 pt-6 text-center">
            <h1 className="text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">Login required</h1>
            <p className="mt-3 text-sm text-bm-text-subtle dark:text-bm-text-subtle">You need to log in before posting a listing.</p>
            <button type="button" onClick={() => navigateBackOrPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-5 py-3 text-sm font-extrabold text-bm-on-brand hover:bg-bm-brand-hover"><ChevronLeft className="h-4 w-4" /> Return</button>
          </div>
        ) : !profile?.is_seller ? (
          <div className="border-b border-bm-border dark:border-bm-border pb-12 pt-6 text-center">
            <h1 className="text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">Seller account required</h1>
            <p className="mt-3 text-sm text-bm-text-subtle dark:text-bm-text-subtle">Apply to become a seller before posting listings.</p>
            <button type="button" onClick={() => navigateBackOrPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-5 py-3 text-sm font-extrabold text-bm-on-brand hover:bg-bm-brand-hover"><ChevronLeft className="h-4 w-4" /> Return</button>
          </div>
        ) : !emailVerified ? (
          <div className="border-b border-bm-border dark:border-bm-border pb-12 pt-6 text-center">
            <h1 className="text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">Email verification required</h1>
            <p className="mt-3 text-sm text-bm-text-subtle dark:text-bm-text-subtle">Verify your email before posting listings.</p>
            <button type="button" onClick={() => navigateBackOrPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-5 py-3 text-sm font-extrabold text-bm-on-brand hover:bg-bm-brand-hover"><ChevronLeft className="h-4 w-4" /> Return</button>
          </div>
        ) : canCreate ? (
          <div className="pb-20">
            <div className="mb-6 border-b border-bm-border dark:border-bm-border pb-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle dark:text-bm-text-subtle">Listing studio</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-bm-text dark:text-bm-text">Create a listing in a dedicated page.</h1>
            </div>
            <ListingStudio
              mode="create"
              initialData={listingDraft}
              draftStorageKey={`create:${firebaseUser.uid}`}
              onCancel={() => navigateBackOrPath(EXPLORE_PATH)}
              onSubmit={handleCreate}
              showFeedback={showFeedback}
              isSubmitting={submitting}
              submitLabel="Post Listing"
              submitBusyLabel="Posting..."
            />
          </div>
        ) : null}
      </main>

      {feedback && <FeedbackModal open={feedback.open} type={feedback.type} title={feedback.title} message={feedback.message} onClose={closeFeedback} />}
    </div>
  );
}

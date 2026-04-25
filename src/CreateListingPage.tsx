import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { reload } from "firebase/auth";
import ListingStudioForm from "./components/ListingStudioForm";
import FeedbackModal from "./components/FeedbackModal";
import { apiFetch } from "./lib/api";
import { EXPLORE_PATH, HOME_PATH, navigateToPath } from "./lib/appNavigation";
import { CATEGORIES } from "./constants";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { invalidateHomepageCache } from "./hooks/useHomePageData";
import { resolveUniversity } from "./lib/university";
import { resolveWhatsappNumber } from "./lib/whatsapp";
import type { ListingDraft, UserProfile } from "./types";

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
  whatsapp_number: resolveWhatsappNumber(userProfile?.whatsapp_number),
  status: "available",
  condition: "used",
  quantity: "1",
  sold_quantity: "0",
});

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

export default function CreateListingPage() {
  const { firebaseUser, authLoading, profile, profileLoading, refreshProfile } = useAccountProfile();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [redirectAfterFeedback, setRedirectAfterFeedback] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  const listingDraft = useMemo(() => createInitialListingDraft(profile), [profile]);

  useEffect(() => {
    let cancelled = false;

    const syncEmailVerification = async () => {
      if (!firebaseUser) {
        setEmailVerified(null);
        return;
      }

      try {
        await reload(firebaseUser);
      } catch {
        // Ignore reload failures and fall back to the current auth snapshot.
      }

      if (!cancelled) {
        setEmailVerified(!!firebaseUser.emailVerified);
      }
    };

    void syncEmailVerification();
    void refreshProfile();

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, refreshProfile]);

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

    await reload(firebaseUser);
    await refreshProfile();

    await apiFetch("/api/sellers", {
      method: "POST",
      body: JSON.stringify({
        email: firebaseUser.email || "",
        business_name: profile?.business_name || "",
        business_logo: profile?.business_logo || "",
        university: profile?.university || listingDraft.university,
        bio: profile?.bio || "",
        whatsapp_number: profile?.whatsapp_number || listingDraft.whatsapp_number,
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
      await apiFetch("/api/listings", {
        method: "POST",
        body: JSON.stringify(payload),
      });

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

  const canCreate = !!firebaseUser && (!!profile?.is_seller || !!profile?.is_verified) && emailVerified === true;

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-900 text-xl font-extrabold text-white shadow-lg shadow-red-900/20">B</div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight"><span className="text-red-900">Buy</span><span className="text-zinc-700">Mesho</span></p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Create listing</p>
            </div>
          </button>
          <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50">Back to Explore</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-2 py-8 sm:px-4">
        {authLoading || profileLoading || emailVerified === null ? (
          <div className="flex items-center justify-center gap-3 rounded-[2rem] border border-zinc-200 bg-white p-10 font-medium text-zinc-500 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" /> Preparing listing studio...
          </div>
        ) : !firebaseUser ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Login required</h1>
            <p className="mt-3 text-sm text-zinc-500">You need to log in before posting a listing.</p>
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"><ChevronLeft className="h-4 w-4" /> Return to Explore</button>
          </div>
        ) : !profile?.is_seller ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Seller account required</h1>
            <p className="mt-3 text-sm text-zinc-500">Apply to become a seller before posting listings.</p>
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"><ChevronLeft className="h-4 w-4" /> Return to Explore</button>
          </div>
        ) : !canCreate ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Email verification required</h1>
            <p className="mt-3 text-sm text-zinc-500">Verify your email before posting listings.</p>
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"><ChevronLeft className="h-4 w-4" /> Return to Explore</button>
          </div>
        ) : (
          <div className="pb-20">
            <div className="px-2 sm:px-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Listing studio</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">Create a listing in a dedicated page.</h1>
            </div>
            <ListingStudioForm mode="create" initialData={listingDraft} onCancel={() => navigateToPath(EXPLORE_PATH)} onSubmit={handleCreate} showFeedback={showFeedback} isSubmitting={submitting} submitLabel="Post Listing" submitBusyLabel="Posting..." />
          </div>
        )}
      </main>

      {feedback && <FeedbackModal open={feedback.open} type={feedback.type} title={feedback.title} message={feedback.message} onClose={closeFeedback} />}
    </div>
  );
}

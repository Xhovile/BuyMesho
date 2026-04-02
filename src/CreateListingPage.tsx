import { useMemo, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import ListingStudioForm from "./components/ListingStudioForm";
import FeedbackModal from "./components/FeedbackModal";
import { auth } from "./firebase";
import { apiFetch } from "./lib/api";
import { EXPLORE_PATH, HOME_PATH, navigateToPath } from "./lib/appNavigation";
import { CATEGORIES, UNIVERSITIES } from "./constants";
import { useAccountProfile } from "./hooks/useAccountProfile";
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
  const { firebaseUser, authLoading, profile, profileLoading } = useAccountProfile();
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

  const handleCreate = async (payload: any) => {
    setSubmitting(true);
    try {
      await apiFetch("/api/listings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setRedirectAfterFeedback(true);
      showFeedback("success", "Listing posted", "Your listing was created successfully.");
    } catch (err: any) {
      showFeedback("error", "Listing creation failed", err?.message || "We could not create your listing.");
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = !!firebaseUser && !!profile?.is_seller && !!auth.currentUser?.emailVerified;

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-900/20">B</div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight"><span className="text-red-900">Buy</span><span className="text-zinc-700">Mesho</span></p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Create listing</p>
            </div>
          </button>
          <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50">Back to Explore</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 sm:px-4 py-8">
        {authLoading || profileLoading ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm flex items-center justify-center gap-3 text-zinc-500 font-medium"><Loader2 className="w-5 h-5 animate-spin" /> Preparing listing studio...</div>
        ) : !firebaseUser ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Login required</h1>
            <p className="mt-3 text-sm text-zinc-500">You need to log in before posting a listing.</p>
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"><ChevronLeft className="w-4 h-4" /> Return to Explore</button>
          </div>
        ) : !profile?.is_seller ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Seller account required</h1>
            <p className="mt-3 text-sm text-zinc-500">Apply to become a seller before posting listings.</p>
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"><ChevronLeft className="w-4 h-4" /> Return to Explore</button>
          </div>
        ) : !auth.currentUser?.emailVerified ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Email verification required</h1>
            <p className="mt-3 text-sm text-zinc-500">Verify your email before posting listings.</p>
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"><ChevronLeft className="w-4 h-4" /> Return to Explore</button>
          </div>
        ) : canCreate ? (
          <div className="pb-20">
            <div className="px-2 sm:px-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Listing studio</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">Create a listing in a dedicated page.</h1>
            </div>
            <ListingStudioForm mode="create" initialData={listingDraft} onCancel={() => navigateToPath(EXPLORE_PATH)} onSubmit={handleCreate} showFeedback={showFeedback} isSubmitting={submitting} submitLabel="Post Listing" submitBusyLabel="Posting..." />
          </div>
        ) : null}
      </main>

      {feedback && <FeedbackModal open={feedback.open} type={feedback.type} title={feedback.title} message={feedback.message} onClose={closeFeedback} />}
    </div>
  );
}

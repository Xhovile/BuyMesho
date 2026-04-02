import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import ListingStudioForm from "./components/ListingStudioForm";
import FeedbackModal from "./components/FeedbackModal";
import { auth } from "./firebase";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { apiFetch } from "./lib/api";
import { EXPLORE_PATH, HOME_PATH, getEditListingIdFromUrl, navigateToPath } from "./lib/appNavigation";
import type { Listing, ListingDraft } from "./types";

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

const toListingDraft = (listing: Listing): ListingDraft => ({
  name: listing.name || "",
  price: String(listing.price ?? ""),
  description: listing.description || "",
  category: listing.category,
  subcategory: listing.subcategory || "",
  item_type: listing.item_type || "",
  spec_values: listing.spec_values || {},
  university: listing.university,
  photos: listing.photos || [],
  video_url: listing.video_url || "",
  whatsapp_number: listing.whatsapp_number || "",
  status: listing.status || "available",
  condition: listing.condition || "used",
  quantity: String(listing.quantity ?? 1),
  sold_quantity: String(listing.sold_quantity ?? 0),
});

export default function EditListingPage() {
  const { firebaseUser, authLoading, profile, profileLoading } = useAccountProfile();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [redirectAfterFeedback, setRedirectAfterFeedback] = useState(false);

  const listingId = getEditListingIdFromUrl();

  useEffect(() => {
    const loadListing = async () => {
      if (!listingId || !firebaseUser) {
        setListing(null);
        setLoadingListing(false);
        return;
      }

      setLoadingListing(true);
      try {
        const data = await apiFetch(`/api/users/${firebaseUser.uid}/listings`);
        const items = Array.isArray(data) ? data : [];
        const found = items.find((item: Listing) => item.id === listingId) || null;
        setListing(found);
      } catch (error) {
        console.error("Failed to load listing for edit page", error);
        setListing(null);
      } finally {
        setLoadingListing(false);
      }
    };

    void loadListing();
  }, [listingId, firebaseUser]);

  const listingDraft = useMemo(() => (listing ? toListingDraft(listing) : null), [listing]);

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

  const handleSave = async (payload: any) => {
    if (!listing) return;

    setSubmitting(true);
    try {
      const saveListing = async () =>
        apiFetch(`/api/listings/${listing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

      try {
        await saveListing();
      } catch (error: any) {
        const message = typeof error?.message === "string" ? error.message : "";
        if (!message.toLowerCase().includes("seller profile not found")) {
          throw error;
        }

        await apiFetch("/api/profile/bootstrap", {
          method: "POST",
          body: JSON.stringify({
            university: profile?.university || listing.university || "",
          }),
        });
        await saveListing();
      }
      setRedirectAfterFeedback(true);
      showFeedback("success", "Listing updated", "Your listing was updated successfully.");
    } catch (err: any) {
      showFeedback("error", "Update failed", err?.message || "We could not update the listing.");
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-900/20">B</div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight"><span className="text-red-900">Buy</span><span className="text-zinc-700">Mesho</span></p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Edit listing</p>
            </div>
          </button>
          <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50">Back to Explore</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {authLoading || profileLoading || loadingListing ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm flex items-center justify-center gap-3 text-zinc-500 font-medium"><Loader2 className="w-5 h-5 animate-spin" /> Preparing edit surface...</div>
        ) : !firebaseUser ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Login required</h1>
            <p className="mt-3 text-sm text-zinc-500">You need to log in before editing a listing.</p>
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"><ChevronLeft className="w-4 h-4" /> Return to Explore</button>
          </div>
        ) : !profile?.is_seller ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Seller access required</h1>
            <p className="mt-3 text-sm text-zinc-500">Only verified seller accounts can edit listings from this route-backed surface.</p>
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"><ChevronLeft className="w-4 h-4" /> Return to Explore</button>
          </div>
        ) : !auth.currentUser?.emailVerified ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Verify your email first</h1>
            <p className="mt-3 text-sm text-zinc-500">Please verify your account email before editing listings.</p>
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"><ChevronLeft className="w-4 h-4" /> Return to Explore</button>
          </div>
        ) : !listingDraft ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Listing not found</h1>
            <p className="mt-3 text-sm text-zinc-500">This listing could not be loaded for editing.</p>
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"><ChevronLeft className="w-4 h-4" /> Return to Explore</button>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Listing studio</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">Edit your listing in a dedicated page surface.</h1>
            </div>
            <ListingStudioForm mode="edit" initialData={listingDraft} onCancel={() => navigateToPath(EXPLORE_PATH)} onSubmit={handleSave} showFeedback={showFeedback} isSubmitting={submitting} submitLabel="Save Changes" submitBusyLabel="Saving..." />
          </div>
        )}
      </main>

      {feedback && <FeedbackModal open={feedback.open} type={feedback.type} title={feedback.title} message={feedback.message} onClose={closeFeedback} />}
    </div>
  );
}

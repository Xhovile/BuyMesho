import { useCallback, useEffect, useState } from "react";
import { useAuthUser } from "./hooks/useAuthUser";
import type { ListingReview, ListingReviewSummary } from "./types";
import { LISTING_PATH } from "./lib/appNavigation";
import { apiFetch } from "./lib/api";
import ListingHeaderBar from "./components/listingDetails/ListingHeaderBar";
import ListingReviewFeed from "./components/reviews/ListingReviewFeed";
import ListingReviewComposer from "./components/reviews/ListingReviewComposer";

export default function ListingReviewsPage() {
  const { user: firebaseUser } = useAuthUser();
  const listingValue = new URLSearchParams(window.location.search).get("listing");
  const parsedListingId = Number(listingValue);
  const listingId = Number.isInteger(parsedListingId) && parsedListingId > 0 ? parsedListingId : null;
  const [summary, setSummary] = useState<ListingReviewSummary | null>(null);
  const [sellerUid, setSellerUid] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<ListingReview | null>(null);
  const [reviewFeedVersion, setReviewFeedVersion] = useState(0);
  const [reviewEditorOpen, setReviewEditorOpen] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [viewerReview, setViewerReview] = useState<ListingReview | null>(null);
  const handleListingMetaLoaded = useCallback((listing: { seller_uid: string }) => {
    setSellerUid(listing.seller_uid);
  }, []);
  const handleEditOwnReview = useCallback((review: ListingReview) => {
    setEditingReview(review);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleDeleteOwnReview = useCallback(async (review: ListingReview) => {
    await apiFetch(`/api/listings/${listingId}/reviews/${review.id}`, {
      method: "DELETE",
      headers: {
        "Idempotency-Key": `review-delete-${review.id}-${Date.now()}`,
      },
      timeoutMs: 120_000,
    });

    setEditingReview(null);
    setReviewFeedVersion((version) => version + 1);
    setSummary(null);
    setViewerReview(null);
  }, [listingId]);
  const handleReviewSaved = useCallback((review: ListingReview | null) => {
    setEditingReview(null);
    setReviewFeedVersion((version) => version + 1);
    if (review) setViewerReview(review);
    if (review) setSummary(null);
  }, []);

  useEffect(() => {
    setSummary(null);
    setSellerUid(null);
  }, [listingId]);

  if (!listingId) {
    return (
      <div className="min-h-screen bg-zinc-100 text-zinc-900">
        <ListingHeaderBar subtitle="Reviews" backPath={LISTING_PATH} />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
            This review page could not find a valid listing.
          </div>
        </main>
      </div>
    );
  }

  const backPath = LISTING_PATH + "?listing=" + listingId + "&image=0";
  const canReplyAsSeller =
    !!firebaseUser?.uid && !!sellerUid && firebaseUser.uid === sellerUid;

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <ListingHeaderBar subtitle="Reviews" backPath={backPath} />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:pt-8">
        <section className="space-y-2 border-b border-zinc-200 pb-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-600">Listing reviews</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
              Ratings & reviews
            </h1>
            {summary ? (
              <p className="text-sm font-bold text-zinc-500">
                {summary.ratingCount.toLocaleString()} review{summary.ratingCount === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
          <p className="max-w-3xl text-sm leading-6 text-zinc-500">
            Browse the complete review history for this listing. Reviews load as you move through the page.
          </p>
        </section>

        <div className="mt-6 space-y-6">
          {!editingReview && firebaseUser && canReview && !viewerReview ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setReviewEditorOpen(true)}
                className="rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                Leave a review
              </button>
            </div>
          ) : null}

          <ListingReviewComposer
            listingId={listingId}
            isAuthenticated={!!firebaseUser}
            canReview={editingReview ? true : canReview}
            existingReview={editingReview}
            open={reviewEditorOpen || Boolean(editingReview)}
            onSaved={handleReviewSaved}
            onClose={() => {
              setReviewEditorOpen(false);
              setEditingReview(null);
            }}
          />

          <ListingReviewFeed
            key={reviewFeedVersion}
            listingId={listingId}
            mode="full"
            canReply={canReplyAsSeller}
            viewerUid={firebaseUser?.uid}
            onSummaryChange={setSummary}
            onListingMetaLoaded={handleListingMetaLoaded}
            onEditOwnReview={handleEditOwnReview}
            onDeleteOwnReview={handleDeleteOwnReview}
            onReviewEligibilityChange={setCanReview}
            onViewerReviewChange={setViewerReview}
          />
        </div>
      </main>
    </div>
  );
}

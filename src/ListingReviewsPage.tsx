import { useEffect, useState } from "react";
import { useAuthUser } from "./hooks/useAuthUser";
import type { ListingReviewSummary } from "./types";
import { LISTING_PATH } from "./lib/appNavigation";
import ListingHeaderBar from "./components/listingDetails/ListingHeaderBar";
import ListingReviewFeed from "./components/reviews/ListingReviewFeed";

export default function ListingReviewsPage() {
  const { user: firebaseUser } = useAuthUser();
  const listingValue = new URLSearchParams(window.location.search).get("listing");
  const parsedListingId = Number(listingValue);
  const listingId = Number.isInteger(parsedListingId) && parsedListingId > 0 ? parsedListingId : null;
  const [summary, setSummary] = useState<ListingReviewSummary | null>(null);
  const [sellerUid, setSellerUid] = useState<string | null>(null);

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
          <ListingReviewFeed
            listingId={listingId}
            mode="full"
            canReply={canReplyAsSeller}
            viewerUid={firebaseUser?.uid}
            onSummaryChange={setSummary}
            onListingMetaLoaded={(listing) => setSellerUid(listing.seller_uid)}
          />
        </div>
      </main>
    </div>
  );
}

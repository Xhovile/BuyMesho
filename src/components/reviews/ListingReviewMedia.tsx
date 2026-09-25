import { useState } from "react";
import { X } from "lucide-react";
import type { ListingReviewMediaAsset } from "../../types";

export default function ListingReviewMedia({
  media,
}: {
  media?: ListingReviewMediaAsset[] | null;
}) {
  const items = Array.isArray(media) ? [...media].sort((a, b) => a.sort_order - b.sort_order) : [];
  const [imageOpen, setImageOpen] = useState<string | null>(null);

  if (!items.length) return null;

  return (
    <>
      <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {items.map((item) => (
          <div
            key={item.id}
            className="w-[82vw] max-w-[22rem] shrink-0 snap-start overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50"
          >
            {item.media_type === "image" ? (
              <button
                type="button"
                onClick={() => setImageOpen(item.secure_url)}
                className="block w-full text-left"
                aria-label="Open review image"
              >
                <img
                  src={item.secure_url}
                  alt="Review media"
                  className="h-64 w-full object-cover transition-opacity hover:opacity-95"
                  loading="lazy"
                />
              </button>
            ) : (
              <video
                className="h-64 w-full bg-black object-cover"
                controls
                preload="none"
                playsInline
                src={item.secure_url}
              >
                Your browser does not support video playback.
              </video>
            )}
          </div>
        ))}
      </div>

      {imageOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Review image preview"
          onClick={() => setImageOpen(null)}
        >
          <button
            type="button"
            onClick={() => setImageOpen(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white backdrop-blur hover:bg-white/20"
            aria-label="Close image preview"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={imageOpen}
            alt="Review media preview"
            className="max-h-[90vh] max-w-[94vw] rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}

import { useState } from "react";
import { Play, X } from "lucide-react";

export type ReviewMediaItem = {
  id: number;
  media_type: "image" | "video";
  url: string;
};

type Props = {
  media: ReviewMediaItem[];
};

export default function ReviewMediaGallery({ media }: Props) {
  const [imageOpen, setImageOpen] = useState<ReviewMediaItem | null>(null);

  if (!media.length) return null;

  return (
    <>
      <div className="mt-4 overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div className="flex w-max gap-3">
          {media.map((item) => (
            <div
              key={item.id}
              className="relative h-56 w-56 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 sm:h-64 sm:w-64"
            >
              {item.media_type === "image" ? (
                <button
                  type="button"
                  onClick={() => setImageOpen(item)}
                  className="block h-full w-full text-left"
                  aria-label="Open review image"
                >
                  <img
                    src={item.url}
                    alt="Review media"
                    loading="lazy"
                    className="h-full w-full object-cover transition-opacity hover:opacity-95"
                  />
                </button>
              ) : (
                <>
                  <video
                    controls
                    preload="none"
                    playsInline
                    className="h-full w-full object-cover"
                    src={item.url}
                  >
                    Your browser does not support video playback.
                  </video>
                  <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white">
                    <Play className="h-3 w-3 fill-current" />
                    Video
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
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
            src={imageOpen.url}
            alt="Review media preview"
            className="max-h-[90vh] max-w-[94vw] rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}

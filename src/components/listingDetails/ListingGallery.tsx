import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Share2 } from "lucide-react";
import { getListingImageUrl } from "../../lib/imageUrl";

function FullscreenToggleIcon({ isFullscreen }: { isFullscreen: boolean }) {
  return (
    <span className="relative h-5 w-5">
      <Maximize2
        className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-out ${
          isFullscreen ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        }`}
      />
      <Minimize2
        className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-out ${
          isFullscreen ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
        }`}
      />
    </span>
  );
}

function ImageShimmer({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden bg-white ${className}`}
    >
      <div className="absolute inset-y-0 -left-1/2 w-1/2 animate-[listing-gallery-shimmer_1.25s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-zinc-100 to-transparent" />
    </div>
  );
}

type ListingGalleryProps = {
  listingName: string;
  galleryImages: string[];
  currentGalleryIndex: number;
  currentImage: string;
  videoUrl?: string | null;
  isFullscreen: boolean;
  actionsMenu: ReactNode;
  onShare: () => void;
  onOpenFullscreen: () => void;
  onCloseFullscreen: () => void;
  onPrevImage: () => void;
  onNextImage: () => void;
  onSelectImage: (index: number) => void;
};

export default function ListingGallery({
  listingName,
  galleryImages,
  currentGalleryIndex,
  currentImage,
  videoUrl,
  isFullscreen,
  actionsMenu,
  onShare,
  onOpenFullscreen,
  onCloseFullscreen,
  onPrevImage,
  onNextImage,
  onSelectImage,
}: ListingGalleryProps) {
  const showThumbRail = galleryImages.length > 1;
  const [mainImageLoading, setMainImageLoading] = useState(Boolean(currentImage));
  const [fullscreenImageLoading, setFullscreenImageLoading] = useState(Boolean(currentImage));
  const fullscreenHistoryActiveRef = useRef(false);
  const closeFullscreenRef = useRef(onCloseFullscreen);

  useEffect(() => {
    closeFullscreenRef.current = onCloseFullscreen;
  }, [onCloseFullscreen]);

  useEffect(() => {
    setMainImageLoading(Boolean(currentImage));
    setFullscreenImageLoading(Boolean(currentImage));
  }, [currentImage]);

  useEffect(() => {
    if (!currentImage) return;

    const preload = (url: string | undefined) => {
      if (!url) return;
      const image = new Image();
      image.decoding = "async";
      image.src = getListingImageUrl(url, "fullscreen");
    };

    preload(galleryImages[currentGalleryIndex - 1]);
    preload(galleryImages[currentGalleryIndex + 1]);
  }, [currentGalleryIndex, currentImage, galleryImages]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      if (!fullscreenHistoryActiveRef.current) return;
      fullscreenHistoryActiveRef.current = false;
      closeFullscreenRef.current();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isFullscreen && !fullscreenHistoryActiveRef.current) {
      window.history.pushState(
        { ...(window.history.state ?? null), buyMeshoFullscreen: "listing" },
        "",
        window.location.href,
      );
      fullscreenHistoryActiveRef.current = true;
      return;
    }

    if (!isFullscreen && fullscreenHistoryActiveRef.current) {
      fullscreenHistoryActiveRef.current = false;
      if (window.history.state?.buyMeshoFullscreen === "listing") {
        window.history.back();
      }
    }
  }, [isFullscreen]);

  const closeFullscreen = () => {
    if (typeof window !== "undefined" && fullscreenHistoryActiveRef.current) {
      window.history.back();
      return;
    }
    onCloseFullscreen();
  };

  const renderThumb = (url: string, idx: number, className = "") => (
    <button
      key={`${url}-${idx}`}
      type="button"
      onClick={() => onSelectImage(idx)}
      className={`relative overflow-hidden border transition-all ${
        idx === currentGalleryIndex ? "border-zinc-900" : "border-zinc-200 hover:border-zinc-400"
      } ${className}`}
      aria-label={`View image ${idx + 1}`}
    >
      <img
        src={getListingImageUrl(url, "thumbnail")}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </button>
  );

  const fullscreenOverlay = isFullscreen ? (
    <div className="fixed inset-0 z-[1000] h-[100dvh] w-screen overflow-hidden bg-black">
      <button
        type="button"
        onClick={closeFullscreen}
        className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white hover:bg-black/75 sm:right-4 sm:top-4"
        aria-label="Close fullscreen"
      >
        <FullscreenToggleIcon isFullscreen />
      </button>

      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black">
        {fullscreenImageLoading ? <ImageShimmer className="bg-zinc-950" /> : null}

        <img
          src={getListingImageUrl(currentImage, "fullscreen")}
          alt={listingName}
          loading="eager"
          decoding="async"
          onLoad={() => setFullscreenImageLoading(false)}
          onError={() => setFullscreenImageLoading(false)}
          className={`relative max-h-full max-w-full object-contain transition-opacity duration-150 ${
            fullscreenImageLoading ? "opacity-0" : "opacity-100"
          }`}
        />

        {showThumbRail ? (
          <>
            <button
              type="button"
              onClick={onPrevImage}
              className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-900 hover:bg-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onNextImage}
              className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-900 hover:bg-white"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <>
      <style>{`\n        @keyframes listing-gallery-shimmer {\n          0% { transform: translateX(0); }\n          100% { transform: translateX(400%); }\n        }\n      `}</style>

      <div className="w-full min-w-0 max-w-full">
        <div className="mb-3 flex items-center justify-start gap-2">
          <div className="shrink-0">{actionsMenu}</div>
          <button
            type="button"
            onClick={onShare}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-all hover:bg-zinc-50"
            aria-label="Share listing"
            title="Share listing"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        <div className="min-w-0">
          <div
            className={`grid min-w-0 gap-2.5 md:items-start md:gap-2 ${
              showThumbRail ? "md:grid-cols-[40px_minmax(0,1fr)]" : "md:grid-cols-1"
            }`}
          >
            {showThumbRail ? (
              <div className="hidden md:flex md:max-h-[330px] md:flex-col md:gap-1 md:overflow-y-auto md:pr-0.5">
                {galleryImages.map((url, idx) => renderThumb(url, idx, "h-9 w-9 shrink-0 rounded-md"))}
              </div>
            ) : null}

            <div
              className={`relative min-w-0 w-full max-w-full overflow-hidden rounded-xl bg-zinc-50 aspect-[4/5] max-h-[330px] lg:max-h-[350px] ${
                showThumbRail ? "" : "md:max-h-[420px] lg:max-h-[460px]"
              }`}
            >
              {mainImageLoading ? <ImageShimmer /> : null}

              <img
                src={getListingImageUrl(currentImage, "detail")}
                alt={listingName}
                loading="eager"
                decoding="async"
                onLoad={() => setMainImageLoading(false)}
                onError={() => setMainImageLoading(false)}
                className={`relative h-full w-full object-contain transition-opacity duration-150 ${
                  mainImageLoading ? "opacity-0" : "opacity-100"
                }`}
              />

              <button
                type="button"
                onClick={onOpenFullscreen}
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow transition-transform duration-200 hover:scale-105 hover:bg-white active:scale-95"
                aria-label="Open fullscreen"
              >
                <FullscreenToggleIcon isFullscreen={false} />
              </button>

              {showThumbRail ? (
                <>
                  <button
                    type="button"
                    onClick={onPrevImage}
                    className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow hover:bg-white md:hidden"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={onNextImage}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow hover:bg-white md:hidden"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1.5 text-xs font-bold text-white md:hidden">
                    {currentGalleryIndex + 1} / {galleryImages.length}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {showThumbRail ? (
          <div className="mt-3 flex gap-2 overflow-x-auto md:hidden">
            {galleryImages.map((url, idx) => renderThumb(url, idx, "h-14 w-14 shrink-0 rounded-xl"))}
          </div>
        ) : null}

        {videoUrl ? (
          <div className="mt-3">
            <div className="overflow-hidden rounded-2xl border border-blue-200 bg-black">
              <video src={videoUrl} controls className="w-full" />
            </div>
          </div>
        ) : null}
      </div>

      {typeof document !== "undefined" && fullscreenOverlay
        ? createPortal(fullscreenOverlay, document.body)
        : null}
    </>
  );
}
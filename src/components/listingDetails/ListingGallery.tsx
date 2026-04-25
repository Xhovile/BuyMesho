import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

function FullscreenToggleIcon({ isFullscreen }: { isFullscreen: boolean }) {
  return (
    <span className="relative h-5 w-5">
      <Maximize2 className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-out ${isFullscreen ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"}`} />
      <Minimize2 className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-out ${isFullscreen ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"}`} />
    </span>
  );
}

type ListingGalleryProps = {
  listingName: string;
  galleryImages: string[];
  currentGalleryIndex: number;
  currentImage: string;
  videoUrl?: string | null;
  isFullscreen: boolean;
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
  onOpenFullscreen,
  onCloseFullscreen,
  onPrevImage,
  onNextImage,
  onSelectImage,
}: ListingGalleryProps) {
  return (
    <>
      <div className="space-y-4">
        <div className="overflow-hidden border border-zinc-200 bg-white shadow-sm">
          <div className="relative bg-zinc-100">
            <div className="relative aspect-square sm:aspect-[4/3] xl:aspect-[5/4]">
              <img src={currentImage} alt={listingName} className="h-full w-full object-contain" />

              <button type="button" onClick={onOpenFullscreen} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow transition-transform duration-200 hover:scale-105 hover:bg-white active:scale-95" aria-label="Open fullscreen">
                <FullscreenToggleIcon isFullscreen={false} />
              </button>

              {galleryImages.length > 1 ? (
                <>
                  <button type="button" onClick={onPrevImage} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow hover:bg-white" aria-label="Previous image">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={onNextImage} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow hover:bg-white" aria-label="Next image">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-4 right-4 rounded-full bg-black/75 px-3 py-1.5 text-xs font-bold text-white">
                    {currentGalleryIndex + 1} / {galleryImages.length}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {galleryImages.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto border-t border-zinc-100 px-4 py-4 sm:px-5">
              {galleryImages.map((url, idx) => (
                <button key={`${url}-${idx}`} type="button" onClick={() => onSelectImage(idx)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border ${idx === currentGalleryIndex ? "border-zinc-900" : "border-zinc-200"}`}>
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          {videoUrl ? (
            <div className="border-t border-zinc-100 px-4 py-4 sm:px-5">
              <div className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-black">
                <video src={videoUrl} controls className="w-full" />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {isFullscreen ? (
        <div className="fixed inset-0 z-[90] bg-black/90 p-4 sm:p-6">
          <div className="mx-auto flex h-full max-w-7xl flex-col gap-4">
            <div className="flex items-center justify-between gap-3 text-white">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/60">Gallery</p>
                <p className="mt-1 text-lg font-black">{listingName}</p>
              </div>
              <button type="button" onClick={onCloseFullscreen} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20" aria-label="Close fullscreen">
                <FullscreenToggleIcon isFullscreen />
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-[2rem] bg-black">
              <img src={currentImage} alt={listingName} className="h-full w-full object-contain" />
              {galleryImages.length > 1 ? (
                <>
                  <button type="button" onClick={onPrevImage} className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-900 hover:bg-white" aria-label="Previous image">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={onNextImage} className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-900 hover:bg-white" aria-label="Next image">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-4 right-4 rounded-full bg-black/75 px-3 py-1.5 text-xs font-bold text-white">
                    {currentGalleryIndex + 1} / {galleryImages.length}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

import type { ChangeEvent } from "react";
import { X } from "lucide-react";

type ListingStudioMediaProps = {
  photos: string[];
  videoUrl?: string;
  uploading?: boolean;
  error?: string;
  onAddImages: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onRemovePhoto: (index: number) => void;
  onReplaceVideo: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onRemoveVideo?: () => void;
};

export default function ListingStudioMedia({
  photos,
  videoUrl = "",
  uploading = false,
  error,
  onAddImages,
  onRemovePhoto,
  onReplaceVideo,
  onRemoveVideo,
}: ListingStudioMediaProps) {
  return (
    <section className="space-y-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">Media</p>
        <h2 className="mt-1 text-lg font-black text-zinc-900">Make the listing easy to trust</h2>
        <p className="mt-1 text-sm text-zinc-500">Use clear photos and one optional product video.</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-extrabold text-zinc-800">Photos</label>
          <span className="text-xs font-bold text-zinc-400">{photos.length}/5</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {photos.map((photo, index) => (
            <div key={`${photo}-${index}`} className="group relative aspect-square overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
              <img src={photo} alt={`Listing photo ${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemovePhoto(index)}
                aria-label={`Remove listing photo ${index + 1}`}
                title="Remove photo"
                className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-white shadow-sm transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-white/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {photos.length < 5 ? (
            <label className="flex aspect-square cursor-pointer items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-center text-xs font-bold text-zinc-500 hover:bg-zinc-100">
              <input type="file" accept="image/*" multiple className="sr-only" onChange={onAddImages} disabled={uploading} />
              <span>{uploading ? "Uploading…" : "+ Add photos"}</span>
            </label>
          ) : null}
        </div>
        {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
      </div>

      <div className="space-y-3 border-t border-zinc-100 pt-5">
        <div>
          <label className="text-sm font-extrabold text-zinc-800">Product video</label>
          <p className="mt-1 text-xs text-zinc-500">Optional. A short demonstration can improve buyer confidence.</p>
        </div>

        {videoUrl ? (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-black">
            <video src={videoUrl} controls className="max-h-72 w-full object-contain" />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-zinc-800">
            <input type="file" accept="video/*" className="sr-only" onChange={onReplaceVideo} disabled={uploading} />
            {uploading ? "Uploading…" : videoUrl ? "Replace video" : "Add video"}
          </label>
          {videoUrl && onRemoveVideo ? (
            <button type="button" onClick={onRemoveVideo} className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50">
              Remove video
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

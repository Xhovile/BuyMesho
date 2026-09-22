import { Images, Upload, Video, X } from "lucide-react";

export type ReferenceImage = {
  id: string;
  file: File;
  previewUrl: string;
};

export type ReferenceUploaderProps = {
  referenceImages: ReferenceImage[];
  referenceVideo: File | null;
  referenceVideoPreviewUrl: string | null;
  referenceError: string | null;
  maxImages: number;
  formatFileSize: (bytes: number) => string;
  onAddImages: (files: FileList | null) => void;
  onRemoveImage: (id: string) => void;
  onAddVideo: (file: File | null) => void;
  onRemoveVideo: () => void;
};

export default function ReferenceUploader({
  referenceImages,
  referenceVideo,
  referenceVideoPreviewUrl,
  referenceError,
  maxImages,
  formatFileSize,
  onAddImages,
  onRemoveImage,
  onAddVideo,
  onRemoveVideo,
}: ReferenceUploaderProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-[#fffdfa] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-zinc-900">References <span className="font-normal text-zinc-500">(optional)</span></p>
          <p className="mt-0.5 text-[10px] leading-5 text-zinc-500">Upload up to 4 images and 1 video to show the style or result you have in mind.</p>
        </div>
        <Images className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#168cff]/20 bg-[#eef8ff] px-3 py-2.5 hover:border-[#168cff]/40">
          <span className="flex min-w-0 items-center gap-2">
            <Images className="h-4 w-4 shrink-0 text-[#168cff]" />
            <span className="min-w-0">
        <span className="block text-xs font-black text-zinc-900">Add images</span>
        <span className="block text-[10px] text-zinc-500">{referenceImages.length}/{maxImages} selected</span>
            </span>
          </span>
          <Upload className="h-4 w-4 shrink-0 text-[#168cff]" />
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={referenceImages.length >= maxImages}
            onChange={(event) => {
        onAddImages(event.target.files);
        event.currentTarget.value = "";
            }}
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#ff1d25]/20 bg-[#fff1f1] px-3 py-2.5 hover:border-[#ff1d25]/40">
          <span className="flex min-w-0 items-center gap-2">
            <Video className="h-4 w-4 shrink-0 text-[#ff5b61]" />
            <span className="min-w-0">
        <span className="block text-xs font-black text-zinc-900">Add video</span>
        <span className="block text-[10px] text-zinc-500">{referenceVideo ? "1/1 selected" : "0/1 selected"}</span>
            </span>
          </span>
          <Upload className="h-4 w-4 shrink-0 text-[#ff5b61]" />
          <input
            type="file"
            accept="video/*"
            className="sr-only"
            onChange={(event) => {
        onAddVideo(event.target.files?.[0] ?? null);
        event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      <p className="mt-2 text-[10px] text-zinc-400">Images and video: up to {formatFileSize(10 * 1024 * 1024)} each.</p>

      {referenceImages.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {referenceImages.map((item, index) => (
            <div key={item.id} className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
        <img src={item.previewUrl} alt={`Reference ${index + 1}`} className="aspect-square w-full object-cover" />
        <button
          type="button"
          onClick={() => onRemoveImage(item.id)}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black/80"
          aria-label={`Remove reference image ${index + 1}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
            </div>
          ))}
        </div>
      ) : null}

      {referenceVideo && referenceVideoPreviewUrl ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <video src={referenceVideoPreviewUrl} controls preload="metadata" className="max-h-64 w-full bg-black" />
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
        <p className="truncate text-[11px] font-bold text-zinc-800">{referenceVideo.name}</p>
        <p className="text-[10px] text-zinc-400">{formatFileSize(referenceVideo.size)}</p>
            </div>
            <button
        type="button"
        onClick={onRemoveVideo}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
        aria-label="Remove reference video"
            >
        <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {referenceError ? <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-2 text-[10px] font-semibold text-red-700">{referenceError}</p> : null}
    </section>


  );
}

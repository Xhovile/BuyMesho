import { useEffect, useRef, useState } from "react";
import { Images, Upload, Video, X } from "lucide-react";

export type StudioReferenceSelection = {
  images: File[];
  video: File | null;
};

type ReferenceImage = {
  id: string;
  file: File;
  previewUrl: string;
};

const MAX_REFERENCE_IMAGES = 4;
const MAX_REFERENCE_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ReferenceUploaderProps {
  onChange: (value: StudioReferenceSelection) => void;
}

export default function ReferenceUploader({
  onChange,
}: ReferenceUploaderProps) {
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null);
  const [referenceVideoPreviewUrl, setReferenceVideoPreviewUrl] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const referenceIdCounter = useRef(0);
  const referencePreviewUrlsRef = useRef<Set<string>>(new Set());
  const referenceVideoPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      for (const url of referencePreviewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      referencePreviewUrlsRef.current.clear();

      if (referenceVideoPreviewUrlRef.current) {
        URL.revokeObjectURL(referenceVideoPreviewUrlRef.current);
        referenceVideoPreviewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    onChange({
      images: referenceImages.map((item) => item.file),
      video: referenceVideo,
    });
  }, [referenceImages, referenceVideo, onChange]);

  function addReferenceImages(files: FileList | null) {
    if (!files?.length) return;

    const incoming = Array.from(files);
    const availableSlots = MAX_REFERENCE_IMAGES - referenceImages.length;
    const accepted: ReferenceImage[] = [];
    let nextError: string | null = incoming.length > availableSlots
      ? `You can attach up to ${MAX_REFERENCE_IMAGES} images.`
      : null;

    for (const file of incoming.slice(0, Math.max(availableSlots, 0))) {
      if (!file.type.startsWith("image/")) {
        nextError = "Please choose image files for the image references.";
        continue;
      }
      if (file.size > MAX_REFERENCE_FILE_SIZE) {
        nextError = `${file.name} is larger than ${formatFileSize(MAX_REFERENCE_FILE_SIZE)}.`;
        continue;
      }
      const duplicate = referenceImages.some((item) =>
        item.file.name === file.name &&
        item.file.size === file.size &&
        item.file.lastModified === file.lastModified
      );
      if (duplicate) continue;

      const previewUrl = URL.createObjectURL(file);
      referencePreviewUrlsRef.current.add(previewUrl);
      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${referenceIdCounter.current++}`,
        file,
        previewUrl,
      });
    }

    setReferenceImages((current) => [...current, ...accepted].slice(0, MAX_REFERENCE_IMAGES));
    setReferenceError(nextError);
  }

  function removeReferenceImage(id: string) {
    setReferenceImages((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        referencePreviewUrlsRef.current.delete(target.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
    setReferenceError(null);
  }

  function addReferenceVideo(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setReferenceError("Please choose a video file for the video reference.");
      return;
    }
    if (file.size > MAX_REFERENCE_FILE_SIZE) {
      setReferenceError(`The video is larger than ${formatFileSize(MAX_REFERENCE_FILE_SIZE)}.`);
      return;
    }

    if (referenceVideoPreviewUrl) {
      URL.revokeObjectURL(referenceVideoPreviewUrl);
      referenceVideoPreviewUrlRef.current = null;
    }

    const previewUrl = URL.createObjectURL(file);
    referenceVideoPreviewUrlRef.current = previewUrl;
    setReferenceVideo(file);
    setReferenceVideoPreviewUrl(previewUrl);
    setReferenceError(null);
  }

  function removeReferenceVideo() {
    if (referenceVideoPreviewUrl) {
      URL.revokeObjectURL(referenceVideoPreviewUrl);
      referenceVideoPreviewUrlRef.current = null;
    }
    setReferenceVideo(null);
    setReferenceVideoPreviewUrl(null);
    setReferenceError(null);
  }


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
              <span className="block text-[10px] text-zinc-500">{referenceImages.length}/{MAX_REFERENCE_IMAGES} selected</span>
            </span>
          </span>
          <Upload className="h-4 w-4 shrink-0 text-[#168cff]" />
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={referenceImages.length >= MAX_REFERENCE_IMAGES}
            onChange={(event) => {
              addReferenceImages(event.target.files);
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
              addReferenceVideo(event.target.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      <p className="mt-2 text-[10px] text-zinc-400">Images and video: up to {formatFileSize(MAX_REFERENCE_FILE_SIZE)} each.</p>

      {referenceImages.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {referenceImages.map((item, index) => (
            <div key={item.id} className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
              <img src={item.previewUrl} alt={`Reference ${index + 1}`} className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => removeReferenceImage(item.id)}
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
              onClick={removeReferenceVideo}
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

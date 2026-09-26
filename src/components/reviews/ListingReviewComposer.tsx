import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Star, Trash2, Video } from "lucide-react";
import type { ListingReview, ListingReviewMedia } from "../../types";
import { apiFetch } from "../../lib/api";

type ListingReviewComposerProps = {
  listingId: number;
  isAuthenticated: boolean;
  canReview: boolean;
  existingReview?: ListingReview | null;
  onSaved?: (review: ListingReview | null) => void | Promise<void>;
  onCancel?: () => void;
};

const MAX_BODY_LENGTH = 500;
const MAX_MEDIA = 3;
const MAX_IMAGES = 3;
const MAX_VIDEOS = 1;

type NewReviewMedia = {
  file: File;
  url: string;
  media_type: "image" | "video";
};

function mediaCounts(existingMedia: ListingReviewMedia[], newMedia: NewReviewMedia[]) {
  const imageCount =
    existingMedia.filter((media) => media.media_type === "image").length +
    newMedia.filter((media) => media.media_type === "image").length;
  const videoCount =
    existingMedia.filter((media) => media.media_type === "video").length +
    newMedia.filter((media) => media.media_type === "video").length;

  return {
    total: existingMedia.length + newMedia.length,
    images: imageCount,
    videos: videoCount,
  };
}

export default function ListingReviewComposer({
  listingId,
  isAuthenticated,
  canReview,
  existingReview,
  onSaved,
  onCancel,
}: ListingReviewComposerProps) {
  const [rating, setRating] = useState<number>(existingReview?.rating ?? 0);
  const [body, setBody] = useState(existingReview?.body ?? "");
  const [existingMedia, setExistingMedia] = useState<ListingReviewMedia[]>(existingReview?.media ?? []);
  const [newMedia, setNewMedia] = useState<NewReviewMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setRating(existingReview?.rating ?? 0);
    setBody(existingReview?.body ?? "");
    setExistingMedia(existingReview?.media ?? []);
    setNewMedia((previous) => {
      previous.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setError(null);
  }, [existingReview?.id, existingReview?.rating, existingReview?.body, existingReview?.media]);

  useEffect(() => {
    return () => {
      newMedia.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [newMedia]);

  const bodyCount = body.length;
  const submitLabel = useMemo(
    () => (existingReview ? "Update review" : "Post review"),
    [existingReview]
  );

  const counts = useMemo(
    () => mediaCounts(existingMedia, newMedia),
    [existingMedia, newMedia]
  );

  const helperText = useMemo(() => {
    if (!isAuthenticated) return "Log in to leave a rating.";
    if (!canReview) return "You cannot review your own listing.";
    if (rating === 0) return "Tap a star to rate this listing.";
    return "A short review is optional.";
  }, [canReview, isAuthenticated, rating]);

  const removeNewMedia = (url: string) => {
    setNewMedia((previous) => {
      const item = previous.find((media) => media.url === url);
      if (item) URL.revokeObjectURL(item.url);
      return previous.filter((media) => media.url !== url);
    });
  };

  const removeExistingMedia = (id: number) => {
    setExistingMedia((previous) => previous.filter((media) => media.id !== id));
  };

  const handleMediaChange = (files: FileList | null) => {
    if (!files?.length) return;

    const incoming = Array.from(files);
    const incomingImages = incoming.filter((file) => file.type.startsWith("image/"));
    const incomingVideos = incoming.filter((file) => file.type.startsWith("video/"));

    if (incoming.some((file) => !file.type.startsWith("image/") && !file.type.startsWith("video/"))) {
      setError("Only image and video files can be attached.");
      return;
    }

    if (incoming.some((file) => file.type === "image/svg+xml")) {
      setError("SVG images are not supported in reviews.");
      return;
    }

    const nextImages = existingMedia.filter((media) => media.media_type === "image").length +
      newMedia.filter((media) => media.media_type === "image").length +
      incomingImages.length;
    const nextVideos = existingMedia.filter((media) => media.media_type === "video").length +
      newMedia.filter((media) => media.media_type === "video").length +
      incomingVideos.length;
    const nextTotal = existingMedia.length + newMedia.length + incoming.length;

    if (nextTotal > MAX_MEDIA) {
      setError("A review can contain up to 3 media items.");
      return;
    }
    if (nextImages > MAX_IMAGES) {
      setError("A review can contain up to 3 images.");
      return;
    }
    if (nextVideos > MAX_VIDEOS) {
      setError("A review can contain only 1 video.");
      return;
    }

    const mapped = incoming.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      media_type: file.type.startsWith("video/") ? "video" as const : "image" as const,
    }));

    setNewMedia((previous) => [...previous, ...mapped]);
    setError(null);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!isAuthenticated || !canReview) return;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError("Pick a star rating before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const requestBody = new FormData();
      requestBody.append("rating", String(rating));
      if (body.trim()) requestBody.append("body", body.trim());
      requestBody.append(
        "existingMediaIds",
        JSON.stringify(existingMedia.map((media) => media.id)),
      );
      newMedia.forEach((media) => {
        requestBody.append("media", media.file, media.file.name);
      });

      const method = existingReview ? "PUT" : "POST";
      const result = (await apiFetch(`/api/listings/${listingId}/reviews`, {
        method,
        body: requestBody,
        timeoutMs: 60_000,
      })) as { review?: ListingReview | null } | null;

      if (result?.review !== undefined) {
        setRating(result.review?.rating ?? rating);
        setBody(result.review?.body ?? body);
        setExistingMedia(result.review?.media ?? []);
        setNewMedia((previous) => {
          previous.forEach((item) => URL.revokeObjectURL(item.url));
          return [];
        });
        await onSaved?.(result.review ?? null);
      } else {
        await onSaved?.(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-400">Leave a rating</p>
          <p className="mt-1 text-sm text-zinc-500">Short and simple. The star rating matters most.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!isAuthenticated || !canReview || rating === 0 || submitting}
          className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = rating >= star;
          return (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              disabled={!isAuthenticated || !canReview || submitting}
              className={`rounded-md p-1 transition-colors ${active ? "text-amber-500" : "text-zinc-300"} ${!isAuthenticated || !canReview || submitting ? "opacity-60" : "hover:text-amber-500"}`}
              aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
            >
              <Star className={`h-7 w-7 ${active ? "fill-amber-400" : ""}`} />
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-zinc-500">{helperText}</p>

      {rating > 0 ? (
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">
              Add a short review (optional)
            </label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, MAX_BODY_LENGTH))}
              maxLength={MAX_BODY_LENGTH}
              rows={4}
              disabled={!isAuthenticated || !canReview || submitting}
              placeholder="What should other buyers know?"
              className="min-h-[120px] w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-900 outline-none transition focus:border-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-500"
            />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Media</p>
                <p className="mt-1 text-xs font-semibold text-zinc-500">Up to 3 items · max 1 video · up to 3 images.</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isAuthenticated || !canReview || submitting || counts.total >= MAX_MEDIA}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ImagePlus className="h-4 w-4" />
                Add media
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(event) => handleMediaChange(event.target.files)}
              />
            </div>

            {(existingMedia.length > 0 || newMedia.length > 0) ? (
              <div className="mt-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
                <div className="flex w-max gap-3">
                  {existingMedia.map((media) => (
                    <div key={media.id} className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                      {media.media_type === "image" ? (
                        <img src={media.url} alt="Selected review media" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <video src={media.url} preload="none" playsInline className="h-full w-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeExistingMedia(media.id)}
                        disabled={submitting}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white"
                        aria-label="Remove review media"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {media.media_type === "video" ? (
                        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white">
                          <Video className="h-3 w-3" />
                          Video
                        </span>
                      ) : null}
                    </div>
                  ))}

                  {newMedia.map((media) => (
                    <div key={media.url} className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                      {media.media_type === "image" ? (
                        <img src={media.url} alt={media.file.name} className="h-full w-full object-cover" />
                      ) : (
                        <video src={media.url} preload="none" playsInline controls className="h-full w-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeNewMedia(media.url)}
                        disabled={submitting}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white"
                        aria-label="Remove review media"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs font-semibold text-zinc-400">No media attached.</p>
            )}

            <p className="mt-3 text-xs font-semibold text-zinc-500">
              {counts.total} / {MAX_MEDIA} media · {counts.images} image{counts.images === 1 ? "" : "s"} · {counts.videos} video{counts.videos === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-500">
            <span>{bodyCount} / {MAX_BODY_LENGTH}</span>
            <span>Keep it honest and useful.</span>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}

      {onCancel ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel edit
          </button>
        </div>
      ) : null}
    </section>
  );
}

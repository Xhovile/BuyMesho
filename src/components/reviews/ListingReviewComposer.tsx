import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Star, X } from "lucide-react";
import type { ListingReview } from "../../types";
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
const MAX_MEDIA_COUNT = 3;
const MAX_VIDEO_COUNT = 1;
const MAX_MEDIA_FILE_SIZE = 10 * 1024 * 1024;

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [retainedMediaIds, setRetainedMediaIds] = useState<number[]>(existingReview?.media?.map((media) => media.id) ?? []);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const submitIdempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setRating(existingReview?.rating ?? 0);
    setBody(existingReview?.body ?? "");
    setError(null);
  }, [existingReview?.id, existingReview?.rating, existingReview?.body]);

  useEffect(() => {
    setRetainedMediaIds(existingReview?.media?.map((media) => media.id) ?? []);
    setMediaFiles([]);
    setError(null);
  }, [existingReview?.id]);

  useEffect(() => {
    const urls = mediaFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [mediaFiles]);

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const retainedMedia = existingReview?.media?.filter((media) => retainedMediaIds.includes(media.id)) ?? [];
    const nextFiles = [...mediaFiles, ...files];

    if (retainedMedia.length + nextFiles.length > MAX_MEDIA_COUNT) {
      setError("A review can contain up to 3 media files.");
      return;
    }

    const videoCount =
      retainedMedia.filter((media) => media.media_type === "video").length +
      nextFiles.filter((file) => file.type.toLowerCase().startsWith("video/")).length;
    if (videoCount > MAX_VIDEO_COUNT) {
      setError("A review can contain only 1 video.");
      return;
    }

    if (files.some((file) => file.size > MAX_MEDIA_FILE_SIZE)) {
      setError("Each review media file must be 10 MB or smaller.");
      return;
    }

    if (files.some((file) => {
      const type = file.type.toLowerCase();
      return type === "image/svg+xml" || (!type.startsWith("image/") && !type.startsWith("video/"));
    })) {
      setError("Reviews support image and video files only.");
      return;
    }

    setError(null);
    setMediaFiles(nextFiles);
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles((current) => current.filter((_, mediaIndex) => mediaIndex !== index));
  };

  const removeExistingMedia = (mediaId: number) => {
    setRetainedMediaIds((current) => current.filter((id) => id !== mediaId));
    setError(null);
  };

  const bodyCount = body.length;
  const submitLabel = useMemo(() => {
    if (existingReview) return "Update review";
    return "Post review";
  }, [existingReview]);

  const helperText = useMemo(() => {
    if (!isAuthenticated) return "Log in to leave a rating.";
    if (!canReview) return "You cannot review your own listing.";
    if (rating === 0) return "Tap a star to rate this listing.";
    return "A short review is optional.";
  }, [canReview, isAuthenticated, rating]);

  const handleSubmit = async () => {
    if (!isAuthenticated || !canReview) return;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError("Pick a star rating before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const idempotencyKey =
      submitIdempotencyKeyRef.current ??
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `review-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    submitIdempotencyKeyRef.current = idempotencyKey;

    try {
      const method = existingReview ? "PUT" : "POST";
      const requestBody = existingReview || mediaFiles.length
        ? (() => {
            const formData = new FormData();
            formData.append("rating", String(rating));
            formData.append("body", body.trim());
            if (existingReview) {
              formData.append("existingMediaIds", JSON.stringify(retainedMediaIds));
            }
            mediaFiles.forEach((file) => formData.append("media", file, file.name));
            return formData;
          })()
        : JSON.stringify({
            rating,
            body: body.trim() || null,
          });

      const review = (await apiFetch(`/api/listings/${listingId}/reviews`, {
        method,
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: requestBody,
        timeoutMs: 120_000,
      })) as { review?: ListingReview | null } | null;

      submitIdempotencyKeyRef.current = null;

      if (review?.review !== undefined) {
        setRating(review.review?.rating ?? rating);
        setBody(review.review?.body ?? body);
        setRetainedMediaIds(review.review?.media?.map((media) => media.id) ?? []);
        setMediaFiles([]);
        try {
          await onSaved?.(review.review ?? null);
        } catch (refreshError) {
          console.warn("Review saved successfully, but refreshing the review feed failed:", refreshError);
        }
      } else {
        try {
          await onSaved?.(null);
        } catch (refreshError) {
          console.warn("Review saved successfully, but refreshing the review feed failed:", refreshError);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit your review. Please try again.";
      if (/request timed out/i.test(message) || /fetch/i.test(message)) {
        setError("Failed to submit your review. Please try again.");
      } else {
        setError(message);
      }
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
        <div className="mt-4 space-y-3">
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

          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-500">
            <span>
              {bodyCount} / {MAX_BODY_LENGTH}
            </span>
            <span>Keep it honest and useful.</span>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Media (optional)</p>
                <p className="mt-1 text-xs font-semibold text-zinc-500">Up to 3 total files, with only 1 video.</p>
              </div>
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                disabled={!isAuthenticated || !canReview || submitting}
                className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-bold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add media
              </button>
              <input
                ref={mediaInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaChange}
                className="hidden"
              />
            </div>

            {retainedMediaIds.length ? (
              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-zinc-500">Current media</p>
                <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
                  {(existingReview?.media ?? []).filter((media) => retainedMediaIds.includes(media.id)).map((media) => (
                    <div key={media.id} className="relative w-28 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-black">
                      {media.media_type === "image" ? (
                        <img src={media.url} alt="Current review media" className="h-24 w-full object-cover" loading="lazy" />
                      ) : (
                        <video src={media.url} className="h-24 w-full object-cover" preload="none" muted playsInline />
                      )}
                      <button
                        type="button"
                        onClick={() => removeExistingMedia(media.id)}
                        disabled={submitting}
                        className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-white"
                        aria-label="Remove current review media"
                        title="Remove media"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {previewUrls.length ? (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {previewUrls.map((url, index) => {
                  const file = mediaFiles[index];
                  if (!file) return null;
                  const isVideo = file.type.toLowerCase().startsWith("video/");
                  return (
                    <div key={url} className="relative w-32 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-black">
                      {isVideo ? (
                        <video src={url} className="h-24 w-full object-cover" preload="metadata" muted playsInline />
                      ) : (
                        <img src={url} alt={file.name} className="h-24 w-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMediaFile(index)}
                        disabled={submitting}
                        className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
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

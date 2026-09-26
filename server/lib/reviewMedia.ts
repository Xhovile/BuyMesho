export type ReviewMediaType = "image" | "video";

export const REVIEW_MEDIA_MAX_COUNT = 3;
export const REVIEW_MEDIA_MAX_VIDEOS = 1;
export const REVIEW_MEDIA_MAX_FILE_SIZE = 10 * 1024 * 1024;

export function getReviewMediaType(mime: string): ReviewMediaType | null {
  const normalized = String(mime || "").trim().toLowerCase();
  if (!normalized || normalized === "image/svg+xml") return null;
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("video/")) return "video";
  return null;
}

export function validateReviewMediaFiles(
  files: Array<{ mimetype?: string; size?: number }>,
): string | null {
  if (files.length > REVIEW_MEDIA_MAX_COUNT) {
    return `A review can contain up to ${REVIEW_MEDIA_MAX_COUNT} media files.`;
  }

  let videoCount = 0;

  for (const file of files) {
    if (typeof file.size === "number" && file.size > REVIEW_MEDIA_MAX_FILE_SIZE) {
      return "Each review media file must be 10 MB or smaller.";
    }

    const mediaType = getReviewMediaType(file.mimetype || "");
    if (!mediaType) {
      return "Reviews support image and video files only.";
    }

    if (mediaType === "video") videoCount += 1;
  }

  if (videoCount > REVIEW_MEDIA_MAX_VIDEOS) {
    return "A review can contain only 1 video.";
  }

  return null;
}

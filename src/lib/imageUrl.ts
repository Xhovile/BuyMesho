export type ListingImageRole = "thumbnail" | "card" | "detail" | "fullscreen";

export const LISTING_IMAGE_PRESETS: Record<
  ListingImageRole,
  { width: number; quality: string }
> = {
  thumbnail: { width: 160, quality: "auto:low" },
  card: { width: 480, quality: "auto:eco" },
  detail: { width: 1400, quality: "auto:good" },
  fullscreen: { width: 2200, quality: "auto:best" },
};

function transformCloudinaryUrl(
  src: string | null | undefined,
  transformation: string,
) {
  if (!src) return "";
  if (!src.includes("res.cloudinary.com") || !src.includes("/upload/")) {
    return src;
  }
  return src.replace("/upload/", `/upload/${transformation}/`);
}

export function getListingImageUrl(
  src: string | null | undefined,
  role: ListingImageRole,
) {
  const preset = LISTING_IMAGE_PRESETS[role];
  return transformCloudinaryUrl(
    src,
    `f_auto,q_${preset.quality},w_${preset.width},c_limit`,
  );
}

export function getListingImagePlaceholderUrl(src: string | null | undefined) {
  if (!src) return "";
  if (!src.includes("res.cloudinary.com") || !src.includes("/upload/")) {
    return "";
  }
  return transformCloudinaryUrl(src, "f_auto,q_25,w_48,c_fill,e_blur:120");
}

// Backward-compatible helpers for callers not yet migrated to getListingImageUrl.
export const getOptimizedImageUrl = (src: string | null | undefined, width = 540) =>
  transformCloudinaryUrl(src, `f_auto,q_auto,w_${width},c_limit`);
export const getListingCardImageUrl = (src: string | null | undefined) =>
  getListingImageUrl(src, "card");
export const getListingGalleryThumbUrl = (src: string | null | undefined) =>
  getListingImageUrl(src, "thumbnail");
export const getListingDetailImageUrl = (src: string | null | undefined) =>
  getListingImageUrl(src, "detail");
export const getListingFullscreenImageUrl = (src: string | null | undefined) =>
  getListingImageUrl(src, "fullscreen");

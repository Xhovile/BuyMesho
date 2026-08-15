export const LISTING_IMAGE_WIDTHS = {
  card: 480,
  galleryThumb: 160,
  detail: 1400,
  fullscreen: 2200,
} as const;

export function getOptimizedImageUrl(src: string | null | undefined, width = 540) {
  if (!src) return "";

  // Cloudinary can resize/encode on the fly. Leave non-Cloudinary URLs untouched.
  if (!src.includes("res.cloudinary.com") || !src.includes("/upload/")) {
    return src;
  }

  const transformation = `f_auto,q_auto,w_${width},c_limit`;
  return src.replace("/upload/", `/upload/${transformation}/`);
}

export function getListingCardImageUrl(src: string | null | undefined) {
  return getOptimizedImageUrl(src, LISTING_IMAGE_WIDTHS.card);
}

export function getListingGalleryThumbUrl(src: string | null | undefined) {
  return getOptimizedImageUrl(src, LISTING_IMAGE_WIDTHS.galleryThumb);
}

export function getListingDetailImageUrl(src: string | null | undefined) {
  return getOptimizedImageUrl(src, LISTING_IMAGE_WIDTHS.detail);
}

export function getListingFullscreenImageUrl(src: string | null | undefined) {
  return getOptimizedImageUrl(src, LISTING_IMAGE_WIDTHS.fullscreen);
}

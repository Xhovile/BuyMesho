export function getOptimizedImageUrl(src: string | null | undefined, width = 720) {
  if (!src) return "";

  // Cloudinary can resize/encode on the fly. Leave non-Cloudinary URLs untouched.
  if (!src.includes("res.cloudinary.com") || !src.includes("/upload/")) {
    return src;
  }

  const transformation = `f_auto,q_auto,w_${width},c_limit`;
  return src.replace("/upload/", `/upload/${transformation}/`);
}

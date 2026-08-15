import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  BookOpen,
  Camera,
  Home,
  Package,
  Sparkles,
  Smartphone,
  Shirt,
  Utensils,
} from "lucide-react";
import { getListingImagePlaceholderUrl } from "../lib/imageUrl";

type ListingImageProps = {
  src?: string | null;
  placeholderSrc?: string | null;
  alt: string;
  category?: string | null;
  subcategory?: string | null;
  className?: string;
  performanceMode?: boolean;
};

type IconType = ElementType;

function getCategoryValue(category?: string | null, subcategory?: string | null) {
  return `${category ?? ""} ${subcategory ?? ""}`.trim().toLowerCase();
}

function getFallbackIcon(category?: string | null, subcategory?: string | null): IconType {
  const value = getCategoryValue(category, subcategory);

  if (/beauty|personal care|cosmetic|skin|hair|perfume|fragrance|makeup/.test(value)) return Sparkles;
  if (/fashion|cloth|apparel|shoe|bag|jacket|jean|sweater|dress/.test(value)) return Shirt;
  if (/academic|book|stationery|notebook|study|school|education/.test(value)) return BookOpen;
  if (/food|snack|drink|restaurant|eatery|beverage|grocery/.test(value)) return Utensils;
  if (/phone|gadget|electronic|computer|laptop|camera|tablet|charger|earphone/.test(value)) return Smartphone;
  if (/home|furniture|kitchen|household|decor/.test(value)) return Home;
  if (/service|package|delivery|wholesale|product/.test(value)) return Package;

  return Camera;
}

function getBackdropClass(category?: string | null, subcategory?: string | null) {
  const value = getCategoryValue(category, subcategory);

  if (/beauty|personal care|cosmetic|skin|hair|perfume|fragrance|makeup/.test(value)) return "bg-gradient-to-br from-rose-50 via-white to-zinc-100";
  if (/fashion|cloth|apparel|shoe|bag|jacket|jean|sweater|dress/.test(value)) return "bg-gradient-to-br from-fuchsia-50 via-white to-zinc-100";
  if (/academic|book|stationery|notebook|study|school|education/.test(value)) return "bg-gradient-to-br from-sky-50 via-white to-zinc-100";
  if (/food|snack|drink|restaurant|eatery|beverage|grocery/.test(value)) return "bg-gradient-to-br from-amber-50 via-white to-zinc-100";
  if (/phone|gadget|electronic|computer|laptop|camera|tablet|charger|earphone/.test(value)) return "bg-gradient-to-br from-indigo-50 via-white to-zinc-100";
  if (/home|furniture|kitchen|household|decor/.test(value)) return "bg-gradient-to-br from-emerald-50 via-white to-zinc-100";
  if (/service|package|delivery|wholesale|product/.test(value)) return "bg-gradient-to-br from-slate-100 via-white to-zinc-100";

  return "bg-gradient-to-br from-zinc-100 via-white to-zinc-200";
}

export default function ListingImage({
  src,
  placeholderSrc,
  alt,
  category,
  subcategory,
  className = "h-full w-full object-cover",
  performanceMode = false,
}: ListingImageProps) {
  const normalizedSrc = typeof src === "string" ? src.trim() : "";
  const normalizedPlaceholderSrc = typeof placeholderSrc === "string" ? placeholderSrc.trim() : "";
  const [failed, setFailed] = useState(!normalizedSrc);
  const [loaded, setLoaded] = useState(false);

  const lqipSrc = useMemo(
    () => getListingImagePlaceholderUrl(normalizedPlaceholderSrc || normalizedSrc),
    [normalizedPlaceholderSrc, normalizedSrc],
  );

  useEffect(() => {
    setFailed(!normalizedSrc);
    setLoaded(false);
  }, [normalizedSrc]);

  const FallbackIcon = useMemo(
    () => getFallbackIcon(category, subcategory),
    [category, subcategory],
  );
  const backdropClass = useMemo(
    () => getBackdropClass(category, subcategory),
    [category, subcategory],
  );

  const showFallback = failed || !normalizedSrc;

  return (
    <div className={`relative h-full w-full overflow-hidden ${backdropClass}`}>
      {showFallback ? (
        <div
          aria-label={alt ? `No image available for ${alt}` : "No image available"}
          className="absolute inset-0 flex h-full w-full flex-col items-center justify-center text-zinc-400"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/80 bg-white/75 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:h-16 sm:w-16">
            <FallbackIcon className="h-7 w-7 text-zinc-400 sm:h-8 sm:w-8" strokeWidth={1.65} />
          </div>
          <span className="mt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400">
            No image
          </span>
        </div>
      ) : (
        <>
          {lqipSrc ? (
            <img
              src={lqipSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-[1.02] object-cover blur-[1px]"
              decoding="async"
            />
          ) : null}

          <img
            src={normalizedSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`${className} relative ${performanceMode ? "" : "transition-opacity duration-300 ease-out"} ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        </>
      )}
    </div>
  );
}

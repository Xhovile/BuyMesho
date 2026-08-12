import { useEffect, useMemo, useState } from "react";
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

type ListingImageProps = {
  src?: string | null;
  alt: string;
  category?: string | null;
  subcategory?: string | null;
  className?: string;
  performanceMode?: boolean;
};

type IconType = typeof Camera;

function getFallbackIcon(category?: string | null, subcategory?: string | null): IconType {
  const value = `${category ?? ""} ${subcategory ?? ""}`.trim().toLowerCase();

  if (/beauty|personal care|cosmetic|skin|hair|perfume|fragrance|makeup/.test(value)) return Sparkles;
  if (/fashion|cloth|apparel|shoe|bag|jacket|jean|sweater|dress/.test(value)) return Shirt;
  if (/academic|book|stationery|notebook|study|school|education/.test(value)) return BookOpen;
  if (/food|snack|drink|restaurant|eatery|beverage|grocery/.test(value)) return Utensils;
  if (/phone|gadget|electronic|computer|laptop|camera|tablet|charger|earphone/.test(value)) return Smartphone;
  if (/home|furniture|kitchen|household|decor/.test(value)) return Home;
  if (/service|package|delivery|wholesale|product/.test(value)) return Package;

  return Camera;
}

export default function ListingImage({
  src,
  alt,
  category,
  subcategory,
  className = "h-full w-full object-cover",
  performanceMode = false,
}: ListingImageProps) {
  const normalizedSrc = typeof src === "string" ? src.trim() : "";
  const [loading, setLoading] = useState(Boolean(normalizedSrc));
  const [failed, setFailed] = useState(!normalizedSrc);

  useEffect(() => {
    setLoading(Boolean(normalizedSrc));
    setFailed(!normalizedSrc);
  }, [normalizedSrc]);

  const FallbackIcon = useMemo(
    () => getFallbackIcon(category, subcategory),
    [category, subcategory]
  );

  const showFallback = failed || !normalizedSrc;

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-100">
      {showFallback ? (
        <div
          aria-label={alt ? `No image available for ${alt}` : "No image available"}
          className="absolute inset-0 flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-100 via-white to-zinc-200 text-zinc-400"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white/80 shadow-sm sm:h-16 sm:w-16">
            <FallbackIcon className="h-7 w-7 text-zinc-400 sm:h-8 sm:w-8" strokeWidth={1.7} />
          </div>
          <span className="mt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400">
            No image
          </span>
        </div>
      ) : (
        <>
          {loading ? (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-200" aria-hidden="true">
              <div className="flex h-full items-center justify-center">
                <div className="h-12 w-12 rounded-2xl border border-zinc-200/80 bg-white/55 shadow-sm" />
              </div>
            </div>
          ) : null}

          <img
            src={normalizedSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            className={`${className} ${loading ? "opacity-0" : "opacity-100"} ${performanceMode ? "" : "transition-opacity duration-200"}`}
          />
        </>
      )}
    </div>
  );
}

import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { navigateToListingDetails, navigateToSellerProfile } from "../../lib/appNavigation";

type ListingPreview = {
  id: number | string;
  name: string;
  price: number | string;
  description?: string | null;
  photos?: string[];
  category?: string;
  university?: string;
  business_name?: string | null;
  seller_uid?: string | null;
  is_verified?: boolean;
};

type Props = {
  item: ListingPreview;
  categoryLabel: string;
};

export default function CategoryListingCard({ item, categoryLabel }: Props) {
  const sellerName = item.business_name?.trim() || "Seller";
  const handleOpenSeller = () => {
    if (item.seller_uid) navigateToSellerProfile(item.seller_uid);
  };

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white shadow-[0_10px_30px_rgba(24,24,27,0.06)] transition-all hover:shadow-[0_16px_46px_rgba(24,24,27,0.12)]">
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <button type="button" onClick={handleOpenSeller} className="min-w-0 text-left">
          <div className="inline-flex items-center gap-1.5 min-w-0">
            <p className="truncate text-sm font-bold text-zinc-800">{sellerName}</p>
            {item.is_verified ? <ShieldCheck className="w-3.5 h-3.5 shrink-0 fill-blue-50 text-blue-500" /> : null}
          </div>
          <p className="text-[10px] font-medium text-zinc-400">Open seller page</p>
        </button>

        <span className="shrink-0 truncate rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold text-zinc-600 max-w-[120px]">
          {item.university || "Unknown campus"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => navigateToListingDetails(item.id)}
        className="relative mt-3 block w-full overflow-hidden bg-zinc-100 aspect-[4/5] focus:outline-none"
      >
        <img
          src={item.photos?.[0] || `https://picsum.photos/seed/${item.id}/600/750`}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-700 shadow-sm">
          {categoryLabel}
        </div>

        <div className="absolute bottom-3 left-3 rounded-xl border border-white/20 bg-white/92 px-3 py-1.5 text-sm font-extrabold text-zinc-900 shadow-sm backdrop-blur-md">
          MK {Number(item.price).toLocaleString()}
        </div>
      </button>

      <div className="space-y-3 px-4 py-4">
        <h3 className="line-clamp-1 text-[17px] font-bold tracking-tight text-zinc-900 group-hover:text-primary">
          {item.name}
        </h3>

        <p className="line-clamp-2 min-h-[2.75rem] text-sm leading-relaxed text-zinc-500">
          {item.description || "Tap to open the full listing details."}
        </p>

        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/5 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
            {item.category || categoryLabel}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider bg-zinc-100 text-zinc-600">
            <MapPin className="w-3.5 h-3.5" />
            {item.university || "Campus"}
          </span>
        </div>

        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-700">
          Open listing
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </article>
  );
}

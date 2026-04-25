import type { ReactNode } from "react";
import { SectionHeading } from "./ListingDetailsShared";

export default function ListingDetailsBlock({
  description,
  sellerNote,
  deliveryNote,
}: {
  description: ReactNode;
  sellerNote: ReactNode;
  deliveryNote: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Details"
        title="About this listing"
        description="The description, seller note, and delivery guidance stay in one continuous block so the page reads like a premium product page, not a dashboard."
      />

      <div className="space-y-5 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="space-y-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Listing description</p>
          <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-600">{description}</p>
        </div>

        <div className="border-t border-zinc-200 pt-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Seller note</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-600">{sellerNote}</p>
        </div>

        <div className="border-t border-zinc-200 pt-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Delivery and collection</p>
          <p className="mt-3 text-sm leading-7 text-zinc-600">{deliveryNote}</p>
        </div>
      </div>
    </div>
  );
}

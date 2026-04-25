import type { Listing } from "../../types";
import { SectionHeading } from "./ListingDetailsShared";

export type ListingSpecsGroup = {
  title: string;
  rows: Array<{ key: string; label: string; value: string }>;
};

export default function ListingSpecsBlock({ groups }: { groups: ListingSpecsGroup[] }) {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Specs"
        title="Structured specifications"
        description="The grouped spec model stays exactly as-is. It is visible, organized, and not collapsible."
      />

      <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
        {groups.length ? (
          <div className="space-y-8">
            {groups.map((group, index) => (
              <div key={group.title} className={index === 0 ? '' : 'border-t border-zinc-200 pt-6'}>
                <h3 className="text-lg font-black tracking-tight text-zinc-900">{group.title}</h3>
                <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                  {group.rows.map((row) => (
                    <div key={row.key} className="space-y-1 border-b border-zinc-100 pb-3">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{row.label}</dt>
                      <dd className="text-sm font-semibold text-zinc-900">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
            No grouped specs are available for this listing.
          </div>
        )}
      </div>
    </div>
  );
}

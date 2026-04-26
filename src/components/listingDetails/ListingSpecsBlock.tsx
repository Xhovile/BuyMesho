import type { Listing } from "../../types";

export type ListingSpecsGroup = {
  title: string;
  rows: Array<{ key: string; label: string; value: string }>;
};

function SpecAccordion({
  group,
  defaultOpen = false,
}: {
  group: ListingSpecsGroup;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold tracking-tight text-zinc-900 sm:text-lg">{group.title}</h3>
          <p className="mt-1 text-xs font-medium text-zinc-500">
            {group.rows.length} {group.rows.length === 1 ? "detail" : "details"}
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 transition-transform duration-200 group-open:rotate-180">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
            <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>

      <div className="border-t border-zinc-200 px-5 py-5 sm:px-6">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          {group.rows.map((row) => (
            <div key={row.key} className="space-y-1 border-b border-zinc-100 pb-3 last:border-b-0 sm:last:border-b sm:pb-0">
              <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{row.label}</dt>
              <dd className="text-sm font-semibold text-zinc-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}

export default function ListingSpecsBlock({ groups }: { groups: ListingSpecsGroup[] }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">Product details</h2>

      {groups.length ? (
        <div className="space-y-4">
          {groups.map((group, index) => (
            <SpecAccordion key={group.title} group={group} defaultOpen={index === 0} />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-zinc-200 bg-white px-4 py-5 text-sm text-zinc-500 shadow-sm">
          No grouped specs are available for this listing.
        </div>
      )}
    </div>
  );
}

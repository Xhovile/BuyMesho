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
      className="group rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-zinc-50 to-white shadow-sm ring-1 ring-blue-100/60 transition-shadow hover:shadow-md"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold tracking-tight text-blue-800 sm:text-lg">{group.title}</h3>
          <p className="mt-1 text-xs font-medium text-blue-700/60">
            {group.rows.length} {group.rows.length === 1 ? "detail" : "details"}
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 transition-transform duration-200 group-open:rotate-180">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
            <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>

      <div className="border-t border-blue-100 px-5 py-5 sm:px-6">
        <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {group.rows.map((row) => (
            <div key={row.key} className="rounded-2xl border border-blue-100 bg-white px-3 py-3 sm:px-4">
              <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700/60">{row.label}</dt>
              <dd className="mt-1 text-sm font-semibold text-blue-950">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}

export default function ListingSpecsBlock({ groups }: { groups: ListingSpecsGroup[] }) {
  const leftColumnGroups = groups.filter((_, index) => index % 2 === 0);
  const rightColumnGroups = groups.filter((_, index) => index % 2 === 1);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">Product details</h2>

      {groups.length ? (
        <>
          <div className="space-y-4 md:hidden">
            {groups.map((group, index) => (
              <SpecAccordion key={group.title} group={group} defaultOpen={index === 0} />
            ))}
          </div>

          <div className="hidden md:grid md:grid-cols-2 md:gap-4">
            <div className="space-y-4">
              {leftColumnGroups.map((group, index) => (
                <SpecAccordion key={group.title} group={group} defaultOpen={index === 0} />
              ))}
            </div>
            <div className="space-y-4">
              {rightColumnGroups.map((group) => (
                <SpecAccordion key={group.title} group={group} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-blue-200 bg-white px-4 py-5 text-sm text-blue-700/70 shadow-sm">
          No grouped specs are available for this listing.
        </div>
      )}
    </div>
  );
}

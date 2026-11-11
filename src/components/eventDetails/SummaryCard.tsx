export default function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-bm-border bg-bm-surface px-4 py-4 shadow-sm shadow-zinc-200/20">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-bm-text-subtle">{label}</p>
      <p className="mt-1 break-words text-sm font-black tracking-tight text-bm-text">{value}</p>
    </div>
  );
}

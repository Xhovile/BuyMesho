export default function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-zinc-200 bg-white px-4 py-4 shadow-sm shadow-zinc-200/20">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black tracking-tight text-zinc-950">{value}</p>
    </div>
  );
}

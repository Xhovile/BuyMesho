export default function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-zinc-200/70 py-4 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6 sm:py-5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="min-w-0 whitespace-pre-line break-words text-sm font-semibold leading-relaxed text-zinc-950">{value}</p>
    </div>
  );
}

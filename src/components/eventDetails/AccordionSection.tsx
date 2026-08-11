import { type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export default function AccordionSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-zinc-50 sm:px-6"
      >
        <div>
          <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-zinc-950">{title}</h2>
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="border-t border-zinc-200/70 px-5 sm:px-6">{children}</div> : null}
    </section>
  );
}

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
    <section className="overflow-hidden rounded-[1.75rem] border border-bm-border bg-bm-surface">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-bm-surface-subtle sm:px-6"
      >
        <div>
          <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-bm-text">{title}</h2>
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-bm-text-subtle transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="border-t border-bm-border/70 px-5 sm:px-6">{children}</div> : null}
    </section>
  );
}

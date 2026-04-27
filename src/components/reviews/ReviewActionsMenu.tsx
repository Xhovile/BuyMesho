import { useEffect, useRef, useState } from "react";
import { Flag, MoreVertical } from "lucide-react";

type ReviewActionsMenuProps = {
  canReport?: boolean;
  onReport?: () => void;
};

export default function ReviewActionsMenu({ canReport = false, onReport }: ReviewActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (wrapperRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  if (!canReport && !onReport) return null;

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50"
        aria-label="Review actions"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onReport?.();
            }}
            disabled={!canReport}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Flag className="h-4 w-4" />
            Report review
          </button>
        </div>
      ) : null}
    </div>
  );
}

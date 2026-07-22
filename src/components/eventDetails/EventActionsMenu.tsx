import { useEffect, useRef, useState } from "react";
import { Flag, Link2, MoreVertical, Pencil, Share2, Trash2 } from "lucide-react";

import { EVENTS_CREATE_PATH, EVENTS_PATH, REPORT_PATH, navigateBackOrPath, navigateToPath } from "../../lib/appNavigation";
import { apiFetch } from "../../lib/api";

type EventActionsMenuProps = {
  eventId: number;
  eventTitle: string;
  shareUrl: string;
};

export default function EventActionsMenu({ eventId, eventTitle, shareUrl }: EventActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (wrapperRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClick);
    };
  }, [open]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: eventTitle, text: eventTitle, url: shareUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Keep silent; sharing is optional.
    } finally {
      setOpen(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      window.alert("Could not copy the event link.");
    } finally {
      setOpen(false);
    }
  };

  const handleEdit = () => {
    setOpen(false);
    navigateToPath(`${EVENTS_CREATE_PATH}?edit=${eventId}`);
  };

  const handleReport = () => {
    setOpen(false);
    navigateToPath(REPORT_PATH);
  };

  const handleDelete = async () => {
    setOpen(false);
    const confirmed = window.confirm(`Delete "${eventTitle}"? This can be undone only by restoring it later.`);
    if (!confirmed) return;

    setBusy(true);
    try {
      await apiFetch(`/api/events/${eventId}`, { method: "DELETE" });
      navigateBackOrPath(EVENTS_PATH);
    } catch (error: any) {
      window.alert(error?.message || "Could not delete the event.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (busy) return;
          setOpen((value) => !value);
        }}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Event actions"
        aria-expanded={open}
        disabled={busy}
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <button type="button" onClick={handleEdit} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
            <Pencil className="h-4 w-4" />
            Edit event
          </button>
          <button type="button" onClick={handleShare} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
            <Share2 className="h-4 w-4" />
            Share event
          </button>
          <button type="button" onClick={handleCopyLink} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
            <Link2 className="h-4 w-4" />
            Copy link
          </button>
          <button type="button" onClick={handleReport} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
            <Flag className="h-4 w-4" />
            Report event
          </button>
          <button type="button" onClick={handleDelete} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
            Delete event
          </button>
        </div>
      ) : null}
    </div>
  );
}

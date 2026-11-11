import { useEffect, useRef, useState } from "react";
import { Ban, Flag, MoreVertical, OctagonAlert, Trash2 } from "lucide-react";
import type { MessageBlockScope } from "../../types";

export interface ConversationActionsMenuProps {
  onDelete?: () => void;
  onBlock?: (scope?: MessageBlockScope) => void;
  onUnblock?: () => void;
  onReport?: () => void;
  onSpam?: () => void;
  blockedByYou?: boolean;
  blockedByOther?: boolean;
  className?: string;
}

export default function ConversationActionsMenu({
  onDelete,
  onBlock,
  onUnblock,
  onReport,
  onSpam,
  blockedByYou = false,
  blockedByOther = false,
  className = "",
}: ConversationActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, []);

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-bm-border bg-bm-surface text-bm-text-muted shadow-sm hover:bg-bm-surface-muted"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Conversation actions"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-3xl border border-bm-border bg-bm-surface shadow-2xl">
          {onDelete ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-bm-text hover:bg-bm-surface-muted"
            >
              <Trash2 className="h-4 w-4 text-bm-text-subtle" />
              Delete chat
            </button>
          ) : null}

          {onReport ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onReport();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-bm-text hover:bg-bm-surface-muted"
            >
              <Flag className="h-4 w-4 text-bm-text-subtle" />
              Report conversation
            </button>
          ) : null}

          {onSpam ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSpam();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-bm-text hover:bg-bm-surface-muted"
            >
              <OctagonAlert className="h-4 w-4 text-bm-text-subtle" />
              Mark as spam
            </button>
          ) : null}

          {blockedByYou ? (
            onUnblock ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onUnblock();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-bm-text hover:bg-bm-surface-muted"
              >
                <Ban className="h-4 w-4 text-bm-text-subtle" />
                Unblock user
              </button>
            ) : null
          ) : onBlock ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onBlock("messages");
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-bm-text hover:bg-bm-surface-muted"
            >
              <Ban className="h-4 w-4 text-bm-text-subtle" />
              Block user
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

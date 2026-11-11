import { FileText, Image as ImageIcon, Paperclip, Video, X } from "lucide-react";

export type MessageAttachmentCategory = "image" | "video" | "file";

type Props = {
  open: boolean;
  disabled?: boolean;
  onClose: () => void;
  onSelect: (category: MessageAttachmentCategory) => void;
};

const OPTIONS: Array<{
  category: MessageAttachmentCategory;
  label: string;
  description: string;
  icon: typeof ImageIcon;
}> = [
  {
    category: "image",
    label: "Images",
    description: "Photos and pictures",
    icon: ImageIcon,
  },
  {
    category: "video",
    label: "Videos",
    description: "Clips and recordings",
    icon: Video,
  },
  {
    category: "file",
    label: "Files",
    description: "PDF, Word, Excel and more",
    icon: FileText,
  },
];

export default function MessageAttachmentPicker({
  open,
  disabled = false,
  onClose,
  onSelect,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="message-attachment-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-bm-border-subtle dark:border-bm-border-subtle px-5 py-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-bm-text-subtle dark:text-bm-text-subtle">
              <Paperclip className="h-4 w-4" />
              Attachment
            </div>
            <h2 id="message-attachment-title" className="mt-1 text-lg font-black text-bm-text dark:text-bm-text">
              Add attachment
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text-subtle dark:text-bm-text-subtle hover:bg-bm-surface-raised disabled:opacity-40"
            aria-label="Close attachment picker"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3">
          {OPTIONS.map(({ category, label, description, icon: Icon }) => (
            <button
              key={category}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(category)}
              className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted disabled:opacity-50"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text-muted dark:text-bm-text-muted">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-bm-text dark:text-bm-text">{label}</span>
                <span className="mt-0.5 block text-xs font-semibold text-bm-text-subtle dark:text-bm-text-subtle">{description}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-bm-border-subtle dark:border-bm-border-subtle px-5 py-3 text-xs font-semibold text-bm-text-subtle dark:text-bm-text-subtle">
          Maximum attachment size: 10 MB
        </div>
      </div>
    </div>
  );
}

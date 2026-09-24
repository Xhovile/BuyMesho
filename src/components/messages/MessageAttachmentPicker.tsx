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
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
              <Paperclip className="h-4 w-4" />
              Attachment
            </div>
            <h2 id="message-attachment-title" className="mt-1 text-lg font-black text-zinc-900">
              Add attachment
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 disabled:opacity-40"
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
              className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-zinc-900">{label}</span>
                <span className="mt-0.5 block text-xs font-semibold text-zinc-500">{description}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-zinc-100 px-5 py-3 text-xs font-semibold text-zinc-400">
          Maximum attachment size: 10 MB
        </div>
      </div>
    </div>
  );
}

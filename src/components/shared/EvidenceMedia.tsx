import { ExternalLink } from "lucide-react";

type EvidenceMediaProps = {
  evidence?: string[] | null;
  title?: string;
};

function toHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function mediaKind(url: string): "image" | "video" | "link" {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    if (path.includes("/video/upload/") || /\.(mp4|mov|webm|m4v|avi|mkv)$/.test(path)) return "video";
    if (path.includes("/image/upload/") || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/.test(path)) return "image";
  } catch {
    return "link";
  }
  return "link";
}

export default function EvidenceMedia({ evidence, title = "Evidence" }: EvidenceMediaProps) {
  const items = Array.from(new Set((evidence ?? []).map(toHttpUrl).filter((value): value is string => Boolean(value)))).slice(0, 20);
  if (!items.length) return null;

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{title}</p>
        <span className="text-xs font-semibold text-zinc-400">{items.length} item{items.length === 1 ? "" : "s"}</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((url, index) => {
          const kind = mediaKind(url);
          return (
            <div key={url} className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
              {kind === "image" ? (
                <a href={url} target="_blank" rel="noreferrer" className="block">
                  <img src={url} alt={`Dispute evidence ${index + 1}`} className="h-44 w-full object-cover" loading="lazy" />
                </a>
              ) : kind === "video" ? (
                <video src={url} controls preload="metadata" className="h-44 w-full bg-black object-contain" />
              ) : null}
              <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-3 py-2">
                <span className="min-w-0 truncate text-xs font-semibold text-zinc-600">
                  {kind === "video" ? `Video ${index + 1}` : kind === "image" ? `Photo ${index + 1}` : `Evidence ${index + 1}`}
                </span>
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-zinc-800 hover:text-red-700">
                  Open
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

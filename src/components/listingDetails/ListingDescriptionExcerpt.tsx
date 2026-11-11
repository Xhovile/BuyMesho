import { useState } from "react";

type ListingDescriptionExcerptProps = {
  description: string | null | undefined;
  fallback?: string;
};

export default function ListingDescriptionExcerpt({
  description,
  fallback = "No listing description has been provided.",
}: ListingDescriptionExcerptProps) {
  const [expanded, setExpanded] = useState(false);
  const content = (description ?? "").trim();
  const shouldClamp = content.length > 240;

  if (!content) {
    return <p className="text-sm leading-7 text-bm-text-subtle">{fallback}</p>;
  }

  return (
    <div className="space-y-2">
      <p
        className={`whitespace-pre-wrap text-sm leading-7 text-bm-text-muted ${!expanded && shouldClamp ? "max-h-28 overflow-hidden" : ""}`}
      >
        {content}
      </p>
      {shouldClamp ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs font-bold uppercase tracking-[0.16em] text-bm-text-subtle transition hover:text-bm-text"
        >
          {expanded ? "Less" : "More..."}
        </button>
      ) : null}
    </div>
  );
}

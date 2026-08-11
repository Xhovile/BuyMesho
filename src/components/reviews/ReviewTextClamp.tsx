import { useState } from "react";

type ReviewTextClampProps = {
  text: string | null | undefined;
  fallback?: string;
};

export default function ReviewTextClamp({ text, fallback = "No written review provided." }: ReviewTextClampProps) {
  const [expanded, setExpanded] = useState(false);
  const content = (text ?? "").trim();
  const shouldClamp = content.length > 180;

  if (!content) {
    return <p className="text-sm leading-6 text-zinc-500">{fallback}</p>;
  }

  return (
    <div className="space-y-2">
      <p
        className={`whitespace-pre-wrap text-sm leading-7 text-zinc-700 ${!expanded && shouldClamp ? "max-h-28 overflow-hidden" : ""}`}
      >
        {content}
      </p>
      {shouldClamp ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 transition hover:text-zinc-900"
        >
          {expanded ? "Less" : "More..."}
        </button>
      ) : null}
    </div>
  );
}

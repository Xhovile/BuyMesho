import type { ComponentProps } from "react";
import PayoutDetailDrawer from "./PayoutDetailDrawer";

type Props = ComponentProps<typeof PayoutDetailDrawer>;

const reasonSources = [
  ["manualReviewReason", "manual review"],
  ["latestAttemptFailureReason", "latest attempt"],
  ["lastError", "last error"],
  ["destinationLastError", "destination error"],
  ["holdReason", "hold reason"],
  ["retryBlockedReason", "retry blocked"],
  ["failureReason", "failure reason"],
] as const;

export default function AdminPayoutDetailDrawer(props: Props) {
  const { selected } = props;

  const exactReasonEntry = reasonSources.find(([key]) => {
    const value = selected[key as keyof typeof selected];
    return typeof value === "string" && value.trim().length > 0;
  });

  const exactReasonKey = exactReasonEntry?.[0] ?? null;
  const exactReasonLabel = exactReasonEntry?.[1] ?? null;
  const exactReason =
    exactReasonKey ? String(selected[exactReasonKey as keyof typeof selected] ?? "") : null;

  return (
    <>
      {exactReason ? (
        <div className="fixed right-4 top-4 z-[95] w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            Primary payout blocker{exactReasonLabel ? ` · ${exactReasonLabel}` : ""}
          </p>
          <p className="mt-1 break-words font-semibold leading-relaxed">{exactReason}</p>
        </div>
      ) : null}
      <PayoutDetailDrawer {...props} />
    </>
  );
}

import type { ComponentProps } from "react";
import PayoutDetailDrawer from "./PayoutDetailDrawer";

type Props = ComponentProps<typeof PayoutDetailDrawer>;

export default function AdminPayoutDetailDrawer(props: Props) {
  const { selected } = props;
const exactReason =
  selected.manualReviewReason ??
  selected.latestAttemptFailureReason ??
  selected.lastError ??
  selected.destinationLastError ??
  selected.holdReason ??
  selected.retryBlockedReason ??
  selected.failureReason ??
  null;

  return (
    <>
      {exactReason ? (
        <div className="fixed right-4 top-4 z-[95] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 shadow-2xl">
          Exact payout reason: {exactReason}
        </div>
      ) : null}
      <PayoutDetailDrawer {...props} />
    </>
  );
}

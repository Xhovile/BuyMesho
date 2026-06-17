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

  return <PayoutDetailDrawer {...props} />;
}

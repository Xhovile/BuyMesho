import type { ComponentProps } from "react";
import PayoutDetailDrawer from "./PayoutDetailDrawer";

type Props = ComponentProps<typeof PayoutDetailDrawer>;

const reasonSources = [
  ["manualReviewReason", "manual review"],
  ["latestAttemptFailureReason", "latest attempt"],
  ["lastError", "last error"],
  ["destinationLastError", "destination error"],
  ["destinationStatus", "destination status"],
  ["destinationVerificationStatus", "destination verification"],
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

  const destinationActive = selected.destinationActive !== false;
  const destinationVerified =
    String(selected.destinationVerificationStatus ?? selected.destinationStatus ?? "").toLowerCase() ===
      "verified" && destinationActive;
  const destinationBannerReason = !destinationVerified
    ? !destinationActive
      ? "Destination is inactive"
      : selected.destinationVerificationStatus || selected.destinationStatus
        ? String(selected.destinationVerificationStatus ?? selected.destinationStatus ?? "Destination needs verification")
        : null
    : null;
  const bannerReason = exactReason ?? destinationBannerReason;
  const bannerLabel = exactReasonLabel ?? (!destinationVerified ? "destination verification" : null);

  return (
    <>
      {bannerReason ? (
        <div className="fixed right-4 top-4 z-[95] w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            Primary payout blocker{bannerLabel ? ` · ${bannerLabel}` : ""}
          </p>
          <p className="mt-1 break-words font-semibold leading-relaxed">{bannerReason}</p>
        </div>
      ) : null}
      <PayoutDetailDrawer {...props} />
    </>
  );
}
